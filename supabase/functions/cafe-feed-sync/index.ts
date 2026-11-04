/**
 * Cafe page feeds (Notice Board + Case Tapes).
 *
 * - X: original posts of @Mild_Honeycomb (no replies, reposts or quotes) → mild_r.cafe_x_posts
 * - YouTube: uploads of @Mild-HoneycombProject (Shorts included) → mild_r.cafe_tapes
 *
 * Body: { action: "ping" } | { action: "sync", source?: "cron" | "manual", feeds?: ("x" | "youtube")[] }
 * Cron (00:00 Asia/Bangkok) skips a feed whose `auto_sync` is off; manual runs always pull.
 * `hidden` / `pinned` are set in /cafe/settings and never touched here.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWITTERAPI_IO_KEY = Deno.env.get("TWITTERAPI_IO_KEY") || "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const X_USER_NAME = Deno.env.get("CAFE_X_USER_NAME") || "Mild_Honeycomb";
const YT_HANDLE = Deno.env.get("CAFE_YT_HANDLE") || "@Mild-HoneycombProject";

const SEARCH_URL = "https://api.twitterapi.io/twitter/tweet/advanced_search";
/** First pull reaches back to the start of the cafe promotion. */
const X_FIRST_SINCE = Date.parse("2026-10-01T00:00:00+07:00") / 1000;
/** Later pulls re-read one day before the newest stored post (late-indexed posts). */
const X_OVERLAP_SECONDS = 24 * 60 * 60;
const X_MAX_PAGES = 3;
const YT_MAX_PAGES = 4;
/** Shorts are at most 3 minutes; only those are checked against youtube.com/shorts. */
const SHORT_MAX_SECONDS = 180;

type Feed = "x" | "youtube";
type FeedState = {
  feed: Feed;
  auto_sync: boolean;
  last_synced_at: string | null;
  meta: Record<string, unknown> | null;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Tables live in schema mild_r; the API reaches them through these public views. */
const POSTS = "mild_r_cafe_x_posts";
const TAPES = "mild_r_cafe_tapes";
const STATE = "mild_r_cafe_feed_state";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── X ────────────────────────────────────────────────────────

type ApiTweet = {
  id?: string;
  url?: string;
  text?: string;
  createdAt?: string;
  isReply?: boolean;
  inReplyToId?: string | null;
  isRetweet?: boolean;
  quoted_tweet?: unknown;
  retweeted_tweet?: unknown;
  author?: { userName?: string };
  entities?: Record<string, unknown>;
  extendedEntities?: Record<string, unknown>;
  media?: unknown;
};

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((v) => v && typeof v === "object") as Record<string, unknown>[] : [];
}

function mediaOf(tweet: ApiTweet) {
  const items = [
    ...list(tweet.media),
    ...list((tweet.extendedEntities as Record<string, unknown> | undefined)?.media),
    ...list((tweet.entities as Record<string, unknown> | undefined)?.media),
  ];
  const urls: string[] = [];
  const shortLinks = new Set<string>();
  for (const m of items) {
    const url = (m.media_url_https ?? m.mediaUrlHttps ?? m.preview_image_url) as string | undefined;
    if (url && !urls.includes(url)) urls.push(url);
    if (typeof m.url === "string") shortLinks.add(m.url);
  }
  return { urls, shortLinks };
}

/** Media t.co links removed; other t.co links swapped for their real address. */
function cleanText(tweet: ApiTweet, mediaLinks: Set<string>) {
  let text = tweet.text ?? "";
  for (const link of mediaLinks) text = text.split(link).join("");
  for (const u of list((tweet.entities as Record<string, unknown> | undefined)?.urls)) {
    const short = typeof u.url === "string" ? u.url : null;
    const real = (u.expanded_url ?? u.display_url) as string | undefined;
    if (short && real) text = text.split(short).join(real);
  }
  return text.replace(/[ \t]+\n/g, "\n").trim();
}

function isOriginalPost(tweet: ApiTweet) {
  if (tweet.isRetweet || tweet.retweeted_tweet) return false;
  if (tweet.quoted_tweet) return false;
  if (tweet.isReply || tweet.inReplyToId) return false;
  const author = tweet.author?.userName;
  return !author || author.toLowerCase() === X_USER_NAME.toLowerCase();
}

async function searchPage(sinceUnix: number, cursor: string) {
  const params = new URLSearchParams({
    query: `from:${X_USER_NAME} since_time:${sinceUnix} -filter:replies -filter:nativeretweets -filter:quote`,
    queryType: "Latest",
    cursor,
  });
  const res = await fetch(`${SEARCH_URL}?${params}`, { headers: { "X-API-Key": TWITTERAPI_IO_KEY } });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.status === "error") {
    throw new Error(String(body.message || body.msg || `twitterapi.io HTTP ${res.status}`));
  }
  const data = (body.data ?? {}) as Record<string, unknown>;
  const tweets = (body.tweets ?? data.tweets ?? []) as ApiTweet[];
  return {
    tweets: Array.isArray(tweets) ? tweets : [],
    hasNext: Boolean(body.has_next_page ?? data.has_next_page),
    next: String(body.next_cursor ?? data.next_cursor ?? ""),
  };
}

async function syncX() {
  if (!TWITTERAPI_IO_KEY) throw new Error("TWITTERAPI_IO_KEY is not set");
  const { data: newest } = await supabase
    .from(POSTS)
    .select("posted_at")
    .order("posted_at", { ascending: false })
    .limit(1);
  const newestMs = newest?.[0]?.posted_at ? Date.parse(newest[0].posted_at) : NaN;
  const since = Number.isFinite(newestMs) ? Math.floor(newestMs / 1000) - X_OVERLAP_SECONDS : X_FIRST_SINCE;

  const rows: Record<string, unknown>[] = [];
  let cursor = "";
  for (let page = 0; page < X_MAX_PAGES; page++) {
    const { tweets, hasNext, next } = await searchPage(since, cursor);
    for (const tweet of tweets) {
      const id = tweet.id?.trim();
      const postedAt = tweet.createdAt ? new Date(tweet.createdAt) : null;
      if (!id || !postedAt || Number.isNaN(postedAt.getTime()) || !isOriginalPost(tweet)) continue;
      const { urls, shortLinks } = mediaOf(tweet);
      rows.push({
        tweet_id: id,
        text: cleanText(tweet, shortLinks),
        media_urls: urls,
        url: tweet.url?.trim() || `https://x.com/${X_USER_NAME}/status/${id}`,
        posted_at: postedAt.toISOString(),
        fetched_at: new Date().toISOString(),
      });
    }
    if (!hasNext || !next) break;
    cursor = next;
  }

  if (rows.length) {
    const { error } = await supabase.from(POSTS).upsert(rows, { onConflict: "tweet_id" });
    if (error) throw new Error(error.message);
  }
  return { count: rows.length, meta: { user: X_USER_NAME, since } };
}

// ── YouTube ──────────────────────────────────────────────────

async function yt(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, key: YOUTUBE_API_KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.error) {
    const message = (body.error as { message?: string } | undefined)?.message;
    throw new Error(message || `YouTube API HTTP ${res.status}`);
  }
  return body;
}

function seconds(iso: string | undefined) {
  const m = iso?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/** youtube.com/shorts/<id> answers 200 for a Short and redirects for a normal video. */
async function isShort(videoId: string) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, { method: "HEAD", redirect: "manual" });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function syncYoutube(state: FeedState | undefined) {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is not set");
  let uploads = typeof state?.meta?.uploads === "string" ? (state.meta.uploads as string) : "";
  let channelId = typeof state?.meta?.channel_id === "string" ? (state.meta.channel_id as string) : "";
  if (!uploads) {
    const channel = await yt("channels", { part: "contentDetails", forHandle: YT_HANDLE });
    const item = (channel.items as Record<string, unknown>[] | undefined)?.[0];
    if (!item) throw new Error(`YouTube channel ${YT_HANDLE} not found`);
    channelId = String(item.id);
    uploads = String(
      ((item.contentDetails as Record<string, unknown>).relatedPlaylists as Record<string, unknown>).uploads
    );
  }

  const ids: string[] = [];
  let pageToken = "";
  let complete = false;
  for (let page = 0; page < YT_MAX_PAGES; page++) {
    const body = await yt("playlistItems", {
      part: "contentDetails",
      playlistId: uploads,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of (body.items as Record<string, unknown>[] | undefined) ?? []) {
      const id = (item.contentDetails as Record<string, unknown> | undefined)?.videoId;
      if (typeof id === "string") ids.push(id);
    }
    pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : "";
    if (!pageToken) {
      complete = true;
      break;
    }
  }

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const body = await yt("videos", { part: "snippet,contentDetails,status", id: ids.slice(i, i + 50).join(",") });
    for (const v of (body.items as Record<string, unknown>[] | undefined) ?? []) {
      const snippet = v.snippet as Record<string, unknown>;
      const status = v.status as Record<string, unknown> | undefined;
      // Upcoming premieres / lives and private videos are not tapes yet.
      if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== "none") continue;
      if (status?.privacyStatus && status.privacyStatus !== "public") continue;
      const duration = seconds((v.contentDetails as Record<string, unknown>)?.duration as string | undefined);
      const thumbs = (snippet.thumbnails ?? {}) as Record<string, { url?: string }>;
      rows.push({
        video_id: String(v.id),
        title: String(snippet.title ?? ""),
        published_at: String(snippet.publishedAt),
        duration_seconds: duration,
        is_short: duration !== null && duration <= SHORT_MAX_SECONDS ? await isShort(String(v.id)) : false,
        thumbnail_url: thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? null,
        fetched_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length) {
    const { error } = await supabase.from(TAPES).upsert(rows, { onConflict: "video_id" });
    if (error) throw new Error(error.message);
  }
  // A full list means anything else was deleted or made private on YouTube.
  let removed = 0;
  if (complete) {
    const keep = rows.map((row) => row.video_id as string);
    const { data: stored } = await supabase.from(TAPES).select("video_id");
    const gone = (stored ?? []).map((r) => r.video_id as string).filter((id) => !keep.includes(id));
    if (gone.length) {
      const { error } = await supabase.from(TAPES).delete().in("video_id", gone);
      if (error) throw new Error(error.message);
      removed = gone.length;
    }
  }
  return { count: rows.length, meta: { handle: YT_HANDLE, channel_id: channelId, uploads, removed } };
}

// ── handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    source?: string;
    feeds?: string[];
  };
  if (body.action === "ping") return json({ ok: true });
  if (body.action !== "sync") return json({ error: "unknown action" }, 400);

  const source = body.source === "manual" ? "manual" : "cron";
  const feeds = (body.feeds?.length ? body.feeds : ["x", "youtube"]).filter(
    (f): f is Feed => f === "x" || f === "youtube"
  );
  const { data: states } = await supabase.from(STATE).select("feed, auto_sync, last_synced_at, meta");
  const byFeed = new Map((states ?? []).map((s) => [s.feed as Feed, s as FeedState]));

  const results: Record<string, unknown> = {};
  for (const feed of feeds) {
    const state = byFeed.get(feed);
    if (source === "cron" && state && !state.auto_sync) {
      results[feed] = { skipped: "auto sync off" };
      continue;
    }
    try {
      const out = feed === "x" ? await syncX() : await syncYoutube(state);
      await supabase
        .from(STATE)
        .update({
          last_synced_at: new Date().toISOString(),
          last_count: out.count,
          last_error: null,
          meta: { ...(state?.meta ?? {}), ...out.meta },
          updated_at: new Date().toISOString(),
        })
        .eq("feed", feed);
      results[feed] = { ok: true, count: out.count };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase
        .from(STATE)
        .update({ last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
        .eq("feed", feed);
      results[feed] = { ok: false, error: message };
    }
  }
  const failed = Object.values(results).some((r) => (r as { ok?: boolean }).ok === false);
  return json({ source, results }, failed ? 502 : 200);
});
