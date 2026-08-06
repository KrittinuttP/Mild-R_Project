import {
  formatISODate,
  parseISODate,
  sortLiveWeeks,
  startOfWeekMonday,
} from "@/lib/events";
import type { LiveStreamRow, LiveStreamStatus } from "@/types/live-stream";
import type { LiveSlot, LiveWeek } from "@/types/vtuber";

const BANGKOK = "Asia/Bangkok";

function bangkokParts(iso: string) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(iso)).map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function getLiveStreamStatus(row: LiveStreamRow): LiveStreamStatus {
  if (row.actual_start && !row.actual_end) return "live";
  if (row.actual_end) return "ended";
  if (row.scheduled_start) {
    const start = new Date(row.scheduled_start).getTime();
    if (Number.isFinite(start) && start > Date.now()) return "upcoming";
  }
  return "ended";
}

export function liveStreamSortKey(row: LiveStreamRow): number {
  const iso = row.actual_start ?? row.scheduled_start ?? row.created_at;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Map DB row → LiveSlot for schedule board / modals. */
export function liveStreamToSlot(row: LiveStreamRow): LiveSlot {
  const when = row.actual_start ?? row.scheduled_start ?? row.created_at;
  const { date, time } = bangkokParts(when);
  const status = getLiveStreamStatus(row);
  const own = Boolean(row.is_own_channel);
  const collab = Boolean(row.is_collab) || !own;
  const channel = row.channel_name?.trim();

  let note: string | undefined;
  if (!own && channel) {
    note = `ช่อง ${channel}`;
  } else if (collab && own) {
    note = "Collab";
  }

  return {
    id: `yt-${row.video_id}`,
    date,
    time: status === "live" ? "LIVE" : time,
    title: row.title ?? "Untitled live",
    platform: "youtube",
    url: row.url ?? `https://www.youtube.com/watch?v=${row.video_id}`,
    note,
    kind: collab ? "collab" : "solo",
  };
}

/** Merge Supabase streams into JSON live weeks (all history that loads). */
export function mergeLiveWeeksWithStreams(
  baseWeeks: LiveWeek[],
  streams: LiveStreamRow[]
): LiveWeek[] {
  const weekMap = new Map<string, LiveWeek>();

  for (const week of baseWeeks) {
    weekMap.set(week.weekStart, {
      ...week,
      slots: [...week.slots],
      offlineDays: week.offlineDays ? [...week.offlineDays] : undefined,
    });
  }

  const existingIds = new Set<string>();
  const existingUrls = new Set<string>();
  for (const week of weekMap.values()) {
    for (const slot of week.slots) {
      existingIds.add(slot.id);
      if (slot.url) existingUrls.add(slot.url);
    }
  }

  for (const row of streams) {
    const slot = liveStreamToSlot(row);
    if (existingIds.has(slot.id)) continue;
    if (slot.url && existingUrls.has(slot.url)) continue;

    const weekStart = formatISODate(
      startOfWeekMonday(parseISODate(slot.date))
    );
    let week = weekMap.get(weekStart);
    if (!week) {
      week = {
        id: `yt-week-${weekStart}`,
        weekStart,
        slots: [],
      };
      weekMap.set(weekStart, week);
    }

    week.slots.push(slot);
    existingIds.add(slot.id);
    if (slot.url) existingUrls.add(slot.url);
  }

  for (const week of weekMap.values()) {
    week.slots.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.time.localeCompare(b.time, "en", { numeric: true });
    });
  }

  return sortLiveWeeks([...weekMap.values()]);
}

export function partitionLiveStreams(rows: LiveStreamRow[]) {
  const live: LiveStreamRow[] = [];
  const upcoming: LiveStreamRow[] = [];
  const ended: LiveStreamRow[] = [];

  for (const row of rows) {
    const status = getLiveStreamStatus(row);
    if (status === "live") live.push(row);
    else if (status === "upcoming") upcoming.push(row);
    else ended.push(row);
  }

  upcoming.sort((a, b) => liveStreamSortKey(a) - liveStreamSortKey(b));
  return { live, upcoming, ended };
}
