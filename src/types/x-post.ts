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
  created_at?: string;
  updated_at?: string;
};
