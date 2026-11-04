import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import {
  sortNotices,
  sortTapes,
  type CafeFeed,
  type CafeFeedState,
  type CafeFeeds,
  type CafeNotice,
  type CafeTape,
} from "@/lib/cafe-feeds";

/** Tables live in schema mild_r (migration 20261104150000_cafe_feeds.sql); read through these views. */
const POSTS = "mild_r_cafe_x_posts";
const TAPES = "mild_r_cafe_tapes";
const STATE = "mild_r_cafe_feed_state";

type PostRow = {
  tweet_id: string;
  text: string;
  media_urls: string[] | null;
  url: string | null;
  posted_at: string;
  pinned: boolean;
  hidden: boolean;
};
type TapeRow = {
  video_id: string;
  title: string;
  published_at: string;
  duration_seconds: number | null;
  is_short: boolean;
  thumbnail_url: string | null;
  hidden: boolean;
};
type StateRow = {
  feed: CafeFeed;
  auto_sync: boolean;
  last_synced_at: string | null;
  last_count: number | null;
  last_error: string | null;
};

const POST_COLS = "tweet_id, text, media_urls, url, posted_at, pinned, hidden";
const TAPE_COLS = "video_id, title, published_at, duration_seconds, is_short, thumbnail_url, hidden";

function toNotice(row: PostRow): CafeNotice {
  return {
    id: row.tweet_id,
    text: row.text ?? "",
    mediaUrls: row.media_urls ?? [],
    url: row.url ?? `https://x.com/i/status/${row.tweet_id}`,
    postedAt: row.posted_at,
    pinned: row.pinned,
    hidden: row.hidden,
  };
}

function toTape(row: TapeRow): CafeTape {
  return {
    id: row.video_id,
    title: row.title,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
    isShort: row.is_short,
    thumbnailUrl: row.thumbnail_url,
    hidden: row.hidden,
  };
}

/**
 * What the public `/cafe` shows: rows not hidden, pinned post first.
 * Empty (never an error) when Supabase is missing or the migration has not run.
 * Cached per request: the layout (menu links) and the page read it together.
 */
export const loadCafeFeeds = cache(async (): Promise<CafeFeeds> => {
  if (!isSupabaseConfigured()) return { notices: [], tapes: [] };
  try {
    const supabase = createPublicClient();
    const [posts, tapes] = await Promise.all([
      supabase.from(POSTS).select(POST_COLS).eq("hidden", false).order("posted_at", { ascending: false }).limit(60),
      supabase.from(TAPES).select(TAPE_COLS).eq("hidden", false).order("published_at", { ascending: false }).limit(40),
    ]);
    if (posts.error) console.error("[cafe_feeds] posts", posts.error.message);
    if (tapes.error) console.error("[cafe_feeds] tapes", tapes.error.message);
    return {
      notices: sortNotices(((posts.data ?? []) as PostRow[]).map(toNotice)),
      tapes: sortTapes(((tapes.data ?? []) as TapeRow[]).map(toTape)),
    };
  } catch (error) {
    console.error("[cafe_feeds]", error);
    return { notices: [], tapes: [] };
  }
});

export type CafeFeedsAdmin = CafeFeeds & { state: CafeFeedState[]; ready: boolean };

/** Everything, hidden rows included, plus pull state — for /cafe/settings. */
export async function loadCafeFeedsAdmin(): Promise<CafeFeedsAdmin> {
  const supabase = createAdminClient();
  const [posts, tapes, state] = await Promise.all([
    supabase.from(POSTS).select(POST_COLS).order("posted_at", { ascending: false }).limit(200),
    supabase.from(TAPES).select(TAPE_COLS).order("published_at", { ascending: false }).limit(200),
    supabase.from(STATE).select("feed, auto_sync, last_synced_at, last_count, last_error"),
  ]);
  const ready = !posts.error && !tapes.error && !state.error;
  return {
    ready,
    notices: sortNotices(((posts.data ?? []) as PostRow[]).map(toNotice)),
    tapes: sortTapes(((tapes.data ?? []) as TapeRow[]).map(toTape)),
    state: ((state.data ?? []) as StateRow[]).map((row) => ({
      feed: row.feed,
      autoSync: row.auto_sync,
      lastSyncedAt: row.last_synced_at,
      lastCount: row.last_count,
      lastError: row.last_error,
    })),
  };
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Pin one post (the old pin is cleared first: one pinned post at most). */
export async function setNoticePinned(id: string, pinned: boolean) {
  const supabase = createAdminClient();
  if (pinned) {
    check((await supabase.from(POSTS).update({ pinned: false }).eq("pinned", true).neq("tweet_id", id)).error);
  }
  check((await supabase.from(POSTS).update({ pinned }).eq("tweet_id", id)).error);
}

export async function setNoticeHidden(id: string, hidden: boolean) {
  check((await createAdminClient().from(POSTS).update({ hidden }).eq("tweet_id", id)).error);
}

export async function setTapeHidden(id: string, hidden: boolean) {
  check((await createAdminClient().from(TAPES).update({ hidden }).eq("video_id", id)).error);
}

export async function setFeedAutoSync(feed: CafeFeed, autoSync: boolean) {
  check(
    (await createAdminClient().from(STATE).update({ auto_sync: autoSync, updated_at: new Date().toISOString() }).eq("feed", feed))
      .error
  );
}

/** Runs the edge function now ("ดึงตอนนี้"), whatever the auto-sync switch says. */
export async function runCafeFeedSync(feeds: CafeFeed[]) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base || !key) throw new Error("Supabase is not configured");
  const res = await fetch(`${base.replace(/\/$/, "")}/functions/v1/cafe-feed-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ action: "sync", source: "manual", feeds }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { results?: Record<string, { ok?: boolean; error?: string; count?: number }> };
  if (res.status === 404) throw new Error("ยังไม่ได้ deploy ฟังก์ชัน cafe-feed-sync");
  const failed = Object.entries(body.results ?? {}).filter(([, r]) => r.ok === false);
  if (!res.ok && !failed.length) throw new Error(`cafe-feed-sync HTTP ${res.status}`);
  if (failed.length) throw new Error(failed.map(([feed, r]) => `${feed}: ${r.error}`).join(" · "));
  return body.results ?? {};
}
