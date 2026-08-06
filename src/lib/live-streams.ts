import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { liveStreamSortKey } from "@/lib/live-stream-utils";
import type { LiveStreamRow } from "@/types/live-stream";

export {
  getLiveStreamStatus,
  liveStreamSortKey,
  liveStreamToSlot,
  mergeLiveWeeksWithStreams,
  partitionLiveStreams,
} from "@/lib/live-stream-utils";

const PAGE = 1000;

/** Load all YouTube live rows (paginated). */
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
          "video_id, channel_id, channel_name, title, url, scheduled_start, actual_start, actual_end, thumbnail_url, views_on_end, latest_views, is_own_channel, is_collab, metadata, created_at"
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

    return [...capped].sort(
      (a, b) => liveStreamSortKey(b) - liveStreamSortKey(a)
    );
  } catch (err) {
    console.error("[live_streams]", err);
    return [];
  }
}
