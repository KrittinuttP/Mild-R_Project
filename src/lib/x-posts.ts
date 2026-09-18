import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { firstImageUrl } from "@/lib/x-live-schedule";
import type {
  XLiveSchedulePoster,
  XPost,
  XPostType,
  XQuotedTweet,
} from "@/types/x-post";

const SELECT_COLS =
  "tweet_id, post_type, author_name, author_username, author_avatar, text, media_urls, posted_at, likes_count, retweets_count, is_quote, quoted_tweet, original_url, is_live_schedule, schedule_image_url, schedule_image_source_url, raw, created_at, updated_at";

export type LoadXPostsOptions = {
  /** Max rows to return. Default 12. */
  limit?: number;
  /**
   * When true (default), only tweet + quote.
   * Ignored when `types` is set.
   */
  feedOnly?: boolean;
  /** Explicit post_type filter. */
  types?: XPostType[];
};

type DbRow = XPost & {
  raw?: Record<string, unknown> | null;
};

function mapNestedFromRaw(raw: Record<string, unknown> | null | undefined): XQuotedTweet | null {
  if (!raw) return null;
  const nested = raw.retweeted_tweet;
  if (!nested || typeof nested !== "object") return null;
  const t = nested as Record<string, unknown>;
  const author =
    t.author && typeof t.author === "object"
      ? (t.author as Record<string, unknown>)
      : null;
  return {
    author_name: typeof author?.name === "string" ? author.name : null,
    author_username:
      typeof author?.userName === "string" ? author.userName : null,
    text: typeof t.text === "string" ? t.text : null,
    media_urls: [],
  };
}

function normalizePost(row: DbRow): XPost {
  let quoted = row.quoted_tweet;
  if (row.post_type === "retweet" && !quoted) {
    quoted = mapNestedFromRaw(row.raw);
  }

  return {
    tweet_id: row.tweet_id,
    post_type: row.post_type,
    author_name: row.author_name,
    author_username: row.author_username,
    author_avatar: row.author_avatar,
    text: row.text,
    media_urls: row.media_urls,
    posted_at: row.posted_at,
    likes_count: row.likes_count,
    retweets_count: row.retweets_count,
    is_quote: row.is_quote,
    quoted_tweet: quoted,
    original_url: row.original_url,
    is_live_schedule: row.is_live_schedule,
    schedule_image_url: row.schedule_image_url,
    schedule_image_source_url: row.schedule_image_source_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Load X posts from Supabase (never calls twitterapi.io). */
export async function loadXPosts(
  options: LoadXPostsOptions = {}
): Promise<XPost[]> {
  const { limit = 12, feedOnly = true, types } = options;
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    let query = supabase
      .from("mild_r_x_posts")
      .select(SELECT_COLS)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (types && types.length > 0) {
      query = query.in("post_type", types);
    } else if (feedOnly) {
      query = query.in("post_type", ["tweet", "quote"]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[x_posts]", error.message);
      return [];
    }

    return ((data ?? []) as DbRow[]).map(normalizePost);
  } catch (err) {
    console.error("[x_posts]", err);
    return [];
  }
}

/** Connect section bundle: posts tab + retweets tab. */
export async function loadXFeedTabs(): Promise<{
  posts: XPost[];
  retweets: XPost[];
}> {
  const [posts, retweets] = await Promise.all([
    loadXPosts({ limit: 6, types: ["tweet", "quote"] }),
    loadXPosts({ limit: 5, types: ["retweet"] }),
  ]);
  return { posts, retweets };
}

/**
 * Latest Live Schedule poster (cached Storage URL preferred, CDN fallback).
 * Returns null when none found.
 */
export async function loadLatestLiveSchedulePoster(): Promise<XLiveSchedulePoster | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_x_posts")
      .select(
        "tweet_id, text, media_urls, posted_at, original_url, schedule_image_url"
      )
      .eq("is_live_schedule", true)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[x_live_schedule]", error.message);
      return null;
    }
    if (!data) return null;

    const image_url =
      (typeof data.schedule_image_url === "string" &&
        data.schedule_image_url) ||
      firstImageUrl(data.media_urls as string[] | null) ||
      null;

    if (!image_url) return null;

    return {
      tweet_id: data.tweet_id as string,
      image_url,
      posted_at: (data.posted_at as string | null) ?? null,
      original_url: (data.original_url as string | null) ?? null,
      text: (data.text as string | null) ?? null,
    };
  } catch (err) {
    console.error("[x_live_schedule]", err);
    return null;
  }
}
