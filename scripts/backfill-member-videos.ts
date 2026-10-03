/**
 * One-shot: Mild-R members-only uploads (UUMO playlist) → mild_r_videos with
 * metadata.members_only = true. Members-only lives in the same playlist are skipped.
 * youtube-tracker keeps new ones coming in afterwards (Step 1).
 *
 *   npm run backfill:member-videos
 *   npx tsx --env-file=.env.local scripts/backfill-member-videos.ts --dry-run
 */
import { createClient } from "@supabase/supabase-js";

import {
  getLuminaSourceTitle,
  MAIN_CHANNEL_ID,
} from "../supabase/functions/youtube-tracker/lumina-master.ts";
import {
  isRealLive,
  membersPlaylistId,
  saveVideoItems,
  VIDEO_PARTS,
  type YoutubeVideoItem,
} from "../supabase/functions/youtube-tracker/video-classify.ts";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DRY_RUN = process.argv.includes("--dry-run");

if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listPlaylistVideoIds(playlistId: string): Promise<string[]> {
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
    if (data.error) throw new Error(`playlistItems ${playlistId}: ${data.error.message || "failed"}`);
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

async function main() {
  console.log(`🔒 Backfill member videos → mild_r_videos${DRY_RUN ? " [DRY RUN]" : ""}`);

  const ids = await listPlaylistVideoIds(membersPlaylistId(MAIN_CHANNEL_ID));
  const items = await fetchVideoItems(ids);
  const uploads = items.filter((item) => !isRealLive(item));
  const rows = await saveVideoItems(supabase, uploads, getLuminaSourceTitle, {
    dryRun: DRY_RUN,
    membersOnly: true,
  });

  for (const row of rows) {
    console.log(`  · ${row.kind.padEnd(8)} ${row.video_id} | ${row.title}`);
  }

  if (!DRY_RUN) {
    await supabase.from("mild_r_sync_logs").insert({
      source: "backfill-member-videos",
      status: "success",
      message: `Member videos backfill · saved ${rows.length} (skipped ${items.length - uploads.length} lives)`,
      saved_count: rows.length,
      meta: { scanned: ids.length, lives: items.length - uploads.length },
    });
  }

  console.log("\n✅ Done", { scanned: ids.length, lives: items.length - uploads.length, saved: rows.length });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
