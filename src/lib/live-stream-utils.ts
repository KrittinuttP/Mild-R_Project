import {
  formatISODate,
  isYmdInInclusiveRange,
  parseISODate,
  sortLiveWeeks,
  startOfWeekSunday,
  weekOverlapsYmdRange,
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

function sameInstant(a: string | null, b: string | null) {
  if (!a || !b) return a === b;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return a === b;
  return ta === tb;
}

export function getLiveStreamStatus(row: LiveStreamRow): LiveStreamStatus {
  if (
    row.metadata?.cancelled === true ||
    row.metadata?.status === "cancelled"
  ) {
    return "cancelled";
  }
  if (row.actual_start && !row.actual_end) return "live";
  if (row.actual_end) return "ended";
  const scheduled = row.scheduled_start ?? row.scheduled_start_first;
  if (scheduled) {
    const start = new Date(scheduled).getTime();
    if (!Number.isFinite(start)) return "ended";
    const now = Date.now();
    if (start > now) return "upcoming";
    // Past scheduled, never started: grace 3h then cancelled
    if (now - start >= 3 * 60 * 60 * 1000) return "cancelled";
    return "upcoming";
  }
  return "ended";
}

export function liveStreamSortKey(row: LiveStreamRow): number {
  const iso =
    row.actual_start ??
    row.scheduled_start_first ??
    row.scheduled_start ??
    row.created_at;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours <= 0) return `${minutes} นาที`;
  if (minutes === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${minutes} นาที`;
}

function bangkokDateTimeLabel(iso: string): string {
  const { date, time } = bangkokParts(iso);
  const [y, m, d] = date.split("-");
  return `${Number(d)}/${Number(m)} ${time}`;
}

function isManualPreviewRow(row: LiveStreamRow) {
  const meta = row.metadata;
  if (meta && meta.preview === true) return true;
  return row.video_id.startsWith("manual-");
}

function linkedYoutubeVideoId(row: LiveStreamRow): string | null {
  const linked = row.metadata?.linked_video_id;
  return typeof linked === "string" && linked.trim() ? linked.trim() : null;
}

/** Public watch URL only when a real video exists (not channel-page placeholders). */
function resolveSlotUrl(row: LiveStreamRow): string | undefined {
  const linked = linkedYoutubeVideoId(row);
  if (linked) return `https://www.youtube.com/watch?v=${linked}`;

  if (isManualPreviewRow(row)) return undefined;

  if (row.url?.startsWith("http") && !row.url.includes("/channel/")) {
    return row.url;
  }
  if (!row.video_id.startsWith("manual-")) {
    return row.url ?? `https://www.youtube.com/watch?v=${row.video_id}`;
  }
  return undefined;
}

/** Map DB row → LiveSlot for schedule board / modals. */
export function liveStreamToSlot(row: LiveStreamRow): LiveSlot {
  const status = getLiveStreamStatus(row);
  const own = Boolean(row.is_own_channel);
  const collab = Boolean(row.is_collab) || !own;
  const isPreview = isManualPreviewRow(row) && !linkedYoutubeVideoId(row);
  const isMember =
    row.metadata?.member === true ||
    (typeof row.title === "string" &&
      /【?\s*membership\b/i.test(row.title));

  // Schedule display base: first-seen announce time
  const firstIso = row.scheduled_start_first ?? row.scheduled_start;
  const latestIso = row.scheduled_start ?? row.scheduled_start_first;
  const whenForDate =
    firstIso ?? row.actual_start ?? row.created_at;
  const { date } = bangkokParts(whenForDate);

  let time = "TBA";
  let timePrevious: string | undefined;
  let timeUpdated: string | undefined;
  let scheduledLabel: string | undefined;
  let scheduledPrevious: string | undefined;
  let scheduledUpdated: string | undefined;

  if (firstIso && latestIso && !sameInstant(firstIso, latestIso)) {
    scheduledPrevious = bangkokParts(firstIso).time;
    scheduledUpdated = bangkokParts(latestIso).time;
    scheduledLabel = scheduledUpdated;
    timePrevious = scheduledPrevious;
    timeUpdated = scheduledUpdated;
    time = status === "live" ? "LIVE" : scheduledUpdated;
  } else if (firstIso) {
    scheduledLabel = bangkokParts(firstIso).time;
    time = status === "live" ? "LIVE" : scheduledLabel;
  } else if (row.actual_start) {
    scheduledLabel = undefined;
    time = status === "live" ? "LIVE" : bangkokParts(row.actual_start).time;
  }

  let actualStartLabel: string | null = null;
  if (row.actual_start) {
    actualStartLabel = bangkokDateTimeLabel(row.actual_start);
  }

  let actualEndLabel: string | null = null;
  if (row.actual_end) {
    actualEndLabel = bangkokDateTimeLabel(row.actual_end);
  }

  let durationLabel: string | null = null;
  if (row.actual_start) {
    const startMs = new Date(row.actual_start).getTime();
    const endMs = row.actual_end
      ? new Date(row.actual_end).getTime()
      : status === "live"
        ? Date.now()
        : NaN;
    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      durationLabel = formatDuration(endMs - startMs);
      if (status === "live" && !row.actual_end) {
        durationLabel = `${durationLabel} (กำลังไลฟ์)`;
      }
    }
  }

  const sourceTitle = own
    ? "Mild-R"
    : row.source_title?.trim() || null;

  const coverHistory = (row.thumbnails ?? [])
    .slice()
    .sort((a, b) =>
      a.captured_at < b.captured_at ? 1 : a.captured_at > b.captured_at ? -1 : 0
    )
    .map((t) => ({ url: t.public_url, capturedAt: t.captured_at }));

  const coverUrl =
    row.thumbnail_cached_url ??
    coverHistory[0]?.url ??
    row.thumbnail_url ??
    null;

  if (status === "cancelled" && time === "LIVE") {
    time = scheduledLabel ?? timePrevious ?? "TBA";
  }

  return {
    id: `yt-${row.video_id}`,
    date,
    time,
    timePrevious,
    timeUpdated,
    title: row.title ?? "Untitled live",
    platform: "youtube",
    url: resolveSlotUrl(row),
    isPreview,
    isMember,
    kind: collab ? "collab" : "solo",
    isOwnChannel: own,
    sourceTitle,
    status,
    scheduledLabel,
    scheduledPrevious,
    scheduledUpdated,
    actualStartLabel,
    actualEndLabel,
    durationLabel,
    viewsOnEnd: row.views_on_end,
    latestViews: row.latest_views,
    channelName: row.channel_name,
    coverUrl,
    coverHistory,
    createdAt: row.created_at,
  };
}

/**
 * Convert a stream row into one or two slots:
 * 1) If rescheduled to a DIFFERENT calendar date:
 *    - Produces a ghost/cancelled slot on the original date
 *    - Produces an active/ended slot on the new date
 * 2) Otherwise produces a single slot.
 */
export function liveStreamToSlots(row: LiveStreamRow): LiveSlot[] {
  const baseSlot = liveStreamToSlot(row);
  const firstIso = row.scheduled_start_first;
  const latestIso = row.scheduled_start;

  // Check if original date differs from latest date (rescheduled to another day)
  if (firstIso && latestIso && !sameInstant(firstIso, latestIso)) {
    const firstDate = bangkokParts(firstIso).date;
    const latestDate = bangkokParts(latestIso).date;

    if (firstDate !== latestDate) {
      const firstTime = bangkokParts(firstIso).time;
      const latestTime = bangkokParts(latestIso).time;
      const activeSlotId = `yt-${row.video_id}`;
      const ghostSlotId = `yt-${row.video_id}-orig-${firstDate}`;
      const history = baseSlot.coverHistory ?? [];
      const ghostCoverUrl =
        history.length > 0
          ? history[history.length - 1]?.url
          : baseSlot.coverUrl;

      // Slot 1: Ghost log slot on the original date (original schedule only)
      const ghostSlot: LiveSlot = {
        ...baseSlot,
        id: ghostSlotId,
        date: firstDate,
        time: firstTime,
        timePrevious: undefined,
        timeUpdated: undefined,
        status: "cancelled",
        scheduledLabel: firstTime,
        scheduledPrevious: undefined,
        scheduledUpdated: undefined,
        actualStartLabel: null,
        actualEndLabel: null,
        durationLabel: null,
        viewsOnEnd: null,
        latestViews: null,
        coverUrl: ghostCoverUrl ?? baseSlot.coverUrl,
        rescheduleLink: {
          direction: "to",
          date: latestDate,
          time: latestTime,
          slotId: activeSlotId,
        },
      };

      // Slot 2: Active slot on the new date
      const activeSlot: LiveSlot = {
        ...baseSlot,
        id: activeSlotId,
        date: latestDate,
        time: baseSlot.status === "live" ? "LIVE" : latestTime,
        timePrevious: undefined,
        timeUpdated: undefined,
        scheduledLabel: latestTime,
        scheduledPrevious: undefined,
        scheduledUpdated: undefined,
      };

      return [ghostSlot, activeSlot];
    }
  }

  return [baseSlot];
}
function calendarSortTime(slot: LiveSlot): string {
  const t = slot.timeUpdated ?? slot.time;
  if (t === "LIVE") return "00:00";
  if (t === "TBA") return "99:99";
  return t;
}

/** Same calendar day: time ascending, then createdAt descending (newest on top). */
export function compareLiveSlots(a: LiveSlot, b: LiveSlot): number {
  const ta = calendarSortTime(a);
  const tb = calendarSortTime(b);
  const byTime = ta.localeCompare(tb, "en", { numeric: true });
  if (byTime !== 0) return byTime;

  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (ca !== cb) return cb - ca;

  return a.id.localeCompare(b.id);
}

export function sortLiveSlotsForCalendar(slots: LiveSlot[]): LiveSlot[] {
  return [...slots].sort(compareLiveSlots);
}

function deduplicateWeekSlots(slots: LiveSlot[]): LiveSlot[] {
  const reals = slots.filter(
    (s) => !s.isPreview && !s.id.startsWith("yt-manual-")
  );
  if (reals.length === 0) return slots;

  return slots.filter((slot) => {
    // Always keep real lives
    if (!slot.isPreview && !slot.id.startsWith("yt-manual-")) return true;
    // Always keep explicit cancelled ghost slots from another date
    if (slot.status === "cancelled") return true;

    // Check if any real live matches this preview mock on the same day & channel
    const hasMatchingReal = reals.some((real) => {
      if (real.date !== slot.date) return false;

      const ownMatch =
        Boolean(real.isOwnChannel) && Boolean(slot.isOwnChannel);
      const titleMatch =
        Boolean(real.sourceTitle) &&
        Boolean(slot.sourceTitle) &&
        real.sourceTitle?.trim().toLowerCase() ===
          slot.sourceTitle?.trim().toLowerCase();

      if (!ownMatch && !titleMatch) return false;

      // Time proximity check (same time or within ±3 hours)
      const realTime = real.timeUpdated ?? real.time;
      const mockTime = slot.timeUpdated ?? slot.time;
      if (realTime === mockTime || realTime === "LIVE") return true;

      const [rh, rm] = realTime.split(":").map(Number);
      const [mh, mm] = mockTime.split(":").map(Number);
      if (Number.isFinite(rh) && Number.isFinite(mh)) {
        const deltaMinutes = Math.abs(
          rh * 60 + (rm || 0) - (mh * 60 + (mm || 0))
        );
        if (deltaMinutes <= 180) return true;
      }
      return false;
    });

    return !hasMatchingReal;
  });
}

/** Merge Supabase streams into JSON live weeks (all history that loads). */
export function mergeLiveWeeksWithStreams(
  baseWeeks: LiveWeek[],
  streams: LiveStreamRow[],
  range?: { from: string; to: string }
): LiveWeek[] {
  const weekMap = new Map<string, LiveWeek>();

  const slotInRange = (slot: LiveSlot) =>
    !range || isYmdInInclusiveRange(slot.date, range.from, range.to);

  for (const week of baseWeeks) {
    if (range && !weekOverlapsYmdRange(week.weekStart, range.from, range.to)) {
      continue;
    }
    weekMap.set(week.weekStart, {
      ...week,
      slots: week.slots.filter(slotInRange),
      offlineDays: week.offlineDays ? [...week.offlineDays] : undefined,
    });
  }

  // Dedupe by slot id (video_id) only — never by url.
  // Manual previews share no watch URL; channel URLs must not collapse days.
  const existingIds = new Set<string>();
  for (const week of weekMap.values()) {
    for (const slot of week.slots) {
      existingIds.add(slot.id);
    }
  }

  for (const row of streams) {
    const slots = liveStreamToSlots(row);
    for (const slot of slots) {
      if (existingIds.has(slot.id)) continue;
      if (!slotInRange(slot)) continue;

      const weekStart = formatISODate(
        startOfWeekSunday(parseISODate(slot.date))
      );
      if (
        range &&
        !weekOverlapsYmdRange(weekStart, range.from, range.to)
      ) {
        continue;
      }

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
    }
  }

  for (const week of weekMap.values()) {
    week.slots = deduplicateWeekSlots(week.slots);
    week.slots.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ta = a.timePrevious ?? a.time;
      const tb = b.timePrevious ?? b.time;
      return ta.localeCompare(tb, "en", { numeric: true });
    });
  }

  let weeks = sortLiveWeeks([...weekMap.values()]);

  if (range) {
    weeks = weeks.filter(
      (week) =>
        weekOverlapsYmdRange(week.weekStart, range.from, range.to) &&
        week.slots.length > 0
    );
  }

  return weeks;
}

export function partitionLiveStreams(rows: LiveStreamRow[]) {
  const live: LiveStreamRow[] = [];
  const upcoming: LiveStreamRow[] = [];
  const ended: LiveStreamRow[] = [];
  const cancelled: LiveStreamRow[] = [];

  for (const row of rows) {
    const status = getLiveStreamStatus(row);
    if (status === "live") live.push(row);
    else if (status === "upcoming") upcoming.push(row);
    else if (status === "cancelled") cancelled.push(row);
    else ended.push(row);
  }

  upcoming.sort((a, b) => liveStreamSortKey(a) - liveStreamSortKey(b));
  cancelled.sort((a, b) => liveStreamSortKey(b) - liveStreamSortKey(a));
  return { live, upcoming, ended, cancelled };
}
