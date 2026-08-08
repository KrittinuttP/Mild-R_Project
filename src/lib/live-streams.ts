import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { liveStreamSortKey } from "@/lib/live-stream-utils";
import type {
  LiveStreamRow,
  LiveStreamThumbnail,
} from "@/types/live-stream";

export {
  getLiveStreamStatus,
  liveStreamSortKey,
  liveStreamToSlot,
  mergeLiveWeeksWithStreams,
  partitionLiveStreams,
} from "@/lib/live-stream-utils";

const PAGE = 1000;

async function loadThumbnailsForVideos(
  supabase: ReturnType<typeof createPublicClient>,
  videoIds: string[]
): Promise<Map<string, LiveStreamThumbnail[]>> {
  const map = new Map<string, LiveStreamThumbnail[]>();
  if (videoIds.length === 0) return map;

  for (let i = 0; i < videoIds.length; i += 200) {
    const chunk = videoIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("mild_r_live_stream_thumbnails")
      .select(
        "id, video_id, storage_path, public_url, source_url, captured_at, is_current"
      )
      .in("video_id", chunk)
      .order("captured_at", { ascending: false });

    if (error) {
      console.error("[live_stream_thumbnails]", error.message);
      continue;
    }

    for (const row of (data ?? []) as LiveStreamThumbnail[]) {
      const list = map.get(row.video_id) ?? [];
      list.push(row);
      map.set(row.video_id, list);
    }
  }

  return map;
}

/** Load all YouTube live rows (paginated) + thumbnail history. */
export async function loadLiveStreams(
  limit = Number.POSITIVE_INFINITY
): Promise<LiveStreamRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const rows: LiveStreamRow[] = [];
    let from = 0;

    while (rows.length < limit) {
      const to = from + PAGE - 1;
      const { data, error } = await supabase
        .from("mild_r_live_streams")
        .select(
          "video_id, channel_id, channel_name, source_title, title, url, scheduled_start, scheduled_start_first, actual_start, actual_end, thumbnail_url, thumbnail_cached_url, views_on_end, latest_views, is_own_channel, is_collab, metadata, created_at"
        )
        .order("actual_start", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) {
        console.error("[live_streams]", error.message);
        break;
      }

      const batch = (data ?? []) as LiveStreamRow[];
      if (batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    const capped =
      Number.isFinite(limit) && rows.length > limit
        ? rows.slice(0, limit)
        : rows;

    const thumbs = await loadThumbnailsForVideos(
      supabase,
      capped.map((r) => r.video_id)
    );

    const withThumbs = capped.map((row) => ({
      ...row,
      thumbnail_cached_url: row.thumbnail_cached_url ?? null,
      thumbnails: thumbs.get(row.video_id) ?? [],
    }));

    return [...withThumbs].sort(
      (a, b) => liveStreamSortKey(b) - liveStreamSortKey(a)
    );
  } catch (err) {
    console.error("[live_streams]", err);
    return [];
  }
}
