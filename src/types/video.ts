export type VideoKind = "video" | "short" | "premiere";

/** Row from public.mild_r_videos (non-live uploads). */
export type VideoRow = {
  video_id: string;
  channel_id: string | null;
  channel_name: string | null;
  source_title: string | null;
  title: string | null;
  url: string | null;
  kind: VideoKind;
  published_at: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  latest_views: number | null;
  latest_likes: number | null;
  is_own_channel: boolean;
  embeddable: boolean;
  hidden: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** A video ready for the Media tabs / archive. */
export type VideoItem = {
  videoId: string;
  title: string;
  kind: VideoKind;
  /** Bangkok YYYY-MM-DD */
  date: string | null;
  /** Bangkok HH:mm */
  time: string | null;
  durationSeconds: number | null;
  /** e.g. "4:09" */
  durationLabel: string | null;
  views: number | null;
  isOwnChannel: boolean;
  channelLabel: string;
  channelName: string | null;
  /** Small 16:9 image for grids. */
  thumbUrl: string;
  /** Largest available image. */
  coverUrl: string;
  embeddable: boolean;
  youtubeUrl: string;
};
