import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyJobDiscord } from "../_shared/discord-job-alert.ts";

const TWITTERAPI_IO_KEY = Deno.env.get("TWITTERAPI_IO_KEY") || "";
const X_USER_ID = Deno.env.get("X_USER_ID") || "";
const X_USER_NAME = Deno.env.get("X_USER_NAME") || "MildRWorldEnd";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const API_BASE = "https://api.twitterapi.io/twitter/user/last_tweets";
const SEARCH_URL = "https://api.twitterapi.io/twitter/tweet/advanced_search";
const ACCOUNT_INFO_URL = "https://api.twitterapi.io/oapi/my/info";
const MAX_PAGES = 3;
/**
 * Re-returned posts are billed again, so hourly runs search strictly after the
 * newest stored post; one daily run re-reads 24h to catch late-indexed posts.
 */
const SEARCH_CATCHUP_SECONDS = 24 * 60 * 60;
const SEARCH_CATCHUP_UTC_HOUR = 17; // 00:00 Asia/Bangkok
const SEARCH_FULL_PAGE = 20;
/**
 * Timeline fallback (300 credits) only runs in the daily catch-up, so a broken
 * search costs at most one timeline call per day. It also runs when no post is
 * newer than this — search may be silently returning nothing.
 */
const SEARCH_STALE_SECONDS = 72 * 60 * 60;
/** twitterapi.io: 15 credits per returned tweet, minimum 15 per call. */
const CREDITS_PER_TWEET = 15;
const MIN_CREDITS_PER_CALL = 15;
/** Same error (source + message) is sent to Discord at most once per window. */
const ALERT_DEDUPE_MS = 6 * 60 * 60 * 1000;
const BACKFILL_TARGET = 60;
const MEDIA_BUCKET = "x-media";
/** Stored posts re-scanned for live covers after each sync (catches lives tracked late). */
const LIVE_COVER_RESCAN_LIMIT = 60;
const LIVE_COVER_MIN_WIDTH = 1280;
const LIVE_COVER_RATIO = 16 / 9;
const LIVE_COVER_RATIO_TOLERANCE = 0.03;
const YOUTUBE_ID_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^"\s]*?&)?v=|live\/|shorts\/))([A-Za-z0-9_-]{11})/g;
const PBS_MEDIA_RE =
  /^(https:\/\/pbs\.twimg\.com\/media\/[A-Za-z0-9_-]+)\.(jpe?g|png|webp)/i;
/** Live Schedule — case-insensitive, optional spaces; ASCII + stylized Unicode */
const LIVE_SCHEDULE_RE = /live\s*schedule/i;

/** Latin letter small capitals / phonetic forms used in aesthetic X fonts. */
const STYLIZED_LATIN: Record<string, string> = {
  ʟ: "l",
  ɪ: "i",
  ᴠ: "v",
  ᴇ: "e",
  ꜱ: "s",
  ᴄ: "c",
  ʜ: "h",
  ᴅ: "d",
  ᴜ: "u",
  ᴀ: "a",
  ʙ: "b",
  ꜰ: "f",
  ɢ: "g",
  ᴊ: "j",
  ᴋ: "k",
  ᴍ: "m",
  ɴ: "n",
  ᴏ: "o",
  ᴘ: "p",
  ǫ: "q",
  ʀ: "r",
  ᴛ: "t",
  ᴡ: "w",
  ʏ: "y",
  ᴢ: "z",
  ı: "i",
  ɩ: "i",
  ʋ: "v",
};

function mathAlnumToAscii(cp: number): string | null {
  const ranges: Array<{ start: number; base: number; count: number }> = [
    { start: 0x1d400, base: 65, count: 26 },
    { start: 0x1d41a, base: 97, count: 26 },
    { start: 0x1d434, base: 65, count: 26 },
    { start: 0x1d44e, base: 97, count: 26 },
    { start: 0x1d468, base: 65, count: 26 },
    { start: 0x1d482, base: 97, count: 26 },
    { start: 0x1d49c, base: 65, count: 26 },
    { start: 0x1d4b6, base: 97, count: 26 },
    { start: 0x1d4d0, base: 65, count: 26 },
    { start: 0x1d4ea, base: 97, count: 26 },
    { start: 0x1d504, base: 65, count: 26 },
    { start: 0x1d51e, base: 97, count: 26 },
    { start: 0x1d538, base: 65, count: 26 },
    { start: 0x1d552, base: 97, count: 26 },
    { start: 0x1d56c, base: 65, count: 26 },
    { start: 0x1d586, base: 97, count: 26 },
    { start: 0x1d5a0, base: 65, count: 26 },
    { start: 0x1d5ba, base: 97, count: 26 },
    { start: 0x1d5d4, base: 65, count: 26 },
    { start: 0x1d5ee, base: 97, count: 26 },
    { start: 0x1d608, base: 65, count: 26 },
    { start: 0x1d622, base: 97, count: 26 },
    { start: 0x1d63c, base: 65, count: 26 },
    { start: 0x1d656, base: 97, count: 26 },
    { start: 0x1d670, base: 65, count: 26 },
    { start: 0x1d68a, base: 97, count: 26 },
  ];
  for (const r of ranges) {
    if (cp >= r.start && cp < r.start + r.count) {
      return String.fromCharCode(r.base + (cp - r.start));
    }
  }
  return null;
}

function foldStylizedLatin(input: string): string {
  let out = "";
  for (const ch of input) {
    const mapped = STYLIZED_LATIN[ch];
    if (mapped) {
      out += mapped;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x1d400 && cp <= 0x1d7ff) {
      out += mathAlnumToAscii(cp) ?? ch;
      continue;
    }
    out += ch;
  }
  return out.normalize("NFKD").replace(/\p{M}/gu, "");
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
  is_live_schedule: boolean;
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

function isLiveScheduleText(text: string | null | undefined): boolean {
  if (!text) return false;
  return LIVE_SCHEDULE_RE.test(foldStylizedLatin(text));
}

function isLikelyImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("pbs.twimg.com") ||
    u.includes("twimg.com") ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
  );
}

function firstImageUrl(urls: string[] | null | undefined): string | null {
  return (urls ?? []).find((u) => u && isLikelyImageUrl(u)) ?? null;
}

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
    tweet.extendedEntities &&
      typeof tweet.extendedEntities === "object"
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
  const text = tweet.text ?? null;
  const original_url =
    tweet.url?.trim() ||
    (username ? `https://x.com/${username}/status/${id}` : null);

  return {
    tweet_id: id,
    post_type,
    author_name: tweet.author?.name ?? null,
    author_username: username,
    author_avatar: tweet.author?.profilePicture ?? null,
    text,
    media_urls: extractMediaUrls(tweet),
    posted_at: parsePostedAt(tweet.createdAt),
    likes_count:
      typeof tweet.likeCount === "number" ? tweet.likeCount : null,
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
    is_live_schedule: isLiveScheduleText(text),
    raw: tweet as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
}

function fetchLastTweetsPage(cursor: string) {
  const params = new URLSearchParams({
    includeReplies: "false",
    cursor,
  });
  if (X_USER_ID) {
    params.set("userId", X_USER_ID);
  } else {
    params.set("userName", X_USER_NAME);
  }

  return fetchTweetsPage(`${API_BASE}?${params.toString()}`);
}

/** Posts (incl. retweets) by the account newer than `sinceUnix`, newest first. */
function fetchSearchPage(sinceUnix: number, cursor: string) {
  const params = new URLSearchParams({
    query: `from:${X_USER_NAME} since_time:${sinceUnix} include:nativeretweets -filter:replies`,
    queryType: "Latest",
    cursor,
  });
  return fetchTweetsPage(`${SEARCH_URL}?${params.toString()}`);
}

type TweetsPage = {
  tweets: ApiTweet[];
  has_next_page: boolean;
  next_cursor: string;
};

function callCredits(returned: number) {
  return Math.max(MIN_CREDITS_PER_CALL, returned * CREDITS_PER_TWEET);
}

class TwitterApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Out of credits / bad key fail the timeline too — falling back would only add noise. */
function isFallbackable(err: unknown): boolean {
  if (!(err instanceof TwitterApiError)) return false;
  if ([401, 402, 403].includes(err.status)) return false;
  return !/credit|recharge|api key|unauthori[sz]ed/i.test(err.message);
}

async function fetchTweetsPage(url: string): Promise<TweetsPage> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-API-Key": TWITTERAPI_IO_KEY },
    });
  } catch (err) {
    throw new TwitterApiError(
      `twitterapi.io network: ${err instanceof Error ? err.message : String(err)}`,
      0
    );
  }

  const body = (await res.json().catch(() => ({}))) as LastTweetsResponse;
  if (!res.ok || body.status === "error") {
    const msg =
      body.message || body.msg || `twitterapi.io HTTP ${res.status}`;
    throw new TwitterApiError(msg, res.status);
  }

  const tweets = body.tweets ?? body.data?.tweets ?? [];
  if (!Array.isArray(tweets)) {
    throw new TwitterApiError("twitterapi.io: unexpected response shape", res.status);
  }
  const has_next_page = Boolean(
    body.has_next_page ?? body.data?.has_next_page
  );
  const next_cursor =
    body.next_cursor ?? body.data?.next_cursor ?? "";

  return { tweets, has_next_page, next_cursor };
}

/** Account balance from twitterapi.io — numeric fields only (no account details). */
async function fetchAccountCredits() {
  const res = await fetch(ACCOUNT_INFO_URL, {
    headers: { "X-API-Key": TWITTERAPI_IO_KEY },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.status === "error") {
    const msg = body.message || body.msg || `twitterapi.io HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  const balances: Record<string, number> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "number" && Number.isFinite(value)) balances[key] = value;
  }
  return {
    rechargeCredits: balances.recharge_credits ?? null,
    bonusCredits: balances.total_bonus_credits ?? null,
    balances,
    checkedAt: new Date().toISOString(),
  };
}

async function existingIds(ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  if (ids.length === 0) return found;

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from("mild_r_x_posts")
      .select("tweet_id")
      .in("tweet_id", chunk);

    if (error) throw error;
    for (const row of data || []) {
      found.add(row.tweet_id as string);
    }
  }
  return found;
}

async function latestPostedUnix(): Promise<number | null> {
  const { data, error } = await supabase
    .from("mild_r_x_posts")
    .select("posted_at")
    .not("posted_at", "is", null)
    .order("posted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const ms = data?.posted_at ? Date.parse(data.posted_at as string) : NaN;
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

async function upsertPosts(rows: XPostRow[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("mild_r_x_posts").upsert(rows, {
    onConflict: "tweet_id",
  });
  if (error) throw error;
}

type JobFailure = { id: string; error: string };

/** Keep alert payloads short. */
const MAX_REPORTED_FAILURES = 5;

function pushFailure(list: JobFailure[], id: string, err: unknown) {
  const error = err instanceof Error ? err.message : String(err);
  console.error(`${id}: ${error}`);
  if (list.length < MAX_REPORTED_FAILURES) list.push({ id, error });
}

/** Download Live Schedule poster into Storage when needed. */
async function cacheLiveScheduleImages(rows: XPostRow[]) {
  let cached = 0;
  let schedules = 0;
  let failed = 0;
  const failures: JobFailure[] = [];
  const fail = (tweetId: string, err: unknown) => {
    failed += 1;
    pushFailure(failures, `schedule image ${tweetId}`, err);
  };
  for (const row of rows) {
    if (!row.is_live_schedule) continue;
    const sourceUrl = firstImageUrl(row.media_urls);
    if (!sourceUrl) continue;

    const { data: existing } = await supabase
      .from("mild_r_x_posts")
      .select("schedule_image_url, schedule_image_source_url, posted_at")
      .eq("tweet_id", row.tweet_id)
      .maybeSingle();

    if (
      existing?.schedule_image_url &&
      existing.schedule_image_source_url === sourceUrl
    ) {
      const ensured = await ensureXLiveScheduleRow({
        tweet_id: row.tweet_id,
        image_url: existing.schedule_image_url as string,
        image_source_url: existing.schedule_image_source_url as string,
        posted_at:
          row.posted_at ??
          ((existing.posted_at as string | null) ?? null),
      });
      if (ensured === "inserted" || ensured === "updated") schedules += 1;
      if (ensured === "error") fail(row.tweet_id, "registry write failed");
      continue;
    }

    try {
      const imgRes = await fetch(sourceUrl, {
        headers: { Accept: "image/*" },
      });
      if (!imgRes.ok) throw new Error(`fetch: HTTP ${imgRes.status}`);
      const contentType =
        imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : contentType.includes("gif")
            ? "gif"
            : "jpg";
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const path = `live-schedule/${row.tweet_id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, bytes, {
          contentType,
          upsert: false,
          cacheControl: "31536000",
        });
      if (upErr) throw new Error(`upload: ${upErr.message}`);

      const { data: pub } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("mild_r_x_posts")
        .update({
          schedule_image_url: pub.publicUrl,
          schedule_image_source_url: sourceUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("tweet_id", row.tweet_id);

      if (updErr) throw new Error(`update: ${updErr.message}`);
      cached += 1;

      const ensured = await ensureXLiveScheduleRow({
        tweet_id: row.tweet_id,
        image_url: pub.publicUrl,
        image_source_url: sourceUrl,
        posted_at: row.posted_at,
      });
      if (ensured === "inserted" || ensured === "updated") schedules += 1;
      if (ensured === "error") throw new Error("registry write failed");
    } catch (err) {
      fail(row.tweet_id, err);
    }
  }
  return { cached, schedules, failed, failures };
}

type LiveCoverSourceRow = Pick<XPostRow, "tweet_id" | "post_type" | "raw">;

type LiveCoverCandidate = {
  videoId: string;
  tweetId: string;
  sourceUrl: string;
  base: string;
  format: string;
  width: number;
  height: number;
  postedAt: string | null;
};

/** The tweet that carries the content: the original for retweets / quotes. */
function liveCoverContentTweet(row: LiveCoverSourceRow): ApiTweet | null {
  const raw = row.raw as ApiTweet | null;
  if (!raw) return null;
  if (row.post_type === "retweet") return raw.retweeted_tweet ?? raw;
  if (row.post_type === "quote") return raw.quoted_tweet ?? null;
  return raw;
}

function youtubeIdsOf(tweet: ApiTweet): Set<string> {
  const haystack = JSON.stringify([tweet.entities, tweet.card, tweet.text]);
  return new Set(
    [...haystack.matchAll(YOUTUBE_ID_RE)].map((m) => m[1] as string)
  );
}

function photosOf(tweet: ApiTweet): Record<string, unknown>[] {
  const list =
    (tweet.extendedEntities as Record<string, unknown> | undefined)?.media ??
    (tweet.entities as Record<string, unknown> | undefined)?.media ??
    tweet.media;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (m): m is Record<string, unknown> =>
      Boolean(m) &&
      typeof m === "object" &&
      (m as Record<string, unknown>).type === "photo" &&
      typeof (m as Record<string, unknown>).media_url_https === "string"
  );
}

/** One YouTube link + one 16:9 photo ≥1280px wide = that live's cover. */
function liveCoverCandidate(row: LiveCoverSourceRow): LiveCoverCandidate | null {
  const tweet = liveCoverContentTweet(row);
  if (!tweet) return null;

  const ids = youtubeIdsOf(tweet);
  const photos = photosOf(tweet);
  if (ids.size !== 1 || photos.length !== 1) return null;

  const photo = photos[0];
  const info = photo.original_info as
    | { width?: number; height?: number }
    | undefined;
  const width = info?.width ?? 0;
  const height = info?.height ?? 0;
  if (width < LIVE_COVER_MIN_WIDTH || height <= 0) return null;
  if (
    Math.abs(width / height - LIVE_COVER_RATIO) / LIVE_COVER_RATIO >
    LIVE_COVER_RATIO_TOLERANCE
  ) {
    return null;
  }

  const sourceUrl = photo.media_url_https as string;
  const match = sourceUrl.match(PBS_MEDIA_RE);
  if (!match) return null;

  return {
    videoId: [...ids][0],
    tweetId: (tweet.id ?? row.tweet_id).trim(),
    sourceUrl,
    base: match[1],
    format: match[2].toLowerCase() === "jpeg" ? "jpg" : match[2].toLowerCase(),
    width,
    height,
    postedAt: parsePostedAt(tweet.createdAt),
  };
}

async function selectExisting(
  table: string,
  ids: string[]
): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from(table)
      .select("video_id")
      .in("video_id", ids.slice(i, i + 200));
    if (error) throw error;
    for (const row of data || []) found.add(row.video_id as string);
  }
  return found;
}

async function uploadLiveCoverImage(
  candidate: LiveCoverCandidate,
  name: "orig" | "small"
): Promise<{ path: string; url: string }> {
  const res = await fetch(
    `${candidate.base}?format=${candidate.format}&name=${name}`,
    { headers: { Accept: "image/*" } }
  );
  if (!res.ok) throw new Error(`fetch ${name}: HTTP ${res.status}`);
  const contentType =
    res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const suffix = name === "orig" ? "" : "-small";
  const path = `live-cover/${candidate.videoId}/${candidate.tweetId}${suffix}.${candidate.format}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, new Uint8Array(await res.arrayBuffer()), {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`upload ${name}: ${error.message}`);

  return {
    path,
    url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}

/** Cache X cover images for tracked lives that don't have one yet (earliest post wins). */
async function cacheLiveCovers(rows: LiveCoverSourceRow[]) {
  const candidates = new Map<string, LiveCoverCandidate>();
  for (const row of rows) {
    const candidate = liveCoverCandidate(row);
    if (!candidate) continue;
    const prev = candidates.get(candidate.videoId);
    if (
      !prev ||
      (candidate.postedAt && (!prev.postedAt || candidate.postedAt < prev.postedAt))
    ) {
      candidates.set(candidate.videoId, candidate);
    }
  }
  const failures: JobFailure[] = [];
  if (candidates.size === 0) {
    return { matched: 0, cached: 0, failed: 0, failures };
  }

  const ids = [...candidates.keys()];
  const [tracked, cachedAlready] = await Promise.all([
    selectExisting("mild_r_live_streams", ids),
    selectExisting("mild_r_live_stream_x_covers", ids),
  ]);

  let matched = 0;
  let cached = 0;
  let failed = 0;
  for (const candidate of candidates.values()) {
    if (!tracked.has(candidate.videoId)) continue;
    matched += 1;
    if (cachedAlready.has(candidate.videoId)) continue;

    try {
      const full = await uploadLiveCoverImage(candidate, "orig");
      const small = await uploadLiveCoverImage(candidate, "small");
      const now = new Date().toISOString();
      const { error } = await supabase.from("mild_r_live_stream_x_covers").upsert(
        {
          video_id: candidate.videoId,
          tweet_id: candidate.tweetId,
          source_url: candidate.sourceUrl,
          width: candidate.width,
          height: candidate.height,
          storage_path: full.path,
          public_url: full.url,
          thumb_url: small.url,
          posted_at: candidate.postedAt,
          updated_at: now,
        },
        { onConflict: "video_id" }
      );
      if (error) throw new Error(error.message);
      cached += 1;
    } catch (err) {
      failed += 1;
      pushFailure(
        failures,
        `live cover ${candidate.videoId} (tweet ${candidate.tweetId})`,
        err
      );
    }
  }
  return { matched, cached, failed, failures };
}

/** Re-scan stored posts (newest `limit`, or all) — no twitterapi.io calls. */
async function cacheLiveCoversFromStored(limit = Number.POSITIVE_INFINITY) {
  const rows: LiveCoverSourceRow[] = [];
  const page = 200;
  for (let from = 0; rows.length < limit; from += page) {
    const to = Math.min(from + page, limit) - 1;
    const { data, error } = await supabase
      .from("mild_r_x_posts")
      .select("tweet_id, post_type, raw")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .range(from, to);
    if (error) throw error;
    rows.push(...((data ?? []) as LiveCoverSourceRow[]));
    if (!data || data.length < to - from + 1) break;
  }
  return { scanned: rows.length, ...(await cacheLiveCovers(rows)) };
}

/** Sync must still succeed when cover caching fails. */
async function cacheLiveCoversAfterSync() {
  try {
    return await cacheLiveCoversFromStored(LIVE_COVER_RESCAN_LIMIT);
  } catch (err) {
    const failures: JobFailure[] = [];
    pushFailure(failures, "live covers", err);
    return { scanned: 0, matched: 0, cached: 0, failed: 1, failures };
  }
}

function failureMessage(label: string, failed: number, failures: JobFailure[]) {
  const shown = failures.map((f) => `${f.id}: ${f.error}`).join(" · ");
  const more = failed > failures.length ? ` · +${failed - failures.length} more` : "";
  return `${label} failed ${failed}: ${shown}${more}`;
}

/** Separate error log (→ Discord) so a partial failure doesn't fail the whole sync. */
async function reportSyncFailures(result: {
  scheduleFailed: number;
  scheduleFailures: JobFailure[];
  liveCovers: { failed: number; failures: JobFailure[] };
}) {
  if (result.scheduleFailed > 0) {
    await writeSyncLog({
      source: "edge-x-schedule-images",
      status: "error",
      message: failureMessage(
        "Schedule images",
        result.scheduleFailed,
        result.scheduleFailures
      ),
      meta: {
        failed: result.scheduleFailed,
        failures: result.scheduleFailures,
      },
    });
  }
  if (result.liveCovers.failed > 0) {
    await writeSyncLog({
      source: "edge-x-live-covers",
      status: "error",
      message: failureMessage(
        "Live covers",
        result.liveCovers.failed,
        result.liveCovers.failures
      ),
      meta: result.liveCovers,
    });
  }
}

/** Bangkok post date → week Sunday; Saturday bumps +1 day first. */
function scheduleWeekStartFromPostedAt(
  postedAt: string | null | undefined
): string | null {
  if (!postedAt) return null;
  const ms = new Date(postedAt).getTime();
  if (!Number.isFinite(ms)) return null;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
  const [y, m, d] = ymd.split("-").map(Number);
  let anchor = new Date(Date.UTC(y, m - 1, d));
  if (anchor.getUTCDay() === 6) {
    anchor = new Date(Date.UTC(y, m - 1, d + 1));
  }
  const dow = anchor.getUTCDay();
  anchor = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - dow)
  );
  const yy = anchor.getUTCFullYear();
  const mm = String(anchor.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(anchor.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function ensureXLiveScheduleRow(input: {
  tweet_id: string;
  image_url: string;
  image_source_url?: string | null;
  posted_at?: string | null;
}): Promise<"inserted" | "updated" | "skipped" | "error"> {
  const tweetId = input.tweet_id?.trim();
  const imageUrl = input.image_url?.trim();
  if (!tweetId || !imageUrl) return "skipped";

  const now = new Date().toISOString();
  const sourceUrl = input.image_source_url?.trim() || null;
  const postedAt = input.posted_at ?? null;
  const scheduleWeekStart = scheduleWeekStartFromPostedAt(postedAt);

  const { data: existing, error: selErr } = await supabase
    .from("mild_r_x_live_schedules")
    .select("tweet_id, image_source_url")
    .eq("tweet_id", tweetId)
    .maybeSingle();

  if (selErr) {
    console.error("x_live_schedules select:", selErr.message);
    return "error";
  }

  if (!existing) {
    const { error: insErr } = await supabase.from("mild_r_x_live_schedules").insert({
      tweet_id: tweetId,
      image_url: imageUrl,
      image_source_url: sourceUrl,
      posted_at: postedAt,
      schedule_week_start: scheduleWeekStart,
      added_at: now,
      status: "pending",
      created_at: now,
      updated_at: now,
    });
    if (insErr) {
      console.error("x_live_schedules insert:", insErr.message);
      return "error";
    }
    return "inserted";
  }

  const { error: updErr } = await supabase
    .from("mild_r_x_live_schedules")
    .update({
      image_url: imageUrl,
      image_source_url: sourceUrl ?? existing.image_source_url,
      posted_at: postedAt,
      schedule_week_start: scheduleWeekStart,
      updated_at: now,
    })
    .eq("tweet_id", tweetId);

  if (updErr) {
    console.error("x_live_schedules update:", updErr.message);
    return "error";
  }
  return "updated";
}

async function writeSyncLog(entry: {
  source: string;
  status: "success" | "error" | "skipped";
  message?: string;
  saved_count?: number;
  meta?: Record<string, unknown>;
}) {
  const alert =
    entry.status !== "error" ||
    !(await alertedRecently(entry.source, entry.message ?? null));
  const { error } = await supabase.from("mild_r_sync_logs").insert({
    source: entry.source,
    status: entry.status,
    message: entry.message ?? null,
    saved_count: entry.saved_count ?? 0,
    meta: entry.meta ?? null,
  });
  if (error) {
    console.error("sync log error:", error.message);
  }
  if (alert) await notifyJobDiscord(entry);
}

/** Hourly runs would otherwise repeat a persistent error (e.g. no credits) every hour. */
async function alertedRecently(source: string, message: string | null) {
  const since = new Date(Date.now() - ALERT_DEDUPE_MS).toISOString();
  let query = supabase
    .from("mild_r_sync_logs")
    .select("id", { count: "exact", head: true })
    .eq("source", source)
    .eq("status", "error")
    .gte("created_at", since);
  query = message == null ? query.is("message", null) : query.eq("message", message);
  const { count, error } = await query;
  if (error) return false;
  return (count ?? 0) > 0;
}

async function runBackfill() {
  let cursor = "";
  let pages = 0;
  let fetched = 0;
  let upserted = 0;
  let scheduleCached = 0;
  let scheduleRows = 0;
  let scheduleFailed = 0;
  const scheduleFailures: JobFailure[] = [];
  let scheduleFlagged = 0;
  const byType = { tweet: 0, quote: 0, retweet: 0 };

  let creditsUsed = 0;

  while (pages < MAX_PAGES && upserted < BACKFILL_TARGET) {
    const page = await fetchLastTweetsPage(cursor);
    pages += 1;
    fetched += page.tweets.length;
    creditsUsed += callCredits(page.tweets.length);

    const rows: XPostRow[] = [];
    for (const t of page.tweets) {
      if (upserted + rows.length >= BACKFILL_TARGET) break;
      const mapped = mapTweet(t);
      if (!mapped) continue;
      rows.push(mapped);
      byType[mapped.post_type] += 1;
      if (mapped.is_live_schedule) scheduleFlagged += 1;
    }

    await upsertPosts(rows);
    upserted += rows.length;
    const cacheResult = await cacheLiveScheduleImages(rows);
    scheduleCached += cacheResult.cached;
    scheduleRows += cacheResult.schedules;
    scheduleFailed += cacheResult.failed;
    scheduleFailures.push(
      ...cacheResult.failures.slice(
        0,
        MAX_REPORTED_FAILURES - scheduleFailures.length
      )
    );

    if (!page.has_next_page || !page.next_cursor) break;
    cursor = page.next_cursor;
    await new Promise((r) => setTimeout(r, 5500));
  }

  const liveCovers = await cacheLiveCoversAfterSync();

  return {
    action: "backfill" as const,
    mode: "timeline" as const,
    pages,
    fetched,
    creditsUsed,
    upserted,
    byType,
    scheduleFlagged,
    scheduleCached,
    scheduleRows,
    scheduleFailed,
    scheduleFailures,
    liveCovers,
    target: BACKFILL_TARGET,
    maxPages: MAX_PAGES,
  };
}

type StopReason = "overlap" | "max_pages" | "end";

async function runIncremental() {
  let pages = 0;
  let fetched = 0;
  let creditsUsed = 0;
  let upserted = 0;
  let newCount = 0;
  let scheduleCached = 0;
  let scheduleRows = 0;
  let scheduleFailed = 0;
  const scheduleFailures: JobFailure[] = [];
  let scheduleFlagged = 0;
  const byType = { tweet: 0, quote: 0, retweet: 0 };

  async function ingest(page: TweetsPage) {
    pages += 1;
    fetched += page.tweets.length;
    creditsUsed += callCredits(page.tweets.length);

    const rows = page.tweets
      .filter((t) => t.isReply !== true)
      .map(mapTweet)
      .filter((r): r is XPostRow => r != null);

    const ids = rows.map((r) => r.tweet_id);
    const existing = await existingIds(ids);
    const pageNew = rows.filter((r) => !existing.has(r.tweet_id)).length;
    newCount += pageNew;

    for (const r of rows) {
      byType[r.post_type] += 1;
      if (r.is_live_schedule) scheduleFlagged += 1;
    }
    await upsertPosts(rows);
    upserted += rows.length;
    const cacheResult = await cacheLiveScheduleImages(rows);
    scheduleCached += cacheResult.cached;
    scheduleRows += cacheResult.schedules;
    scheduleFailed += cacheResult.failed;
    scheduleFailures.push(
      ...cacheResult.failures.slice(
        0,
        MAX_REPORTED_FAILURES - scheduleFailures.length
      )
    );

    return { rows, existing, pageNew };
  }

  async function fromSearch(sinceUnix: number): Promise<StopReason> {
    let cursor = "";
    for (let page = 1; ; page += 1) {
      const res = await fetchSearchPage(sinceUnix, cursor);
      const { pageNew } = await ingest(res);
      // A short page is the last one; fetching the (empty) next page still costs 15 credits.
      if (
        res.tweets.length < SEARCH_FULL_PAGE ||
        !res.has_next_page ||
        !res.next_cursor
      ) {
        return "end";
      }
      if (pageNew === 0) return "overlap";
      if (page >= MAX_PAGES) return "max_pages";
      cursor = res.next_cursor;
      await new Promise((r) => setTimeout(r, 5500));
    }
  }

  async function fromTimeline(): Promise<StopReason> {
    let cursor = "";
    for (let page = 1; ; page += 1) {
      const res = await fetchLastTweetsPage(cursor);
      const { rows, existing, pageNew } = await ingest(res);
      // Feed is newest-first (a pinned post may lead), so a known last item
      // means everything older is already stored — skip the next paid page.
      const oldest = rows[rows.length - 1];
      if (pageNew === 0 || (oldest && existing.has(oldest.tweet_id))) {
        return "overlap";
      }
      if (!res.has_next_page || !res.next_cursor) return "end";
      if (page >= MAX_PAGES) return "max_pages";
      cursor = res.next_cursor;
      await new Promise((r) => setTimeout(r, 5500));
    }
  }

  const now = new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);
  const catchup = now.getUTCHours() === SEARCH_CATCHUP_UTC_HOUR;
  let searchError: string | null = null;
  let timelineReason: "empty_db" | "search_error" | "stale_72h" | null = null;
  let searchMissed = 0;
  let stoppedReason: StopReason = "end";

  const latest = await latestPostedUnix();
  if (latest == null) {
    timelineReason = "empty_db";
  } else {
    try {
      const since = catchup
        ? Math.min(latest + 1, nowUnix - SEARCH_CATCHUP_SECONDS)
        : latest + 1;
      stoppedReason = await fromSearch(since);
    } catch (err) {
      searchError = err instanceof Error ? err.message : String(err);
      if (!catchup || !isFallbackable(err)) {
        throw new Error(`search: ${searchError}`);
      }
      timelineReason = "search_error";
    }
    if (!timelineReason && catchup) {
      const newest = await latestPostedUnix();
      if (newest == null || nowUnix - newest > SEARCH_STALE_SECONDS) {
        timelineReason = "stale_72h";
      }
    }
  }

  if (timelineReason) {
    console.warn("timeline fallback:", timelineReason, searchError ?? "");
    const before = newCount;
    stoppedReason = await fromTimeline();
    if (timelineReason === "stale_72h") searchMissed = newCount - before;
  }

  const liveCovers = await cacheLiveCoversAfterSync();
  const mode: "search" | "timeline" = timelineReason ? "timeline" : "search";

  return {
    action: "incremental" as const,
    mode,
    catchup,
    searchError,
    timelineReason,
    searchMissed,
    pages,
    fetched,
    creditsUsed,
    upserted,
    newCount,
    byType,
    scheduleFlagged,
    scheduleCached,
    scheduleRows,
    scheduleFailed,
    scheduleFailures,
    liveCovers,
    stoppedReason,
    maxPages: MAX_PAGES,
  };
}

Deno.serve(async (req) => {
  try {
    if (!TWITTERAPI_IO_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Missing Edge Function secrets (TWITTERAPI_IO_KEY / SUPABASE_*)",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!X_USER_ID && !X_USER_NAME) {
      return new Response(
        JSON.stringify({ error: "Set X_USER_ID or X_USER_NAME" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action === "backfill") {
      const result = await runBackfill();
      await writeSyncLog({
        source: "edge-x-backfill",
        status: "success",
        message: `Backfill upserted ${result.upserted} posts (${result.pages} pages, schedule ${result.scheduleFlagged}/${result.scheduleCached}, live covers +${result.liveCovers.cached})`,
        saved_count: result.upserted,
        meta: result,
      });
      await reportSyncFailures(result);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "incremental") {
      const result = await runIncremental();
      await writeSyncLog({
        source: "edge-x-incremental",
        status: result.upserted === 0 ? "skipped" : "success",
        message: `Incremental [${result.mode}] upserted ${result.upserted} (new ${result.newCount}, schedule ${result.scheduleFlagged}/${result.scheduleCached}, live covers +${result.liveCovers.cached}, stop=${result.stoppedReason}) · ~${result.creditsUsed} credits`,
        saved_count: result.upserted,
        meta: result,
      });
      await reportSyncFailures(result);
      if (result.timelineReason === "search_error") {
        await writeSyncLog({
          source: "edge-x-search-error",
          status: "error",
          message: `Search failed, used timeline fallback: ${result.searchError}`,
        });
      }
      if (result.searchMissed > 0) {
        await writeSyncLog({
          source: "edge-x-search-gap",
          status: "error",
          message: `Search found no posts for 72h, timeline check found ${result.searchMissed} new post(s)`,
          saved_count: result.searchMissed,
        });
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "credits") {
      const credits = await fetchAccountCredits();
      return new Response(JSON.stringify({ success: true, action, ...credits }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "live-covers") {
      const result = await cacheLiveCoversFromStored();
      const summary = `Live covers scanned ${result.scanned} posts, matched ${result.matched}, cached +${result.cached}`;
      await writeSyncLog({
        source: "edge-x-live-covers",
        status:
          result.failed > 0 ? "error" : result.cached === 0 ? "skipped" : "success",
        message:
          result.failed > 0
            ? `${summary} · ${failureMessage("Live covers", result.failed, result.failures)}`
            : summary,
        saved_count: result.cached,
        meta: result,
      });
      return new Response(
        JSON.stringify({ success: true, action, ...result }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    await writeSyncLog({
      source: "edge-x-unknown",
      status: "error",
      message: 'Invalid action. Use "backfill", "incremental", "live-covers" or "credits".',
    });

    return new Response(
      JSON.stringify({
        error: 'Invalid action. Use "backfill", "incremental", "live-covers" or "credits".',
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    await writeSyncLog({
      source: "edge-x-error",
      status: "error",
      message,
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
