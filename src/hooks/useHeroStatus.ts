"use client";

import { useLiveSlots } from "@/hooks/useLiveSlots";
import { useNow } from "@/hooks/useNow";
import {
  actualStartMs,
  isNearStart,
  pickNextSlotAfter,
  pickTodaySlots,
  slotTimeLabel,
} from "@/lib/live-today";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { addDaysYmd, daysSinceDebut, nextMilestone, type Milestone } from "@/lib/milestones";
import type { LiveSlot } from "@/types/vtuber";

/** How far ahead the hero looks for the next live when there is none today. */
const LOOKAHEAD_DAYS = 14;
/** X posts older than this are not shown — the corner falls back to FOLLOW · X. */
const POST_MAX_AGE_MS = 48 * 60 * 60 * 1000;
/** The hero itself only needs to re-render this often; the live clock ticks in its own component. */
const TICK_MS = 30_000;

/** Post text for the ticker: links (t.co …) removed, whitespace collapsed. */
export function cleanPostText(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

export type HeroPremiere = { title: string; url: string; startIso: string };
export type HeroPost = { text: string; url: string; postedAt: string };

export type HeroLive =
  | { kind: "onair"; title: string; url: string | null; sinceMs: number | null }
  | { kind: "today"; title: string; time: string | null }
  | {
      kind: "offline";
      /** A live already happened (and ended) today → just "OFFLINE", not "TODAY · OFFLINE". */
      endedToday: boolean;
      next: { title: string; dateLabel: string; time: string | null } | null;
    };

export type HeroCorner =
  | { kind: "premiere"; title: string; url: string; dateLabel: string; whenLabel: string }
  | { kind: "post"; today: boolean; dateLabel: string; text: string; url: string }
  | { kind: "follow" };

export type HeroStatus = {
  day: number;
  milestone: Milestone;
  live: HeroLive;
  corner: HeroCorner;
};

const BKK = "Asia/Bangkok";
const upper = (s: string) => s.replace(/,/g, "").toUpperCase();

/** "WED 28 OCT" for a `YYYY-MM-DD` slot date. */
function slotDateLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  return upper(fmt.format(date));
}

/** "THU 29 OCT" / "21:00" in Bangkok time. */
function bangkokLabels(ms: number) {
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: BKK, weekday: "short", day: "numeric", month: "short" });
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: BKK, hour: "2-digit", minute: "2-digit", hour12: false });
  const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: BKK, day: "numeric", month: "short" });
  return { date: upper(date.format(ms)), time: time.format(ms), dayMonth: upper(dayMonth.format(ms)) };
}

function slotTitle(slot: LiveSlot) {
  return slot.titleLocal ?? slot.title;
}

/**
 * Everything the hero monitor shows, recomputed every 30 s (and on each schedule fetch) on the client.
 * `null` on the server / first paint (time-dependent — avoids hydration mismatch).
 */
export function useHeroStatus({
  debutDate,
  birthday,
  initialSlots,
  premieres,
  posts,
}: {
  debutDate: string;
  birthday?: string;
  /** Server-rendered schedule so the corner fills before the first fetch. */
  initialSlots: LiveSlot[];
  premieres: HeroPremiere[];
  posts: HeroPost[];
}): HeroStatus | null {
  const nowMs = useNow(TICK_MS);
  const today = nowMs === null ? null : bangkokDateFromIso(new Date(nowMs).toISOString());
  const until = today ? addDaysYmd(today, LOOKAHEAD_DAYS) : null;

  const fetched = useLiveSlots(today, until, (slots) =>
    Boolean(
      today && nowMs !== null && pickTodaySlots(slots, today, nowMs).some((s) => s.status === "live" || isNearStart(s, nowMs))
    )
  );

  if (nowMs === null || !today) return null;
  const slots = fetched ?? initialSlots ?? [];

  // --- live (top-right) ---
  const first = pickTodaySlots(slots, today, nowMs)[0] ?? null;
  let live: HeroLive;
  if (first?.status === "live") {
    live = { kind: "onair", title: slotTitle(first), url: first.url ?? null, sinceMs: actualStartMs(first) };
  } else if (first) {
    live = { kind: "today", title: slotTitle(first), time: slotTimeLabel(first) };
  } else {
    const next = pickNextSlotAfter(slots, today);
    live = {
      kind: "offline",
      endedToday: slots.some((s) => s.date === today && s.status === "ended"),
      next: next ? { title: slotTitle(next), dateLabel: slotDateLabel(next.date), time: slotTimeLabel(next) } : null,
    };
  }

  // --- recommendation (bottom-right): premiere › X post within 48 h › follow ---
  let corner: HeroCorner = { kind: "follow" };
  const premiere = premieres
    .map((p) => ({ ...p, ms: Date.parse(p.startIso) }))
    .filter((p) => Number.isFinite(p.ms) && p.ms > nowMs)
    .sort((a, b) => a.ms - b.ms)[0];
  if (premiere) {
    const at = bangkokLabels(premiere.ms);
    corner = {
      kind: "premiere",
      title: premiere.title,
      url: premiere.url,
      dateLabel: at.date,
      whenLabel: `${at.date} ${at.time}`,
    };
  } else {
    const post = posts
      .map((p) => ({ ...p, text: cleanPostText(p.text), ms: Date.parse(p.postedAt) }))
      .filter((p) => Number.isFinite(p.ms) && nowMs - p.ms <= POST_MAX_AGE_MS && p.text)
      .sort((a, b) => b.ms - a.ms)[0];
    if (post) {
      corner = {
        kind: "post",
        today: bangkokDateFromIso(new Date(post.ms).toISOString()) === today,
        dateLabel: bangkokLabels(post.ms).dayMonth,
        text: post.text,
        url: post.url,
      };
    }
  }

  return {
    day: daysSinceDebut(debutDate, today),
    milestone: nextMilestone(debutDate, birthday, today),
    live,
    corner,
  };
}
