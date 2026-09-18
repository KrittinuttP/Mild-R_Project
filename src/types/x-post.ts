/** Quoted post nested in a quote tweet (UI shape). */
export type XQuotedTweet = {
  author_name: string | null;
  author_username: string | null;
  text: string | null;
  media_urls: string[];
};

export type XPostType = "tweet" | "quote" | "retweet";

/** Row from public.mild_r_x_posts (and UI feed cards). */
export type XPost = {
  tweet_id: string;
  post_type: XPostType;
  author_name: string | null;
  author_username: string | null;
  author_avatar: string | null;
  text: string | null;
  media_urls: string[] | null;
  posted_at: string | null;
  likes_count: number | null;
  retweets_count: number | null;
  is_quote: boolean;
  quoted_tweet: XQuotedTweet | null;
  original_url: string | null;
  is_live_schedule?: boolean;
  /** Cached poster in Supabase Storage (preferred). */
  schedule_image_url?: string | null;
  schedule_image_source_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Latest Live Schedule poster for /live. */
export type XLiveSchedulePoster = {
  tweet_id: string;
  image_url: string;
  posted_at: string | null;
  original_url: string | null;
  text: string | null;
};
