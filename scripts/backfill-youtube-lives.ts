/**
 * One-shot YouTube live history backfill → mild_r.live_streams
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-youtube-lives.ts
 */
import { createClient } from "@supabase/supabase-js";

import {
  classifyLiveOwnership,
  MILD_R_CHANNEL_ID,
} from "../src/lib/live-stream-classify";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const MAIN_CHANNEL_ID = MILD_R_CHANNEL_ID;
const SEARCH_KEYWORD = "@MildRWorldEnd";

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
  title: string;
  url: string;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  thumbnail_url: string | null;
  views_on_end: number;
  latest_views: number;
  is_own_channel: boolean;
  is_collab: boolean;
  metadata: Record<string, unknown>;
};

async function scanHistoricalLives(searchQuery: string, sourceName: string) {
  console.log(`\n🚀 [เริ่มค้นหา] แหล่งที่มา: ${sourceName}`);

  let pageToken = "";
  let totalSaved = 0;
  let keepFetching = true;

  while (keepFetching) {
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&${searchQuery}&eventType=completed&type=video&maxResults=50&pageToken=${pageToken}&key=${YOUTUBE_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = (await searchRes.json()) as {
      items?: Array<{ id: { videoId: string } }>;
      nextPageToken?: string;
      error?: { message: string };
    };

    if (searchData.error) {
      throw new Error(searchData.error.message);
    }

    if (!searchData.items || searchData.items.length === 0) {
      console.log(`🏁 ไม่พบข้อมูลไลฟ์เก่าเพิ่มเติมจาก ${sourceName} แล้ว`);
      break;
    }

    const videoIds = searchData.items.map((item) => item.id.videoId);
    const idsParam = videoIds.join(",");
    const detailsUrl =
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${idsParam}&key=${YOUTUBE_API_KEY}`;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = (await detailsRes.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          channelId: string;
          channelTitle: string;
          title: string;
          description: string;
          tags?: string[];
          thumbnails?: { high?: { url?: string } };
        };
        liveStreamingDetails?: {
          scheduledStartTime?: string;
          actualStartTime?: string;
          actualEndTime?: string;
        };
        statistics?: { viewCount?: string; likeCount?: string };
      }>;
      error?: { message: string };
    };

    if (detailsData.error) {
      throw new Error(detailsData.error.message);
    }

    const streamsToSave: StreamRow[] = [];

    for (const item of detailsData.items || []) {
      if (!item.liveStreamingDetails) continue;

      const viewCount = item.statistics?.viewCount
        ? parseInt(item.statistics.viewCount, 10)
        : 0;
      const channelId = item.snippet.channelId;
      const { is_own_channel, is_collab } = classifyLiveOwnership(
        channelId,
        item.snippet.title
      );

      streamsToSave.push({
        video_id: item.id,
        channel_id: channelId,
        channel_name: item.snippet.channelTitle,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        scheduled_start: item.liveStreamingDetails.scheduledStartTime || null,
        actual_start: item.liveStreamingDetails.actualStartTime || null,
        actual_end: item.liveStreamingDetails.actualEndTime || null,
        thumbnail_url: item.snippet.thumbnails?.high?.url || null,
        views_on_end: viewCount,
        latest_views: viewCount,
        is_own_channel,
        is_collab,
        metadata: {
          description: item.snippet.description,
          tags: item.snippet.tags || [],
          likes: item.statistics?.likeCount || "0",
        },
      });
    }

    if (streamsToSave.length > 0) {
      const ids = streamsToSave.map((s) => s.video_id);
      const { data: existingRows } = await supabase
        .from("mild_r_live_streams")
        .select("video_id, views_on_end")
        .in("video_id", ids);

      const keepOnEnd = new Map<string, number>();
      for (const row of existingRows || []) {
        if (row.views_on_end != null) {
          keepOnEnd.set(row.video_id as string, row.views_on_end as number);
        }
      }

      const merged = streamsToSave.map((row) => {
        const kept = keepOnEnd.get(row.video_id);
        return kept != null ? { ...row, views_on_end: kept } : row;
      });

      const { error } = await supabase
        .from("mild_r_live_streams")
        .upsert(merged, { onConflict: "video_id" });

      if (error) {
        console.error("❌ Database Error:", error.message);
      } else {
        totalSaved += merged.length;
        const own = merged.filter((s) => s.is_own_channel).length;
        const collab = merged.filter((s) => s.is_collab).length;
        console.log(
          `💾 บันทึก ${merged.length} รายการ (own ${own} / collab ${collab}) รวม ${sourceName}: ${totalSaved}`
        );
      }
    }

    if (searchData.nextPageToken) {
      pageToken = searchData.nextPageToken;
    } else {
      keepFetching = false;
      console.log(
        `🎉 สิ้นสุดการค้นหาจาก ${sourceName} รวมทั้งสิ้น ${totalSaved} คลิป`
      );
    }
  }

  return totalSaved;
}

async function writeSyncLog(entry: {
  source: string;
  status: "success" | "error" | "skipped";
  message?: string;
  saved_count?: number;
  meta?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("mild_r_sync_logs").insert({
    source: entry.source,
    status: entry.status,
    message: entry.message ?? null,
    saved_count: entry.saved_count ?? 0,
    meta: entry.meta ?? null,
  });
  if (error) console.error("❌ Sync log Error:", error.message);
}

async function runAllHistoryBackfill() {
  console.log("🌟 เริ่มกระบวนการกวาดไลฟ์เก่าย้อนหลังทั้งหมด 🌟");
  try {
    const own = await scanHistoricalLives(
      `channelId=${MAIN_CHANNEL_ID}`,
      "ช่องหลัก (Mild-R)"
    );
    const related = await scanHistoricalLives(
      `q=${encodeURIComponent(SEARCH_KEYWORD)}`,
      "ช่องอื่นๆ นอกช่องหลัก"
    );
    const total = own + related;
    await writeSyncLog({
      source: "backfill",
      status: "success",
      message: `Backfill finished (own ${own}, related ${related})`,
      saved_count: total,
      meta: { own, related },
    });
    console.log("\n✅ เสร็จสิ้นกระบวนการกวาดข้อมูลย้อนหลังทั้งหมดแล้ว!");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeSyncLog({
      source: "backfill",
      status: "error",
      message,
    });
    throw err;
  }
}

runAllHistoryBackfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
