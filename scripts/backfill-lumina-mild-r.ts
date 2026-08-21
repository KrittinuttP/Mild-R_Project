/**
 * One-shot: scan LUMINA_CHANNELS (except Mild-R main) uploads playlists
 * for lives that mention Mild-R in title, description, or tags → project=Lumina.
 *
 * Skips Debirun (covered by pixela-master backfill → project=Pixela).
 * Does not use search.list (incomplete).
 * Keeps only videos with liveStreamingDetails (live / live archive).
 *
 *   npm run backfill:lumina
 *   npx tsx --env-file=.env.local scripts/backfill-lumina-mild-r.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-lumina-mild-r.ts --only=AMI
 */
import { createClient } from "@supabase/supabase-js";

import {
  LUMINA_CHANNELS,
  type LuminaChannel,
} from "../src/data/lumina-channels";
import { classifyLiveOwnership } from "../src/lib/live-stream-classify";
import { snapScheduledToHalfHour } from "../src/lib/snap-scheduled";
import { videoMentionsMildR } from "./lib/mild-r-mention";
import { removeMatchingPreviewsForReals } from "./lib/remove-matching-previews";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DRY_RUN = process.argv.includes("--dry-run");

/** Pixela-roster channel already backfilled separately */
const SKIP_TITLES = new Set(["debirun", "mild-r", "mildr"]);

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
  project: "Lumina";
  metadata: Record<string, unknown>;
};

/** Uploads playlist video IDs (all titles — Mild-R filter happens after videos.list). */
async function listUploadVideoIds(channelId: string): Promise<string[]> {
  const playlistId = channelId.replace(/^UC/, "UU");
  const ids: string[] = [];
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
      throw new Error(
        `playlistItems ${playlistId}: ${data.error.message || "failed"}`
      );
    }
    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (videoId) ids.push(videoId);
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
  channel: LuminaChannel
): StreamRow | null {
  // Live / live archive only — skip regular VODs & clips
  if (!item.liveStreamingDetails) return null;

  const mention = videoMentionsMildR(item.snippet);
  if (!mention) return null;

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

  return {
    video_id: item.id,
    channel_id: channelId,
    channel_name: item.snippet.channelTitle,
    source_title: channel.title,
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
    is_collab,
    project: "Lumina",
    metadata: {
      source: "manual_oneshot_lumina",
      preview: false,
      member: false,
      pixela: false,
      lumina: true,
      lumina_talent: channel.title,
      lumina_unit: channel.unit,
      mild_r_mention: mention,
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
      "video_id, views_on_end, scheduled_start, scheduled_start_first, actual_start, metadata, project"
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
      project: string | null;
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
      project: (row.project as string | null) ?? null,
    });
  }

  const merged = rows.map((row) => {
    const existing = existingById.get(row.video_id);
    const started =
      existing?.actual_start != null || row.actual_start != null;
    // Never downgrade Pixela → Lumina
    const project =
      existing?.project === "Pixela" ? ("Pixela" as const) : row.project;
    return {
      ...row,
      project,
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
        lumina: true,
      },
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

  if (error) throw new Error(error.message);
  await removeMatchingPreviewsForReals(supabase, merged);
  return merged.length;
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlyTitle = onlyArg?.slice("--only=".length).trim().toLowerCase();

  let channels = LUMINA_CHANNELS.filter(
    (c) =>
      !c.isMain &&
      Boolean(c.channelId) &&
      !SKIP_TITLES.has(c.title.toLowerCase())
  );

  if (onlyTitle) {
    channels = channels.filter(
      (c) =>
        c.title.toLowerCase() === onlyTitle ||
        c.title.toLowerCase().includes(onlyTitle) ||
        c.name.toLowerCase().includes(onlyTitle)
    );
    if (channels.length === 0) {
      console.error(`No Lumina channel matching --only=${onlyTitle}`);
      process.exit(1);
    }
  }

  console.log(
    `🌟 Lumina→Mild-R mention backfill (${channels.length} channels)${DRY_RUN ? " [DRY RUN]" : ""}`
  );

  let totalSaved = 0;
  let totalFound = 0;
  const perChannel: Record<string, number> = {};

  for (const channel of channels) {
    console.log(`\n▶ ${channel.title} (${channel.unit})`);
    const channelId = channel.channelId!;
    console.log(`  channelId=${channelId}`);

    let uploadIds: string[];
    try {
      uploadIds = await listUploadVideoIds(channelId);
    } catch (err) {
      console.error(
        `  ✗ playlist:`,
        err instanceof Error ? err.message : err
      );
      perChannel[channel.title] = 0;
      continue;
    }

    console.log(`  uploads scanned: ${uploadIds.length}`);
    if (uploadIds.length === 0) {
      perChannel[channel.title] = 0;
      continue;
    }

    const details = await fetchVideoDetails(uploadIds);
    const rows = details
      .map((item) => buildRow(item, channel))
      .filter((r): r is StreamRow => r != null);

    const byMention = rows.reduce(
      (acc, row) => {
        const key = String(row.metadata.mild_r_mention ?? "unknown");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log(
      `  live + Mild-R mention: ${rows.length}`,
      Object.keys(byMention).length ? byMention : ""
    );

    totalFound += rows.length;
    const saved = await upsertRows(rows);
    totalSaved += saved;
    perChannel[channel.title] = saved;
    console.log(`  💾 saved ${saved}`);
  }

  if (!DRY_RUN) {
    await supabase.from("mild_r_sync_logs").insert({
      source: "backfill-lumina",
      status: "success",
      message: `Lumina Mild-R mention backfill · found ${totalFound} · saved ${totalSaved}`,
      saved_count: totalSaved,
      meta: { perChannel, totalFound, onlyTitle: onlyTitle || null },
    });
  }

  console.log("\n✅ Done", { totalFound, totalSaved, perChannel });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
