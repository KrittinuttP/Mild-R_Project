import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventStatus,
  EventsBoard,
  EventVideoKind,
  LiveSlot,
  LiveWeek,
} from "@/types/vtuber";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as local calendar date at noon (avoids TZ edge flips). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sunday of the week containing `date` (local). */
export function startOfWeekSunday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  const day = copy.getDay(); // 0 Sun … 6 Sat
  copy.setDate(copy.getDate() - day);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

const TH_WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."] as const;
const TH_WEEKDAYS_FULL = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
] as const;

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export function thaiWeekdayShort(date: Date): string {
  const day = date.getDay();
  const index = day === 0 ? 6 : day - 1;
  return TH_WEEKDAYS[index] ?? "";
}

export function thaiWeekdayFull(date: Date): string {
  const day = date.getDay();
  const index = day === 0 ? 6 : day - 1;
  return TH_WEEKDAYS_FULL[index] ?? "";
}

export function thaiMonthName(monthIndex: number): string {
  return TH_MONTHS[monthIndex] ?? "";
}

export function formatThaiShortDate(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

const TH_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/** "9 ส.ค. 2026" — built by hand so server and browser ICU never disagree. */
export function formatThaiDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS_SHORT[(m ?? 1) - 1]} ${y}`;
}

/** "14–15 ก.พ. 2026", "22 ก.ย. – 10 ต.ค. 2026", or a single date. */
export function formatThaiDateRange(start: string, end?: string): string {
  if (!end || end === start) return formatThaiDate(start);
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  if (y1 !== y2) return `${formatThaiDate(start)} – ${formatThaiDate(end)}`;
  if (m1 !== m2) {
    return `${d1} ${TH_MONTHS_SHORT[m1 - 1]} – ${d2} ${TH_MONTHS_SHORT[m2 - 1]} ${y2}`;
  }
  return `${d1}–${d2} ${TH_MONTHS_SHORT[m2 - 1]} ${y2}`;
}

export function formatEventDateRange(
  event: Pick<CalendarEvent, "date" | "endDate">
): string {
  return formatThaiDateRange(event.date, event.endDate);
}

/** English short date like birthday style + year, e.g. "23 May 2024" */
export function formatEnglishDate(iso: string): string {
  const date = parseISODate(iso);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function sortLiveWeeks(weeks: LiveWeek[]): LiveWeek[] {
  return [...weeks].sort((a, b) =>
    a.weekStart < b.weekStart ? -1 : a.weekStart > b.weekStart ? 1 : 0
  );
}

/** Prefer the week containing today; else nearest past; else first upcoming. */
export function findDefaultWeekIndex(
  weeks: LiveWeek[],
  today = new Date()
): number {
  if (weeks.length === 0) return 0;
  const sorted = sortLiveWeeks(weeks);
  const todayIso = formatISODate(today);
  const sundayIso = formatISODate(startOfWeekSunday(today));

  const exact = sorted.findIndex((week) => week.weekStart === sundayIso);
  if (exact >= 0) return exact;

  let past = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].weekStart <= todayIso) past = i;
  }
  if (past >= 0) return past;
  return 0;
}

export function weekDayDates(weekStartIso: string): string[] {
  const start = parseISODate(weekStartIso);
  return Array.from({ length: 7 }, (_, i) => formatISODate(addDays(start, i)));
}

export function flattenLiveSlots(weeks: LiveWeek[]): LiveSlot[] {
  const map = new Map<string, LiveSlot>();
  for (const week of weeks) {
    for (const slot of week.slots) {
      map.set(slot.id, slot);
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.time.localeCompare(b.time);
  });
}

export function slotsByDateMap(slots: LiveSlot[]): Map<string, LiveSlot[]> {
  const map = new Map<string, LiveSlot[]>();
  for (const slot of slots) {
    const list = map.get(slot.date) ?? [];
    list.push(slot);
    map.set(slot.date, list);
  }
  return map;
}

export function availableLiveYears(
  slots: LiveSlot[],
  fallbackYear?: number
): number[] {
  const years = new Set<number>();
  for (const slot of slots) {
    years.add(parseISODate(slot.date).getFullYear());
  }
  if (fallbackYear != null) years.add(fallbackYear);
  return [...years].sort((a, b) => a - b);
}

/** Fixed year list for calendar picker (not derived from live data). */
export function calendarYearOptions(
  todayYear: number,
  past = 5,
  future = 1
): number[] {
  const years: number[] = [];
  for (let y = todayYear - past; y <= todayYear + future; y++) years.push(y);
  return years;
}

export function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Inclusive Bangkok calendar-day range (YYYY-MM-DD strings). */
export function isYmdInInclusiveRange(
  ymd: string,
  from: string,
  to: string
): boolean {
  return ymd >= from && ymd <= to;
}

/** True when the Sun–Sat week containing `weekStart` overlaps [from, to]. */
export function weekOverlapsYmdRange(
  weekStart: string,
  from: string,
  to: string
): boolean {
  const weekEnd = formatISODate(addDays(parseISODate(weekStart), 6));
  return weekStart <= to && weekEnd >= from;
}

/** Keep only weeks (and their slots) that fall within the fetch window. */
export function clipLiveWeeksToRange(
  weeks: LiveWeek[],
  from: string,
  to: string
): LiveWeek[] {
  return weeks
    .filter((week) => weekOverlapsYmdRange(week.weekStart, from, to))
    .map((week) => ({
      ...week,
      slots: week.slots.filter((slot) =>
        isYmdInInclusiveRange(slot.date, from, to)
      ),
    }))
    .filter((week) => week.slots.length > 0);
}

/** Sunday–Saturday of the week containing `today`. */
export function thisWeekRangeYmd(today = new Date()): {
  from: string;
  to: string;
} {
  const sunday = startOfWeekSunday(today);
  return {
    from: formatISODate(sunday),
    to: formatISODate(addDays(sunday, 6)),
  };
}

/** This week + next week (14 days), Sunday-start. */
export function thisAndNextWeekRangeYmd(today = new Date()): {
  from: string;
  to: string;
} {
  const sunday = startOfWeekSunday(today);
  return {
    from: formatISODate(sunday),
    to: formatISODate(addDays(sunday, 13)),
  };
}

/** Previous + this + next week (21 days), Sunday-start — for week spotlight nav. */
export function surroundingWeeksRangeYmd(today = new Date()): {
  from: string;
  to: string;
} {
  const sunday = startOfWeekSunday(today);
  return {
    from: formatISODate(addDays(sunday, -7)),
    to: formatISODate(addDays(sunday, 13)),
  };
}

/** Same as `surroundingWeeksRangeYmd`, anchored to today in Asia/Bangkok (server-safe). */
export function surroundingWeeksRangeYmdBangkok(now = new Date()): {
  from: string;
  to: string;
} {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  return surroundingWeeksRangeYmd(new Date(y, m - 1, d, 12));
}

/**
 * Data-fetch window for a selected calendar month (independent of grid UI).
 * Inclusive Bangkok YMD: first of month − padDays … last of month + padDays.
 */
export function monthRangeWithPadYmd(
  year: number,
  monthIndex: number,
  padDays = 7
): { from: string; to: string } {
  const start = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0);
  return {
    from: formatISODate(addDays(start, -padDays)),
    to: formatISODate(addDays(end, padDays)),
  };
}

/** Merge week lists by weekStart; dedupe slots by id. */
export function mergeLiveWeekLists(...lists: LiveWeek[][]): LiveWeek[] {
  const map = new Map<string, LiveWeek>();

  for (const list of lists) {
    for (const week of list) {
      const existing = map.get(week.weekStart);
      if (!existing) {
        map.set(week.weekStart, {
          ...week,
          slots: [...week.slots],
          offlineDays: week.offlineDays ? [...week.offlineDays] : undefined,
        });
        continue;
      }

      const ids = new Set(existing.slots.map((slot) => slot.id));
      for (const slot of week.slots) {
        if (ids.has(slot.id)) continue;
        existing.slots.push(slot);
        ids.add(slot.id);
      }
    }
  }

  for (const week of map.values()) {
    week.slots.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.time.localeCompare(b.time);
    });
  }

  return sortLiveWeeks([...map.values()]);
}

/**
 * Calendar UI grid for a month (Sunday-start).
 * Selected month only, plus adjacent-month days needed to complete the first/last weeks.
 * Independent of live-data fetch range.
 */
export function monthGridDates(year: number, monthIndex: number): string[] {
  const first = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const last = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0);
  const gridStart = startOfWeekSunday(first);
  const gridEnd = addDays(startOfWeekSunday(last), 6);
  const days =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000)) +
    1;
  return Array.from({ length: days }, (_, i) =>
    formatISODate(addDays(gridStart, i))
  );
}

export function isSameMonth(
  iso: string,
  year: number,
  monthIndex: number
): boolean {
  const date = parseISODate(iso);
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

export function isInCurrentWeek(iso: string, today = new Date()): boolean {
  const sunday = formatISODate(startOfWeekSunday(today));
  const days = weekDayDates(sunday);
  return days.includes(iso);
}

export function isCollabSlot(slot: LiveSlot): boolean {
  return slot.kind === "collab";
}

/** Today's calendar date in Bangkok as YYYY-MM-DD. */
export function bangkokTodayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function resolveEventStatus(
  event: Pick<CalendarEventInput, "date" | "endDate">,
  todayYmd: string
): CalendarEventStatus {
  if (todayYmd < event.date) return "upcoming";
  if (todayYmd > (event.endDate ?? event.date)) return "ended";
  return "ongoing";
}

function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const toUtc = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toYmd) - toUtc(fromYmd)) / 86_400_000);
}

export function resolveEvents(
  events: CalendarEventInput[],
  todayYmd: string
): CalendarEvent[] {
  return events.map((event) => {
    const status = resolveEventStatus(event, todayYmd);
    const statusDays =
      status === "ongoing"
        ? daysBetweenYmd(todayYmd, event.endDate ?? event.date) + 1
        : status === "upcoming"
          ? daysBetweenYmd(todayYmd, event.date)
          : undefined;
    return { ...event, status, statusDays };
  });
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function ongoingEvents(board: EventsBoard): CalendarEvent[] {
  return sortEvents(board.events.filter((event) => event.status === "ongoing"));
}

export function upcomingEvents(
  board: EventsBoard,
  limit?: number
): CalendarEvent[] {
  const list = sortEvents(
    board.events.filter((event) => event.status === "upcoming")
  );
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function pastEvents(
  board: EventsBoard,
  limit?: number
): CalendarEvent[] {
  const list = sortEvents(
    board.events.filter((event) => event.status === "ended")
  ).reverse();
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

/** Ongoing, then soonest upcoming, then most recent past (home teaser and /events). */
export function featuredEvents(
  board: EventsBoard,
  limit?: number
): CalendarEvent[] {
  const list = [
    ...ongoingEvents(board),
    ...upcomingEvents(board),
    ...pastEvents(board),
  ];
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

/** Event categories shared by the /events filter buttons and the card tags. */
export const EVENT_CATEGORIES = [
  { id: "offline", label: "ออฟไลน์", kind: "format" },
  { id: "online", label: "ออนไลน์", kind: "format" },
  { id: "gaming", label: "เกม", kind: "theme" },
  { id: "birthday", label: "วันเกิด", kind: "theme" },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type EventCategoryId = EventCategory["id"];

export function matchesEventCategory(
  event: Pick<CalendarEvent, "format" | "themes">,
  id: EventCategoryId
): boolean {
  if (id === "gaming" || id === "birthday") return event.themes.includes(id);
  return event.format === id;
}

/** Start year (YYYY) — shown as a tag and used by the year filter. */
export function eventYear(event: Pick<CalendarEvent, "date">): string {
  return event.date.slice(0, 4);
}

/** Distinct start years, newest first. */
export function eventYears(events: Pick<CalendarEvent, "date">[]): string[] {
  return [...new Set(events.map(eventYear))].sort((a, b) => b.localeCompare(a));
}

/** Heading for an event's linked videos: "ไลฟ์", "วิดีโอ", or both. */
export function eventVideosLabel(items: { kind?: EventVideoKind }[]): string {
  const hasVideo = items.some((item) => item.kind === "video");
  const hasLive = items.some((item) => item.kind !== "video");
  if (hasLive && hasVideo) return "ไลฟ์และวิดีโอ";
  return hasVideo ? "วิดีโอ" : "ไลฟ์";
}

/** Categories the event appears under when filtering — used as its tags. */
export function eventTags(
  event: Pick<CalendarEvent, "format" | "themes">
): EventCategory[] {
  return EVENT_CATEGORIES.filter((category) =>
    matchesEventCategory(event, category.id)
  );
}

/** e.g. "กำลังจัด · เหลือ 9 วัน", "อีก 5 วัน", "จบแล้ว". */
export function eventStatusLabel(
  event: Pick<CalendarEvent, "status" | "statusDays">
): string {
  const days = event.statusDays;
  if (event.status === "ended") return "จบแล้ว";
  if (event.status === "ongoing") {
    if (days === undefined) return "กำลังจัด";
    return days <= 1 ? "กำลังจัด · วันสุดท้าย" : `กำลังจัด · เหลือ ${days} วัน`;
  }
  if (days === undefined) return "เร็วๆ นี้";
  return days <= 1 ? "พรุ่งนี้" : `อีก ${days} วัน`;
}
