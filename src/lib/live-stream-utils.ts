import {
  formatISODate,
  parseISODate,
  sortLiveWeeks,
  startOfWeekSunday,
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
  const isMember = row.metadata?.member === true;

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

  // Dedupe by slot id (video_id) only — never by url.
  // Manual previews share no watch URL; channel URLs must not collapse days.
  const existingIds = new Set<string>();
  for (const week of weekMap.values()) {
    for (const slot of week.slots) {
      existingIds.add(slot.id);
    }
  }

  for (const row of streams) {
    const slot = liveStreamToSlot(row);
    if (existingIds.has(slot.id)) continue;

    const weekStart = formatISODate(
      startOfWeekSunday(parseISODate(slot.date))
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
  }

  for (const week of weekMap.values()) {
    week.slots.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ta = a.timePrevious ?? a.time;
      const tb = b.timePrevious ?? b.time;
      return ta.localeCompare(tb, "en", { numeric: true });
    });
  }

  return sortLiveWeeks([...weekMap.values()]);
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
