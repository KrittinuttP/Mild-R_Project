import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWITTERAPI_IO_KEY = Deno.env.get("TWITTERAPI_IO_KEY") || "";
const X_USER_ID = Deno.env.get("X_USER_ID") || "";
const X_USER_NAME = Deno.env.get("X_USER_NAME") || "MildRWorldEnd";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const API_BASE = "https://api.twitterapi.io/twitter/user/last_tweets";
const MAX_PAGES = 3;
const BACKFILL_TARGET = 60;
const MEDIA_BUCKET = "x-media";
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

async function fetchLastTweetsPage(cursor: string): Promise<{
  tweets: ApiTweet[];
  has_next_page: boolean;
  next_cursor: string;
}> {
  const params = new URLSearchParams({
    includeReplies: "false",
    cursor,
  });
  if (X_USER_ID) {
    params.set("userId", X_USER_ID);
  } else {
    params.set("userName", X_USER_NAME);
  }

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: { "X-API-Key": TWITTERAPI_IO_KEY },
  });

  const body = (await res.json().catch(() => ({}))) as LastTweetsResponse;
  if (!res.ok) {
    const msg =
      body.message || body.msg || `twitterapi.io HTTP ${res.status}`;
    throw new Error(msg);
  }

  const tweets = body.tweets ?? body.data?.tweets ?? [];
  const has_next_page = Boolean(
    body.has_next_page ?? body.data?.has_next_page
  );
  const next_cursor =
    body.next_cursor ?? body.data?.next_cursor ?? "";

  return { tweets, has_next_page, next_cursor };
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

async function upsertPosts(rows: XPostRow[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("mild_r_x_posts").upsert(rows, {
    onConflict: "tweet_id",
  });
  if (error) throw error;
}

/** Download Live Schedule poster into Storage when needed. */
async function cacheLiveScheduleImages(rows: XPostRow[]) {
  let cached = 0;
  let schedules = 0;
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
      continue;
    }

    try {
      const imgRes = await fetch(sourceUrl, {
        headers: { Accept: "image/*" },
      });
      if (!imgRes.ok) {
        console.error(
          `schedule image fetch ${row.tweet_id}: HTTP ${imgRes.status}`
        );
        continue;
      }
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
      if (upErr) {
        console.error(`schedule image upload ${row.tweet_id}:`, upErr.message);
        continue;
      }

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

      if (updErr) {
        console.error(`schedule image update ${row.tweet_id}:`, updErr.message);
        continue;
      }
      cached += 1;

      const ensured = await ensureXLiveScheduleRow({
        tweet_id: row.tweet_id,
        image_url: pub.publicUrl,
        image_source_url: sourceUrl,
        posted_at: row.posted_at,
      });
      if (ensured === "inserted" || ensured === "updated") schedules += 1;
    } catch (err) {
      console.error(
        `schedule image ${row.tweet_id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
  return { cached, schedules };
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
}

async function runBackfill() {
  let cursor = "";
  let pages = 0;
  let fetched = 0;
  let upserted = 0;
  let scheduleCached = 0;
  let scheduleRows = 0;
  let scheduleFlagged = 0;
  const byType = { tweet: 0, quote: 0, retweet: 0 };

  while (pages < MAX_PAGES && upserted < BACKFILL_TARGET) {
    const page = await fetchLastTweetsPage(cursor);
    pages += 1;
    fetched += page.tweets.length;

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

    if (!page.has_next_page || !page.next_cursor) break;
    cursor = page.next_cursor;
    await new Promise((r) => setTimeout(r, 5500));
  }

  return {
    action: "backfill" as const,
    pages,
    fetched,
    upserted,
    byType,
    scheduleFlagged,
    scheduleCached,
    scheduleRows,
    target: BACKFILL_TARGET,
    maxPages: MAX_PAGES,
  };
}

async function runIncremental() {
  let cursor = "";
  let pages = 0;
  let fetched = 0;
  let upserted = 0;
  let newCount = 0;
  let scheduleCached = 0;
  let scheduleRows = 0;
  let scheduleFlagged = 0;
  const byType = { tweet: 0, quote: 0, retweet: 0 };
  let stoppedReason: "overlap" | "max_pages" | "end" = "end";

  while (pages < MAX_PAGES) {
    const page = await fetchLastTweetsPage(cursor);
    pages += 1;
    fetched += page.tweets.length;

    const rows = page.tweets
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

    if (pageNew === 0) {
      stoppedReason = "overlap";
      break;
    }
    if (!page.has_next_page || !page.next_cursor) {
      stoppedReason = "end";
      break;
    }
    if (pages >= MAX_PAGES) {
      stoppedReason = "max_pages";
      break;
    }
    cursor = page.next_cursor;
    await new Promise((r) => setTimeout(r, 5500));
  }

  if (pages >= MAX_PAGES && stoppedReason === "end") {
    stoppedReason = "max_pages";
  }

  return {
    action: "incremental" as const,
    pages,
    fetched,
    upserted,
    newCount,
    byType,
    scheduleFlagged,
    scheduleCached,
    scheduleRows,
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
        message: `Backfill upserted ${result.upserted} posts (${result.pages} pages, schedule ${result.scheduleFlagged}/${result.scheduleCached})`,
        saved_count: result.upserted,
        meta: result,
      });
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "incremental") {
      const result = await runIncremental();
      await writeSyncLog({
        source: "edge-x-incremental",
        status: result.upserted === 0 ? "skipped" : "success",
        message: `Incremental upserted ${result.upserted} (new ${result.newCount}, schedule ${result.scheduleFlagged}/${result.scheduleCached}, stop=${result.stoppedReason})`,
        saved_count: result.upserted,
        meta: result,
      });
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await writeSyncLog({
      source: "edge-x-unknown",
      status: "error",
      message: 'Invalid action. Use "backfill" or "incremental".',
    });

    return new Response(
      JSON.stringify({
        error: 'Invalid action. Use "backfill" or "incremental".',
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
