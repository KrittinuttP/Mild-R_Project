/**
 * One-shot: Pixela ↔ Mild-R collab lives → project=Pixela
 *
 * Modes:
 *   (default) Scan each pixela-master channel uploads playlist;
 *             keep lives whose title mentions Mild-R.
 *   --from-mild  Scan Mild-R uploads playlist; keep lives whose title
 *                mentions a pixela-master talent name/handle.
 *
 * Discovery uses uploads playlist (not search.list).
 *
 *   npm run backfill:pixela
 *   npx tsx --env-file=.env.local scripts/backfill-pixela-mild-r.ts --from-mild
 *   npx tsx --env-file=.env.local scripts/backfill-pixela-mild-r.ts --only=Debirun
 *   npx tsx --env-file=.env.local scripts/backfill-pixela-mild-r.ts --dry-run
 */
import { createClient } from "@supabase/supabase-js";

import {
  PIXELA_TALENTS,
  type PixelaTalent,
} from "../src/data/pixela-master";
import {
  classifyLiveOwnership,
  MILD_R_CHANNEL_ID,
} from "../src/lib/live-stream-classify";
import { snapScheduledToHalfHour } from "../src/lib/snap-scheduled";
import { removeMatchingPreviewsForReals } from "./lib/remove-matching-previews";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DRY_RUN = process.argv.includes("--dry-run");
const FROM_MILD = process.argv.includes("--from-mild");

/** Title-only match for Mild-R mentions (guest hosted on Pixela channel) */
const MILD_R_TITLE_RE = /mild[\s\-_.]*r|@mildr|mildrworldend/i;

const NEEDLE_STOP = new Set([
  "world",
  "end",
  "pixela",
  "ch",
  "the",
  "von",
  "de",
  "superpretty",
  "princess",
]);

function normalizeNeedle(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "");
}

function titleMentionsMildR(title: string) {
  return MILD_R_TITLE_RE.test(title);
}

/** Build match needles for a Pixela talent (longest-first matching). */
function needlesForTalent(talent: PixelaTalent): string[] {
  const out = new Set<string>();
  const add = (raw: string | null | undefined, minLen = 4) => {
    if (!raw?.trim()) return;
    const full = normalizeNeedle(raw);
    if (full.length >= minLen && !NEEDLE_STOP.has(full)) out.add(full);

    const stripped = normalizeNeedle(
      raw.replace(/(world\s*end|pixela|ch\.?)$/i, "")
    );
    if (stripped.length >= minLen && !NEEDLE_STOP.has(stripped)) {
      out.add(stripped);
    }

    for (const part of raw.split(/[\s@._\-]+/)) {
      const p = normalizeNeedle(part);
      if (p.length >= 5 && !NEEDLE_STOP.has(p)) out.add(p);
    }
  };

  add(talent.handle);
  add(talent.title);
  add(talent.name);

  // Helpful aliases
  if (/melony/i.test(talent.name) || /melony/i.test(talent.title)) {
    out.add("melony");
    out.add("mycara");
  }
  if (/takopero/i.test(talent.name) || /takopero/i.test(talent.title)) {
    out.add("takopero");
  }

  return [...out].sort((a, b) => b.length - a.length);
}

type TalentNeedle = { talent: PixelaTalent; needle: string };

function buildTalentNeedles(talents: PixelaTalent[]): TalentNeedle[] {
  const list: TalentNeedle[] = [];
  for (const talent of talents) {
    for (const needle of needlesForTalent(talent)) {
      list.push({ talent, needle });
    }
  }
  list.sort((a, b) => b.needle.length - a.needle.length);
  return list;
}

function matchPixelaTalentInTitle(
  title: string,
  needles: TalentNeedle[]
): PixelaTalent | null {
  const hay = normalizeNeedle(title);
  if (!hay) return null;
  for (const { talent, needle } of needles) {
    if (hay.includes(needle)) return talent;
  }
  return null;
}

if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type StreamRow = {
  video_id: string;
  channel_id: string;
  channel_name: string;
  source_title: string | null;
  title: string;
  url: string;
  scheduled_start: string | null;
  scheduled_start_first: string | null;
  actual_start: string | null;
  actual_end: string | null;
  thumbnail_url: string | null;
  views_on_end: number | null;
  latest_views: number;
  is_own_channel: boolean;
  is_collab: boolean;
  project: "Pixela";
  metadata: Record<string, unknown>;
};

async function resolveChannelId(
  talent: PixelaTalent
): Promise<string | null> {
  if (talent.channelId) return talent.channelId;

  const handle = talent.handle?.replace(/^@/, "").trim();
  if (!handle) {
    console.warn(`  ⚠ ${talent.title}: no channelId / handle`);
    return null;
  }

  const url =
    `https://www.googleapis.com/youtube/v3/channels` +
    `?part=id&forHandle=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    error?: { message?: string };
    items?: Array<{ id: string }>;
  };
  if (data.error) {
    console.warn(`  ⚠ ${talent.title} forHandle: ${data.error.message}`);
    return null;
  }
  const id = data.items?.[0]?.id ?? null;
  if (!id) {
    console.warn(`  ⚠ ${talent.title}: handle @${handle} not found`);
  }
  return id;
}

async function listMildRTitleVideoIds(channelId: string): Promise<string[]> {
  /** Walk uploads playlist; filter Mild-R in title only (cheap + complete). */
  const playlistId = channelId.replace(/^UC/, "UU");
  const ids: string[] = [];
  let pageToken = "";
  let pages = 0;
  const maxPages = 100; // up to ~5000 uploads per channel

  while (pages < maxPages) {
    const playlistUrl =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet&playlistId=${playlistId}&maxResults=50` +
      `&pageToken=${pageToken}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(playlistUrl);
    const data = (await res.json()) as {
      error?: { message?: string };
      items?: Array<{
        snippet?: {
          title?: string;
          resourceId?: { videoId?: string };
        };
      }>;
      nextPageToken?: string;
    };
    if (data.error) {
      throw new Error(
        `playlistItems ${playlistId}: ${data.error.message || "failed"}`
      );
    }
    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title ?? "";
      if (videoId && titleMentionsMildR(title)) {
        ids.push(videoId);
      }
    }
    pages += 1;
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return [...new Set(ids)];
}

async function fetchVideoDetails(ids: string[]) {
  const out: Array<{
    id: string;
    snippet: {
      channelId: string;
      channelTitle: string;
      title: string;
      description: string;
      tags?: string[];
      thumbnails?: Record<string, { url?: string } | undefined>;
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
    };
    statistics?: { viewCount?: string; likeCount?: string };
    status?: { privacyStatus?: string };
  }> = [];

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,liveStreamingDetails,statistics,status` +
      `&id=${chunk.join(",")}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      error?: { message?: string };
      items?: typeof out;
    };
    if (data.error) {
      throw new Error(data.error.message || "videos.list failed");
    }
    out.push(...(data.items ?? []));
  }
  return out;
}

function buildRow(
  item: Awaited<ReturnType<typeof fetchVideoDetails>>[number],
  talent: PixelaTalent,
  opts?: { requireMildRInTitle?: boolean; hostedOnMildR?: boolean }
): StreamRow | null {
  if (!item.liveStreamingDetails) return null;
  const requireMildR = opts?.requireMildRInTitle !== false;
  if (requireMildR && !titleMentionsMildR(item.snippet.title)) return null;

  const viewCount = item.statistics?.viewCount
    ? parseInt(item.statistics.viewCount, 10)
    : 0;
  const channelId = item.snippet.channelId;
  const { is_own_channel, is_collab } = classifyLiveOwnership(
    channelId,
    item.snippet.title
  );
  const scheduledRaw =
    item.liveStreamingDetails.scheduledStartTime ||
    item.liveStreamingDetails.actualStartTime ||
    null;
  const scheduled = snapScheduledToHalfHour(scheduledRaw) ?? scheduledRaw;
  const scheduledFirst =
    snapScheduledToHalfHour(
      item.liveStreamingDetails.scheduledStartTime ||
        item.liveStreamingDetails.actualStartTime
    ) ?? scheduled;
  const thumbs = item.snippet.thumbnails ?? {};
  const thumbnail =
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    null;

  const hostedOnMildR = Boolean(opts?.hostedOnMildR) || is_own_channel;

  return {
    video_id: item.id,
    channel_id: channelId,
    channel_name: item.snippet.channelTitle,
    source_title: hostedOnMildR ? "Mild-R" : talent.title,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    scheduled_start: scheduled,
    scheduled_start_first: scheduledFirst,
    actual_start: item.liveStreamingDetails.actualStartTime || null,
    actual_end: item.liveStreamingDetails.actualEndTime || null,
    thumbnail_url: thumbnail,
    views_on_end: item.liveStreamingDetails.actualEndTime ? viewCount : null,
    latest_views: viewCount,
    is_own_channel,
    is_collab: hostedOnMildR ? true : is_collab,
    project: "Pixela",
    metadata: {
      source: hostedOnMildR
        ? "manual_oneshot_pixela_from_mild"
        : "manual_oneshot_pixela",
      preview: false,
      member: false,
      pixela: true,
      pixela_talent: talent.title,
      pixela_unit: talent.unit,
      pixela_source_label: talent.sourceLabel,
      pixela_hosted_on_mild: hostedOnMildR,
      description: item.snippet.description,
      tags: item.snippet.tags || [],
      likes: item.statistics?.likeCount || null,
      privacy_status: item.status?.privacyStatus || null,
      scheduled_raw: item.liveStreamingDetails.scheduledStartTime || null,
      scheduled_snapped:
        Boolean(item.liveStreamingDetails.scheduledStartTime) &&
        snapScheduledToHalfHour(
          item.liveStreamingDetails.scheduledStartTime
        ) !== item.liveStreamingDetails.scheduledStartTime,
    },
  };
}

async function upsertRows(rows: StreamRow[]) {
  if (rows.length === 0) return 0;

  const ids = rows.map((r) => r.video_id);
  const { data: existingRows } = await supabase
    .from("mild_r_live_streams")
    .select(
      "video_id, views_on_end, scheduled_start, scheduled_start_first, actual_start, metadata"
    )
    .in("video_id", ids);

  const existingById = new Map<
    string,
    {
      views_on_end: number | null;
      scheduled_start: string | null;
      scheduled_start_first: string | null;
      actual_start: string | null;
      metadata: Record<string, unknown> | null;
    }
  >();
  for (const row of existingRows || []) {
    existingById.set(row.video_id as string, {
      views_on_end: (row.views_on_end as number | null) ?? null,
      scheduled_start: (row.scheduled_start as string | null) ?? null,
      scheduled_start_first:
        (row.scheduled_start_first as string | null) ?? null,
      actual_start: (row.actual_start as string | null) ?? null,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
    });
  }

  const merged = rows.map((row) => {
    const existing = existingById.get(row.video_id);
    const started =
      existing?.actual_start != null || row.actual_start != null;
    return {
      ...row,
      views_on_end: existing?.views_on_end ?? row.views_on_end,
      scheduled_start_first:
        existing?.scheduled_start_first ??
        row.scheduled_start ??
        row.scheduled_start_first,
      scheduled_start: started
        ? (existing?.scheduled_start ?? row.scheduled_start)
        : row.scheduled_start,
      metadata: {
        ...(existing?.metadata ?? {}),
        ...row.metadata,
        pixela: true,
      },
      project: "Pixela" as const,
    };
  });

  if (DRY_RUN) {
    console.log(`  [dry-run] would upsert ${merged.length}`);
    for (const r of merged) {
      console.log(`    · ${r.video_id} | ${r.title}`);
    }
    return merged.length;
  }

  const { error } = await supabase
    .from("mild_r_live_streams")
    .upsert(merged, { onConflict: "video_id" });

  if (error) {
    throw new Error(error.message);
  }
  await removeMatchingPreviewsForReals(supabase, merged);
  return merged.length;
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlyTitle = onlyArg?.slice("--only=".length).trim().toLowerCase();
  const talents = onlyTitle
    ? PIXELA_TALENTS.filter(
        (t) =>
          t.title.toLowerCase() === onlyTitle ||
          t.title.toLowerCase().includes(onlyTitle)
      )
    : PIXELA_TALENTS;

  if (onlyTitle && talents.length === 0) {
    console.error(`No talent matching --only=${onlyTitle}`);
    process.exit(1);
  }

  if (FROM_MILD) {
    await runFromMildChannel(talents);
    return;
  }

  console.log(
    `🌟 Pixela channels → Mild-R in title (${talents.length} talents)${DRY_RUN ? " [DRY RUN]" : ""}`
  );

  let totalSaved = 0;
  let totalFound = 0;
  const perTalent: Record<string, number> = {};

  for (const talent of talents) {
    console.log(`\n▶ ${talent.title} (${talent.unit})`);
    const channelId = await resolveChannelId(talent);
    if (!channelId) {
      perTalent[talent.title] = 0;
      continue;
    }
    console.log(`  channelId=${channelId}`);

    let liveIds: string[];
    try {
      liveIds = await listMildRTitleVideoIds(channelId);
    } catch (err) {
      console.error(
        `  ✗ playlist:`,
        err instanceof Error ? err.message : err
      );
      perTalent[talent.title] = 0;
      continue;
    }

    console.log(`  title-match Mild-R: ${liveIds.length}`);
    if (liveIds.length === 0) {
      perTalent[talent.title] = 0;
      continue;
    }

    const details = await fetchVideoDetails(liveIds);
    const rows = details
      .map((item) => buildRow(item, talent))
      .filter((r): r is StreamRow => r != null);

    totalFound += rows.length;
    const saved = await upsertRows(rows);
    totalSaved += saved;
    perTalent[talent.title] = saved;
    console.log(`  💾 saved ${saved}`);
  }

  if (!DRY_RUN) {
    await supabase.from("mild_r_sync_logs").insert({
      source: "backfill-pixela",
      status: "success",
      message: `Pixela channel Mild-R title backfill · found ${totalFound} · saved ${totalSaved}`,
      saved_count: totalSaved,
      meta: { perTalent, totalFound, onlyTitle: onlyTitle || null },
    });
  }

  console.log("\n✅ Done", { totalFound, totalSaved, perTalent });
}

async function runFromMildChannel(talents: PixelaTalent[]) {
  console.log(
    `🌟 Mild-R channel → Pixela talent in title (${talents.length} talents)${DRY_RUN ? " [DRY RUN]" : ""}`
  );

  const needles = buildTalentNeedles(talents);
  console.log(`  match needles: ${needles.length}`);

  const matched: Array<{ videoId: string; title: string; talent: PixelaTalent }> =
    [];
  const playlistId = MILD_R_CHANNEL_ID.replace(/^UC/, "UU");
  let pageToken = "";
  let pages = 0;
  const maxPages = 100;

  while (pages < maxPages) {
    const playlistUrl =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet&playlistId=${playlistId}&maxResults=50` +
      `&pageToken=${pageToken}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(playlistUrl);
    const data = (await res.json()) as {
      error?: { message?: string };
      items?: Array<{
        snippet?: {
          title?: string;
          resourceId?: { videoId?: string };
        };
      }>;
      nextPageToken?: string;
    };
    if (data.error) {
      throw new Error(data.error.message || "Mild-R playlistItems failed");
    }
    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title ?? "";
      if (!videoId || !title) continue;
      const talent = matchPixelaTalentInTitle(title, needles);
      if (talent) matched.push({ videoId, title, talent });
    }
    pages += 1;
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  const uniqueIds = [...new Set(matched.map((m) => m.videoId))];
  console.log(
    `  playlist pages=${pages} · title-match talents=${matched.length} · unique=${uniqueIds.length}`
  );

  const byId = new Map(matched.map((m) => [m.videoId, m.talent]));
  const details = await fetchVideoDetails(uniqueIds);
  const rows = details
    .map((item) => {
      const talent = byId.get(item.id);
      if (!talent) return null;
      return buildRow(item, talent, {
        requireMildRInTitle: false,
        hostedOnMildR: true,
      });
    })
    .filter((r): r is StreamRow => r != null);

  const perTalent: Record<string, number> = {};
  for (const r of rows) {
    const t = String(r.metadata.pixela_talent ?? "?");
    perTalent[t] = (perTalent[t] ?? 0) + 1;
  }

  const saved = await upsertRows(rows);

  if (!DRY_RUN) {
    await supabase.from("mild_r_sync_logs").insert({
      source: "backfill-pixela-from-mild",
      status: "success",
      message: `Mild-R hosted Pixela-collab · found ${rows.length} · saved ${saved}`,
      saved_count: saved,
      meta: { perTalent, matchedTitles: matched.length },
    });
  }

  console.log("\n✅ Done Mild-R host scan", {
    totalFound: rows.length,
    totalSaved: saved,
    perTalent,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
