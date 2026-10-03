import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatVideoDuration } from "@/lib/video-format";
import type { VideoItem, VideoKind, VideoRow } from "@/types/video";

const PAGE = 1000;

const VIDEO_SELECT =
  "video_id, channel_id, channel_name, source_title, title, url, kind, published_at, duration_seconds, thumbnail_url, latest_views, latest_likes, is_own_channel, embeddable, hidden, metadata, created_at, updated_at";

export const VIDEO_KINDS: VideoKind[] = ["video", "short", "premiere"];

export function parseVideoKinds(raw: string | null | undefined): VideoKind[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k): k is VideoKind => (VIDEO_KINDS as string[]).includes(k));
}

function bangkokTimeFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function youtubeThumb(videoId: string, size: "mqdefault" | "hqdefault") {
  return `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
}

export function toVideoItem(row: VideoRow): VideoItem {
  const own = Boolean(row.is_own_channel);
  return {
    videoId: row.video_id,
    title: row.title?.trim() || "Untitled video",
    kind: row.kind,
    date: bangkokDateFromIso(row.published_at),
    time: bangkokTimeFromIso(row.published_at),
    durationSeconds: row.duration_seconds,
    durationLabel: formatVideoDuration(row.duration_seconds),
    views: row.latest_views,
    isOwnChannel: own,
    channelLabel: own
      ? "Mild-R"
      : row.source_title?.trim() || row.channel_name?.trim() || "Collab",
    channelName: row.channel_name,
    thumbUrl: youtubeThumb(row.video_id, "mqdefault"),
    coverUrl: row.thumbnail_url || youtubeThumb(row.video_id, "hqdefault"),
    embeddable: row.embeddable !== false,
    membersOnly: row.metadata?.members_only === true,
    membershipIntro: row.metadata?.membership_intro === true,
    youtubeUrl: `https://www.youtube.com/watch?v=${row.video_id}`,
  };
}

export type LoadVideosOptions = {
  kinds?: VideoKind[];
  limit?: number;
  /** Members-only uploads are listed on /media only. */
  includeMembers?: boolean;
};

/** Visible videos, newest first (RLS already hides `hidden` rows). */
export async function loadVideos({
  kinds = [],
  limit = Number.POSITIVE_INFINITY,
  includeMembers = false,
}: LoadVideosOptions = {}): Promise<VideoItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const rows: VideoRow[] = [];
    let from = 0;

    while (rows.length < limit) {
      const size = Math.min(PAGE, limit - rows.length);
      let query = supabase.from("mild_r_videos").select(VIDEO_SELECT);
      if (kinds.length > 0) query = query.in("kind", kinds);
      if (!includeMembers) {
        query = query.or("metadata->>members_only.is.null,metadata->>members_only.neq.true");
      }
      const { data, error } = await query
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(from, from + size - 1);

      if (error) {
        console.error("[videos]", error.message);
        break;
      }
      const batch = (data ?? []) as VideoRow[];
      rows.push(...batch);
      if (batch.length < size) break;
      from += size;
    }

    return rows.map(toVideoItem);
  } catch (err) {
    console.error("[videos]", err);
    return [];
  }
}

/** Rows for specific YouTube ids; missing ids are skipped. */
export async function loadVideosByIds(videoIds: string[]): Promise<VideoRow[]> {
  if (!isSupabaseConfigured() || videoIds.length === 0) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_videos")
      .select(VIDEO_SELECT)
      .in("video_id", videoIds);
    if (error) {
      console.error("[videos_by_ids]", error.message);
      return [];
    }
    return (data ?? []) as VideoRow[];
  } catch (err) {
    console.error("[videos_by_ids]", err);
    return [];
  }
}
