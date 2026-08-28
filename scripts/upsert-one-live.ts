/**
 * One-shot: upsert a single YouTube live by video id → mild_r_live_streams
 *
 *   npx tsx --env-file=.env.local scripts/upsert-one-live.ts Ue2pzJIGeHM
 */
import { createClient } from "@supabase/supabase-js";

import { getLuminaSourceTitle } from "../src/data/lumina-channels";
import { classifyLiveOwnership } from "../src/lib/live-stream-classify";
import { snapScheduledToHalfHour } from "../src/lib/snap-scheduled";
import { removeMatchingPreviewsForReals } from "./lib/remove-matching-previews";

const VIDEO_ID = (process.argv[2] || "").trim();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!VIDEO_ID) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/upsert-one-live.ts <videoId>");
  process.exit(1);
}
if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const api =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,liveStreamingDetails,statistics,status` +
    `&id=${VIDEO_ID}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(api);
  const data = (await res.json()) as {
    error?: { message?: string };
    items?: Array<{
      id: string;
      snippet: {
        channelId: string;
        channelTitle: string;
        title: string;
        description: string;
        tags?: string[];
        liveBroadcastContent?: string;
        thumbnails?: Record<string, { url?: string } | undefined>;
      };
      liveStreamingDetails?: {
        scheduledStartTime?: string;
        actualStartTime?: string;
        actualEndTime?: string;
      };
      statistics?: { viewCount?: string; likeCount?: string };
      status?: { privacyStatus?: string };
    }>;
  };

  if (data.error) {
    console.error("YouTube API:", data.error.message);
    process.exit(1);
  }

  const item = data.items?.[0];
  if (!item) {
    console.error("Video not found:", VIDEO_ID);
    process.exit(1);
  }
  if (!item.liveStreamingDetails) {
    console.error("Not a live stream (no liveStreamingDetails):", VIDEO_ID);
    process.exit(1);
  }

  const viewCount = item.statistics?.viewCount
    ? parseInt(item.statistics.viewCount, 10)
    : 0;
  const channelId = item.snippet.channelId;
  const { is_own_channel, is_collab } = classifyLiveOwnership(
    channelId,
    item.snippet.title
  );
  const thumbs = item.snippet.thumbnails ?? {};
  const thumbnail =
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    null;

  const scheduledRaw =
    item.liveStreamingDetails.scheduledStartTime ||
    item.liveStreamingDetails.actualStartTime ||
    null;
  const scheduled =
    snapScheduledToHalfHour(scheduledRaw) ?? scheduledRaw;
  const scheduledFirst =
    snapScheduledToHalfHour(
      item.liveStreamingDetails.scheduledStartTime ||
        item.liveStreamingDetails.actualStartTime
    ) ?? scheduled;

  const row = {
    video_id: item.id,
    channel_id: channelId,
    channel_name: item.snippet.channelTitle,
    source_title: is_own_channel
      ? "Mild-R"
      : getLuminaSourceTitle(channelId),
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
    project: "Lumina" as const,
    metadata: {
      source: "manual_oneshot_youtube",
      preview: false,
      member: false,
      description: item.snippet.description,
      tags: item.snippet.tags || [],
      likes: item.statistics?.likeCount || null,
      privacy_status: item.status?.privacyStatus || null,
      live_broadcast_content: item.snippet.liveBroadcastContent || null,
      scheduled_raw: item.liveStreamingDetails.scheduledStartTime || null,
      scheduled_snapped:
        Boolean(item.liveStreamingDetails.scheduledStartTime) &&
        snapScheduledToHalfHour(
          item.liveStreamingDetails.scheduledStartTime
        ) !== item.liveStreamingDetails.scheduledStartTime,
    },
  };

  console.log(
    JSON.stringify(
      {
        video_id: row.video_id,
        title: row.title,
        channel_id: row.channel_id,
        scheduled_start: row.scheduled_start,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
        latest_views: row.latest_views,
        is_own_channel: row.is_own_channel,
        is_collab: row.is_collab,
      },
      null,
      2
    )
  );

  const { data: existing } = await supabase
    .from("mild_r_live_streams")
    .select("video_id, title, metadata")
    .eq("video_id", VIDEO_ID)
    .maybeSingle();
  console.log("existing before upsert:", existing);

  const existingMeta =
    existing?.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const mergedRow = {
    ...row,
    metadata: {
      ...existingMeta,
      ...row.metadata,
    },
  };

  const { error } = await supabase
    .from("mild_r_live_streams")
    .upsert(mergedRow, { onConflict: "video_id" });

  if (error) {
    console.error("upsert error:", error.message);
    process.exit(1);
  }
  console.log("OK upserted", VIDEO_ID);
  await removeMatchingPreviewsForReals(supabase, [row]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
