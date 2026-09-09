/**
 * One-shot X timeline seed → mild_r.x_posts via twitterapi.io
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-x-posts.ts
 */
import { createClient } from "@supabase/supabase-js";

const TWITTERAPI_IO_KEY = process.env.TWITTERAPI_IO_KEY?.trim();
const X_USER_ID = process.env.X_USER_ID?.trim() || "";
const X_USER_NAME = process.env.X_USER_NAME?.trim() || "MildRWorldEnd";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const API_BASE = "https://api.twitterapi.io/twitter/user/last_tweets";
const MAX_PAGES = 3;
const BACKFILL_TARGET = 60;

if (!TWITTERAPI_IO_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: TWITTERAPI_IO_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type PostType = "tweet" | "quote" | "retweet";

type QuotedTweetUi = {
  author_name: string | null;
  author_username: string | null;
  text: string | null;
  media_urls: string[];
};

type XPostRow = {
  tweet_id: string;
  post_type: PostType;
  author_name: string | null;
  author_username: string | null;
  author_avatar: string | null;
  text: string | null;
  media_urls: string[];
  posted_at: string | null;
  likes_count: number | null;
  retweets_count: number | null;
  is_quote: boolean;
  quoted_tweet: QuotedTweetUi | null;
  original_url: string | null;
  raw: Record<string, unknown> | null;
  updated_at: string;
};

type ApiAuthor = {
  name?: string;
  userName?: string;
  profilePicture?: string;
};

type ApiTweet = {
  id?: string;
  url?: string;
  text?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  author?: ApiAuthor;
  quoted_tweet?: ApiTweet | null;
  retweeted_tweet?: ApiTweet | null;
  isRetweet?: boolean;
  entities?: Record<string, unknown>;
  extendedEntities?: Record<string, unknown>;
  media?: unknown;
  [key: string]: unknown;
};

type LastTweetsResponse = {
  tweets?: ApiTweet[];
  has_next_page?: boolean;
  next_cursor?: string;
  status?: string;
  message?: string;
  msg?: string;
  data?: {
    tweets?: ApiTweet[];
    has_next_page?: boolean;
    next_cursor?: string;
  };
};

function extractMediaUrls(tweet: ApiTweet | null | undefined): string[] {
  if (!tweet) return [];
  const urls: string[] = [];

  const pushMediaList = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const m = item as Record<string, unknown>;
      const url =
        (typeof m.media_url_https === "string" && m.media_url_https) ||
        (typeof m.mediaUrlHttps === "string" && m.mediaUrlHttps) ||
        (typeof m.url === "string" && m.url) ||
        (typeof m.preview_image_url === "string" && m.preview_image_url) ||
        null;
      if (url && !urls.includes(url)) urls.push(url);
    }
  };

  pushMediaList(tweet.media);
  pushMediaList(
    tweet.extendedEntities && typeof tweet.extendedEntities === "object"
      ? (tweet.extendedEntities as Record<string, unknown>).media
      : null
  );
  pushMediaList(
    tweet.entities && typeof tweet.entities === "object"
      ? (tweet.entities as Record<string, unknown>).media
      : null
  );

  return urls;
}

function parsePostedAt(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function classify(tweet: ApiTweet): PostType {
  if (tweet.retweeted_tweet != null || tweet.isRetweet === true) {
    return "retweet";
  }
  if (tweet.quoted_tweet != null) return "quote";
  return "tweet";
}

function mapQuoted(tweet: ApiTweet | null | undefined): QuotedTweetUi | null {
  if (!tweet) return null;
  return {
    author_name: tweet.author?.name ?? null,
    author_username: tweet.author?.userName ?? null,
    text: tweet.text ?? null,
    media_urls: extractMediaUrls(tweet),
  };
}

function mapTweet(tweet: ApiTweet): XPostRow | null {
  const id = tweet.id?.trim();
  if (!id) return null;

  const post_type = classify(tweet);
  const is_quote = post_type === "quote";
  const username = tweet.author?.userName ?? null;
  const original_url =
    tweet.url?.trim() ||
    (username ? `https://x.com/${username}/status/${id}` : null);

  return {
    tweet_id: id,
    post_type,
    author_name: tweet.author?.name ?? null,
    author_username: username,
    author_avatar: tweet.author?.profilePicture ?? null,
    text: tweet.text ?? null,
    media_urls: extractMediaUrls(tweet),
    posted_at: parsePostedAt(tweet.createdAt),
    likes_count: typeof tweet.likeCount === "number" ? tweet.likeCount : null,
    retweets_count:
      typeof tweet.retweetCount === "number" ? tweet.retweetCount : null,
    is_quote,
    quoted_tweet:
      post_type === "quote"
        ? mapQuoted(tweet.quoted_tweet)
        : post_type === "retweet"
          ? mapQuoted(tweet.retweeted_tweet)
          : null,
    original_url,
    raw: tweet as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
}

async function fetchLastTweetsPage(cursor: string) {
  const params = new URLSearchParams({
    includeReplies: "false",
    cursor,
  });
  if (X_USER_ID) params.set("userId", X_USER_ID);
  else params.set("userName", X_USER_NAME);

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: { "X-API-Key": TWITTERAPI_IO_KEY! },
  });

  const body = (await res.json().catch(() => ({}))) as LastTweetsResponse;
  if (!res.ok) {
    const msg =
      body.message || body.msg || `twitterapi.io HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    tweets: body.tweets ?? body.data?.tweets ?? [],
    has_next_page: Boolean(body.has_next_page ?? body.data?.has_next_page),
    next_cursor: body.next_cursor ?? body.data?.next_cursor ?? "",
  };
}

async function main() {
  console.log(
    `X backfill → @${X_USER_ID ? `id:${X_USER_ID}` : X_USER_NAME} · target ${BACKFILL_TARGET} · max ${MAX_PAGES} pages`
  );

  let cursor = "";
  let pages = 0;
  let fetched = 0;
  let upserted = 0;
  const byType = { tweet: 0, quote: 0, retweet: 0 };
  let oldest: string | null = null;

  while (pages < MAX_PAGES && upserted < BACKFILL_TARGET) {
    const page = await fetchLastTweetsPage(cursor);
    pages += 1;
    fetched += page.tweets.length;
    console.log(`  page ${pages}: ${page.tweets.length} tweets`);

    const rows: XPostRow[] = [];
    for (const t of page.tweets) {
      if (upserted + rows.length >= BACKFILL_TARGET) break;
      const mapped = mapTweet(t);
      if (!mapped) continue;
      rows.push(mapped);
      byType[mapped.post_type] += 1;
      if (mapped.posted_at) {
        if (!oldest || mapped.posted_at < oldest) oldest = mapped.posted_at;
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("mild_r_x_posts").upsert(rows, {
        onConflict: "tweet_id",
      });
      if (error) throw error;
      upserted += rows.length;
    }

    if (!page.has_next_page || !page.next_cursor) break;
    cursor = page.next_cursor;
    // Free tier: max 1 request / 5s
    await new Promise((r) => setTimeout(r, 5500));
  }

  const { count, error: countError } = await supabase
    .from("mild_r_x_posts")
    .select("tweet_id", { count: "exact", head: true });

  if (countError) {
    console.warn("count check:", countError.message);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        pages,
        fetched,
        upserted,
        byType,
        oldest_posted_at: oldest,
        table_count: count ?? null,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
