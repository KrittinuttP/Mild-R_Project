import type {
  CalendarEvent,
  EventsBoard,
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

export function formatThaiDate(iso: string): string {
  const date = parseISODate(iso);
  return date.toLocaleDateString("th-TH-u-ca-gregory", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function upcomingEvents(
  board: EventsBoard,
  limit?: number
): CalendarEvent[] {
  const list = sortEvents(
    board.events.filter(
      (event) => event.status === "upcoming" || event.status === "ongoing"
    )
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

export function eventStatusLabel(status: CalendarEvent["status"]): string {
  if (status === "ongoing") return "กำลังจัด";
  if (status === "ended") return "ผ่านมาแล้ว";
  return "กำลังมา";
}
