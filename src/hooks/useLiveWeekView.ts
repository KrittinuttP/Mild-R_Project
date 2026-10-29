"use client";

import { useMemo, useState } from "react";

import {
  findDefaultWeekIndex,
  formatISODate,
  sortLiveWeeks,
  weekDayDates,
  weekOverlapsYmdRange,
} from "@/lib/events";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import type { LiveOfflineDay, LiveSlot, LiveWeek } from "@/types/vtuber";

/** Spotlight highlight: only slots on today's Bangkok date. */
function findTodayHighlightSlot(week: LiveWeek, todayIso: string): LiveSlot | null {
  if (!week?.slots?.length) return null;

  const todaySlots = week.slots
    .filter((s) => s.date === todayIso && s.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todaySlots.length === 0) return null;

  return (
    todaySlots.find((s) => s.status === "live") ??
    todaySlots.find((s) => s.status === "upcoming") ??
    [...todaySlots].reverse().find((s) => s.status === "ended") ??
    todaySlots[0]
  );
}

/** Next upcoming/live slot after today (current week, then optional pool). */
function findNextHighlightSlot(week: LiveWeek, todayIso: string, allSlots?: LiveSlot[]): LiveSlot | null {
  const pool = allSlots?.length ? allSlots : (week.slots ?? []);
  const candidates = pool
    .filter((s) => s.date > todayIso && s.status !== "cancelled" && (s.status === "upcoming" || s.status === "live"))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return candidates[0] ?? null;
}

function byDate<T extends { date: string }>(items: T[] | undefined) {
  const map = new Map<string, T>();
  for (const item of items ?? []) map.set(item.date, item);
  return map;
}

/**
 * Week-by-week view of the live schedule, shared by the /live table and the home board:
 * which weeks can be flipped through, the week on screen, slots per day, and the
 * spotlight (today's live, or the next one after today).
 */
export function useLiveWeekView({
  weeks,
  slotLookup,
  weekRange,
}: {
  weeks: LiveWeek[];
  /** All slots for reschedule / next-live lookups (defaults to slots in `weeks`). */
  slotLookup?: LiveSlot[];
  /** Clamp the week picker to the loaded schedule window (e.g. homepage 2-week range). */
  weekRange?: { from: string; to: string };
}) {
  const sorted = useMemo(() => sortLiveWeeks(weeks), [weeks]);
  const visibleWeeks = useMemo(() => {
    if (!weekRange) return sorted;
    return sorted.filter((week) => weekOverlapsYmdRange(week.weekStart, weekRange.from, weekRange.to));
  }, [sorted, weekRange]);

  const todayIso = bangkokDateFromIso(new Date().toISOString()) ?? formatISODate(new Date());

  /** Weeks user can flip through: current week always, others only if they have lives. */
  const navigableWeeks = useMemo(() => {
    const filtered = visibleWeeks.filter((week) => {
      const days = weekDayDates(week.weekStart);
      if (days.includes(todayIso)) return true;
      return week.slots.length > 0;
    });
    if (filtered.length > 0) return filtered;

    // Ensure at least one week shell so empty state still renders
    if (visibleWeeks.length > 0) return [visibleWeeks[0]];
    return sorted.slice(0, 1);
  }, [visibleWeeks, sorted, todayIso]);

  const [index, setIndex] = useState(() => findDefaultWeekIndex(navigableWeeks));
  const [indexWeeks, setIndexWeeks] = useState(navigableWeeks);
  if (indexWeeks !== navigableWeeks) {
    setIndexWeeks(navigableWeeks);
    setIndex(findDefaultWeekIndex(navigableWeeks));
  }

  /** Week containing today — spotlight banner stays pinned here while grid navigates. */
  const currentWeek = useMemo(() => {
    const hit = navigableWeeks.find((w) => weekDayDates(w.weekStart).includes(todayIso));
    return hit ?? navigableWeeks[findDefaultWeekIndex(navigableWeeks)] ?? null;
  }, [navigableWeeks, todayIso]);

  const safeIndex = Math.min(Math.max(index, 0), Math.max(navigableWeeks.length - 1, 0));
  /** Week shown in the 7-day grid (changes with arrows). */
  const week: LiveWeek | undefined = navigableWeeks[safeIndex];
  const dayIsos = week ? weekDayDates(week.weekStart) : [];

  const slotsByDate = useMemo(() => {
    const map = new Map<string, LiveSlot[]>();
    if (!week) return map;
    for (const slot of week.slots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [week]);

  const allSlots = useMemo(() => slotLookup ?? sorted.flatMap((w) => w.slots), [slotLookup, sorted]);
  const offlineByDate = useMemo(() => byDate<LiveOfflineDay>(week?.offlineDays), [week]);
  const currentOfflineByDate = useMemo(() => byDate<LiveOfflineDay>(currentWeek?.offlineDays), [currentWeek]);

  const highlightSlot = useMemo(
    () => (currentWeek ? findTodayHighlightSlot(currentWeek, todayIso) : null),
    [currentWeek, todayIso]
  );
  const nextHighlightSlot = useMemo(
    () => (currentWeek && !highlightSlot ? findNextHighlightSlot(currentWeek, todayIso, allSlots) : null),
    [currentWeek, highlightSlot, todayIso, allSlots]
  );

  return {
    todayIso,
    navigableWeeks,
    safeIndex,
    canPrev: safeIndex > 0,
    canNext: safeIndex < navigableWeeks.length - 1,
    prev: () => setIndex((value) => Math.max(0, value - 1)),
    next: () => setIndex((value) => Math.min(navigableWeeks.length - 1, value + 1)),
    /** Jump back to the week that holds today (homepage "วันนี้" button). */
    goToCurrentWeek: () => setIndex(findDefaultWeekIndex(navigableWeeks)),
    week,
    currentWeek,
    viewingCurrentWeek: Boolean(week && currentWeek && week.weekStart === currentWeek.weekStart),
    dayIsos,
    slotsByDate,
    allSlots,
    offlineByDate,
    currentOfflineByDate,
    highlightSlot,
    nextHighlightSlot,
  };
}
