/**
 * One-shot: non-live uploads (videos / Shorts / Premieres) → mild_r_videos
 *
 *   Mild-R channel: every upload.
 *   Pixela Official + Lumina master + guest hosts seen in mild_r_live_streams:
 *     only uploads that mention Mild-R in title or description.
 *
 *   npm run backfill:videos
 *   npx tsx --env-file=.env.local scripts/backfill-videos.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-videos.ts --own-only
 */
import { createClient } from "@supabase/supabase-js";

import {
  getLuminaSourceTitle,
  LUMINA_RELATED_CHANNEL_IDS,
  MAIN_CHANNEL_ID,
} from "../supabase/functions/youtube-tracker/lumina-master.ts";
import {
  isRealLive,
  mentionsMildRVideo,
  PIXELA_OFFICIAL_CHANNEL_ID,
  saveVideoItems,
  VIDEO_PARTS,
  type VideoRow,
  type YoutubeVideoItem,
} from "../supabase/functions/youtube-tracker/video-classify.ts";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DRY_RUN = process.argv.includes("--dry-run");
const OWN_ONLY = process.argv.includes("--own-only");

if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listUploadVideoIds(channelId: string): Promise<string[]> {
  const playlistId = channelId.replace(/^UC/, "UU");
  const ids: string[] = [];
  let pageToken = "";

  for (let page = 0; page < 100; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet&playlistId=${playlistId}&maxResults=50` +
      `&pageToken=${pageToken}&key=${YOUTUBE_API_KEY}`;
    const data = (await (await fetch(url)).json()) as {
      error?: { message?: string };
      items?: Array<{ snippet?: { resourceId?: { videoId?: string } } }>;
      nextPageToken?: string;
    };
    if (data.error) {
      throw new Error(`playlistItems ${playlistId}: ${data.error.message || "failed"}`);
    }
    for (const item of data.items ?? []) {
      const id = item.snippet?.resourceId?.videoId;
      if (id) ids.push(id);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return [...new Set(ids)];
}

async function fetchVideoItems(ids: string[]): Promise<YoutubeVideoItem[]> {
  const out: YoutubeVideoItem[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=${VIDEO_PARTS}` +
      `&id=${ids.slice(i, i + 50).join(",")}&key=${YOUTUBE_API_KEY}`;
    const data = (await (await fetch(url)).json()) as {
      error?: { message?: string };
      items?: YoutubeVideoItem[];
    };
    if (data.error) throw new Error(data.error.message || "videos.list failed");
    out.push(...(data.items ?? []));
  }
  return out;
}

async function loadGuestChannelIds(): Promise<string[]> {
  const ids = new Set<string>([
    ...LUMINA_RELATED_CHANNEL_IDS,
    PIXELA_OFFICIAL_CHANNEL_ID,
  ]);
  const { data, error } = await supabase
    .from("mild_r_live_streams")
    .select("channel_id")
    .eq("is_own_channel", false)
    .not("channel_id", "is", null)
    .limit(1000);
  if (error) console.error("guest channel lookup:", error.message);
  for (const row of data ?? []) {
    if (row.channel_id) ids.add(row.channel_id as string);
  }
  ids.delete(MAIN_CHANNEL_ID);
  return [...ids];
}

function countKinds(rows: VideoRow[]) {
  const counts = { video: 0, short: 0, premiere: 0 };
  for (const row of rows) counts[row.kind] += 1;
  return counts;
}

async function scanChannel(channelId: string, requireMention: boolean) {
  const ids = await listUploadVideoIds(channelId);
  const items = await fetchVideoItems(ids);
  const uploads = items.filter(
    (item) => !isRealLive(item) && (!requireMention || mentionsMildRVideo(item))
  );
  const rows = await saveVideoItems(supabase, uploads, getLuminaSourceTitle, {
    dryRun: DRY_RUN,
  });
  return { scanned: ids.length, rows };
}

async function main() {
  console.log(`🎬 Backfill videos → mild_r_videos${DRY_RUN ? " [DRY RUN]" : ""}`);

  const all: VideoRow[] = [];

  console.log("\n▶ Mild-R (all uploads)");
  const own = await scanChannel(MAIN_CHANNEL_ID, false);
  all.push(...own.rows);
  console.log(`  scanned ${own.scanned} · saved ${own.rows.length}`, countKinds(own.rows));

  if (!OWN_ONLY) {
    const guests = await loadGuestChannelIds();
    console.log(`\n▶ Other channels mentioning Mild-R (${guests.length} channels)`);
    for (const channelId of guests) {
      try {
        const res = await scanChannel(channelId, true);
        all.push(...res.rows);
        if (res.rows.length > 0) {
          const name = res.rows[0]?.channel_name ?? channelId;
          console.log(`  ${name}: scanned ${res.scanned} · saved ${res.rows.length}`, countKinds(res.rows));
        }
      } catch (err) {
        console.error(`  ✗ ${channelId}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  const totals = countKinds(all);
  if (DRY_RUN) {
    for (const row of all.slice(0, 40)) {
      console.log(`  · ${row.kind.padEnd(8)} ${row.video_id} | ${row.title}`);
    }
  } else {
    await supabase.from("mild_r_sync_logs").insert({
      source: "backfill-videos",
      status: "success",
      message: `Videos backfill · saved ${all.length} (video ${totals.video} · short ${totals.short} · premiere ${totals.premiere})`,
      saved_count: all.length,
      meta: { ...totals, ownOnly: OWN_ONLY },
    });
  }

  console.log("\n✅ Done", { total: all.length, ...totals });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
