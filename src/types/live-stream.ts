export type LiveStreamRow = {
  video_id: string;
  channel_id: string | null;
  channel_name: string | null;
  title: string | null;
  url: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  thumbnail_url: string | null;
  views_on_end: number | null;
  latest_views: number | null;
  is_own_channel: boolean | null;
  is_collab: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type LiveStreamStatus = "live" | "upcoming" | "ended";
