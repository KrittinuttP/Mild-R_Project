export type TrendGrain = "day" | "month" | "year";

export type LiveViewTrendRow = {
  bucket: string;
  views_on_end: number;
  latest_views: number;
  views_diff: number;
  stream_count: number;
  /** Max views_on_end of any single stream in the bucket. */
  peak_views_on_end: number;
};

export type LiveViewTrendTotals = {
  views_on_end: number;
  latest_views: number;
  views_diff: number;
  stream_count: number;
};

export type LiveViewPeakStream = {
  video_id: string;
  title: string | null;
  url: string | null;
  channel_name: string | null;
  actual_end: string | null;
  thumbnail_url: string | null;
  /** Peak metric used for ranking (kept for callers). */
  views: number;
  views_on_end: number;
  latest_views: number;
};

export type LiveViewPeaks = {
  byLatest: LiveViewPeakStream | null;
  byOnEnd: LiveViewPeakStream | null;
};

export type LiveTrendStreamItem = {
  video_id: string;
  title: string | null;
  url: string | null;
  channel_name: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  thumbnail_url: string | null;
  views_on_end: number | null;
  latest_views: number | null;
  is_own_channel: boolean | null;
  is_collab: boolean | null;
  likes: number | null;
};
