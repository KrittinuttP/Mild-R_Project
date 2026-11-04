/**
 * Cafe page feeds — shared types and display helpers (client-safe).
 * Notice Board = posts of X @Mild_Honeycomb · Case Tapes = YouTube @Mild-HoneycombProject.
 * Filled every night (00:00 Bangkok) by the edge function `cafe-feed-sync`.
 */

export const CAFE_X_HANDLE = "Mild_Honeycomb";
export const CAFE_X_URL = `https://x.com/${CAFE_X_HANDLE}`;
export const CAFE_YOUTUBE_HANDLE = "@Mild-HoneycombProject";
export const CAFE_YOUTUBE_NAME = "Honeycomb Project";
export const CAFE_YOUTUBE_URL = `https://www.youtube.com/${CAFE_YOUTUBE_HANDLE}`;

/** Notice cards shown before "ดูประกาศทั้งหมด" — desktop 1 big + 3 small, phone 3. */
export const NOTICE_PREVIEW_DESKTOP = 4;
export const NOTICE_PREVIEW_MOBILE = 3;
/** Latest tape big + this many in the list beside it. */
export const TAPES_LISTED = 4;

export type CafeFeed = "x" | "youtube";

export type CafeNotice = {
  id: string;
  text: string;
  mediaUrls: string[];
  url: string;
  postedAt: string;
  pinned: boolean;
  hidden: boolean;
};

export type CafeTape = {
  id: string;
  title: string;
  publishedAt: string;
  durationSeconds: number | null;
  isShort: boolean;
  thumbnailUrl: string | null;
  hidden: boolean;
};

export type CafeFeedState = {
  feed: CafeFeed;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastCount: number | null;
  lastError: string | null;
};

export type CafeFeeds = { notices: CafeNotice[]; tapes: CafeTape[] };

/** Pinned first, then newest. */
export function sortNotices(notices: CafeNotice[]) {
  return [...notices].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.postedAt) - Date.parse(a.postedAt)
  );
}

export function sortTapes(tapes: CafeTape[]) {
  return [...tapes].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "Mon, 02 Nov 2026" in Bangkok time. */
export function feedDate(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const parts = Object.fromEntries(DATE.formatToParts(ms).map((p) => [p.type, p.value]));
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
}

/** "Wed, 04 Nov 2026 00:00" in Bangkok time. */
export function feedDateTime(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const parts = Object.fromEntries(DATE_TIME.formatToParts(ms).map((p) => [p.type, p.value]));
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year} ${parts.hour}:${parts.minute}`;
}

/** "30 Oct" in Bangkok time, for small cards. */
export function feedDayMonth(iso: string) {
  return feedDate(iso).slice(5, 11);
}

/** "1:12" / "58:20" / "1:02:03". */
export function tapeDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** First line of a post, for lists. */
export function noticeHeadline(text: string) {
  return text.split("\n").find((line) => line.trim())?.trim() ?? "";
}
