export type LiveStreamThumbnail = {
  id: string;
  video_id: string;
  storage_path: string;
  public_url: string;
  source_url: string | null;
  captured_at: string;
  is_current: boolean;
};

export type LiveStreamRow = {
  video_id: string;
  channel_id: string | null;
  channel_name: string | null;
  /** Short roster title from master (e.g. Xonebu); null if not in Lumina list. */
  source_title: string | null;
  title: string | null;
  url: string | null;
  scheduled_start: string | null;
  /** First-seen scheduled time; preserved across sync overwrites. */
  scheduled_start_first: string | null;
  actual_start: string | null;
  actual_end: string | null;
  /** YouTube CDN URL (source); may break if video deleted. */
  thumbnail_url: string | null;
  /** Current public Storage URL when archived. */
  thumbnail_cached_url: string | null;
  /** Full history newest-first when loaded. */
  thumbnails?: LiveStreamThumbnail[];
  views_on_end: number | null;
  latest_views: number | null;
  is_own_channel: boolean | null;
  is_collab: boolean | null;
  /** Agency project: Pixela (guest roster) | Lumina (default / Mild-R orbit) */
  project?: "Pixela" | "Lumina" | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type LiveStreamStatus = "live" | "upcoming" | "ended" | "cancelled";
