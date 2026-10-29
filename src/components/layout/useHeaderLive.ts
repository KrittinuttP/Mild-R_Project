"use client";

import { useLiveSlots } from "@/hooks/useLiveSlots";
import { useNow } from "@/hooks/useNow";
import { formatISODate, parseISODate, startOfWeekSunday, weekDayDates } from "@/lib/events";
import { getSlotCoverUrl } from "@/lib/live-cover";
import {
  actualStartMs,
  formatClock,
  HOUR_MS,
  isNearStart,
  pickTodaySlots,
  slotStartMs,
  slotTimeLabel,
} from "@/lib/live-today";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import type { LiveSlot } from "@/types/vtuber";

/** later = today, more than an hour away · soon = under an hour · waiting = start passed, not live yet. */
export type HeaderLiveState = "live" | "soon" | "waiting" | "later";

export type HeaderLive = {
  slot: LiveSlot;
  state: HeaderLiveState;
  /** "19:00" */
  time: string | null;
  title: string;
  /** Countdown (soon) or time live (live); `null` otherwise. */
  clock: string | null;
  /** More lives later today. */
  extra: number;
  coverUrl: string | null;
  href: string;
  external: boolean;
};

export type HeaderWeekDay = { iso: string; hasLive: boolean; isToday: boolean };

export type HeaderWeek = { days: HeaderWeekDay[]; count: number };

/**
 * This week's lives (Sunday–Saturday, Bangkok) for the header: today's next live for
 * the pill and the mobile live card, plus per-day dots for the mobile Live tile.
 */
export function useHeaderLive(liveHref: string): { live: HeaderLive | null; week: HeaderWeek | null } {
  const nowMs = useNow(1000);
  const today = nowMs === null ? null : bangkokDateFromIso(new Date(nowMs).toISOString());
  const days = today ? weekDayDates(formatISODate(startOfWeekSunday(parseISODate(today)))) : null;

  const slots = useLiveSlots(days?.[0] ?? null, days?.[6] ?? null, (all) =>
    Boolean(today && nowMs !== null && pickTodaySlots(all, today, nowMs).some((slot) => isNearStart(slot, nowMs)))
  );

  if (!today || nowMs === null || !days || !slots) return { live: null, week: null };

  const inWeek = slots.filter((slot) => days.includes(slot.date) && slot.status !== "cancelled");
  const week: HeaderWeek = {
    days: days.map((iso) => ({
      iso,
      hasLive: inWeek.some((slot) => slot.date === iso),
      isToday: iso === today,
    })),
    count: inWeek.length,
  };

  const todaySlots = pickTodaySlots(slots, today, nowMs);
  const slot = todaySlots[0];
  if (!slot) return { live: null, week };

  const isLive = slot.status === "live";
  const startMs = slotStartMs(slot);
  const untilStart = !isLive && startMs !== null ? startMs - nowMs : null;
  const state: HeaderLiveState = isLive
    ? "live"
    : untilStart !== null && untilStart <= 0
      ? "waiting"
      : untilStart !== null && untilStart < HOUR_MS
        ? "soon"
        : "later";
  const liveSinceMs = isLive ? actualStartMs(slot) : null;
  const clock =
    state === "live" && liveSinceMs !== null && nowMs >= liveSinceMs
      ? formatClock(nowMs - liveSinceMs)
      : state === "soon" && untilStart !== null
        ? formatClock(untilStart)
        : null;
  const external = Boolean(isLive && slot.url);

  return {
    live: {
      slot,
      state,
      time: slotTimeLabel(slot),
      title: slot.titleLocal ?? slot.title,
      clock,
      extra: todaySlots.length - 1,
      coverUrl: getSlotCoverUrl(slot),
      href: external ? slot.url! : liveHref,
      external,
    },
    week,
  };
}
