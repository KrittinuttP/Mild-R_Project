/**
 * Manual preview mocks vs real YouTube lives — match & replace rules.
 *
 * Overwrite (JSON save): replace unlinked previews for the same Bangkok date only.
 * Real live wins:
 *   1) same Bangkok date + same channel + |Δscheduled| ≤ 3h (closest)
 *   2) fallback (mocks only): same channel + schedule time overlaps real window
 * → keep real row, delete the matching mock.
 */

export const PREVIEW_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

const BANGKOK = "Asia/Bangkok";

/** Parse timestamptz from Supabase / Postgres-style strings. */
export function parseScheduleMs(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const direct = new Date(iso).getTime();
  if (Number.isFinite(direct)) return direct;
  // "2026-08-12 14:00:00+00" → ISO-ish
  const normalized = iso
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  return new Date(normalized).getTime();
}

export function bangkokDateFromIso(iso: string | null | undefined): string | null {
  const ms = parseScheduleMs(iso);
  if (!Number.isFinite(ms)) return null;
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(new Date(ms)); // YYYY-MM-DD
}

export type PreviewLikeRow = {
  video_id: string;
  channel_id?: string | null;
  source_title?: string | null;
  channel_name?: string | null;
  is_own_channel?: boolean | null;
  scheduled_start?: string | null;
  scheduled_start_first?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function isUnlinkedPreview(row: PreviewLikeRow): boolean {
  const linked = row.metadata?.linked_video_id;
  if (typeof linked === "string" && linked.trim()) return false;
  if (row.metadata?.preview === true) return true;
  return row.video_id.startsWith("manual-");
}

export function isCancelledPreview(row: PreviewLikeRow): boolean {
  return (
    row.metadata?.cancelled === true || row.metadata?.status === "cancelled"
  );
}

export function previewLocalDate(row: PreviewLikeRow): string | null {
  const fromMeta = row.metadata?.local_date;
  if (typeof fromMeta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fromMeta)) {
    return fromMeta;
  }
  return bangkokDateFromIso(
    row.scheduled_start_first ?? row.scheduled_start ?? row.actual_start
  );
}

export function rowScheduleIso(row: PreviewLikeRow): string | null {
  return (
    row.scheduled_start ??
    row.scheduled_start_first ??
    row.actual_start ??
    null
  );
}

function normalizeChannelKey(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim().toLowerCase().replace(/[\s-_]+/g, "");
}

/** Own↔own, same YouTube channel_id, or same source_title/channel_key. */
export function channelsMatchForPreview(
  a: PreviewLikeRow,
  b: PreviewLikeRow
): boolean {
  const aOwn = Boolean(a.is_own_channel);
  const bOwn = Boolean(b.is_own_channel);
  if (aOwn && bOwn) return true;
  if (aOwn !== bOwn) return false;

  if (a.channel_id && b.channel_id && a.channel_id === b.channel_id) {
    return true;
  }

  // Fallback matching by source title or channel_key
  const aKey =
    normalizeChannelKey(a.source_title) ||
    normalizeChannelKey(a.metadata?.channel_key) ||
    normalizeChannelKey(a.channel_name);
  const bKey =
    normalizeChannelKey(b.source_title) ||
    normalizeChannelKey(b.metadata?.channel_key) ||
    normalizeChannelKey(b.channel_name);

  if (aKey && bKey && aKey === bKey) return true;
  return false;
}

/** Real live time window for overlap checks (mocks only). */
export function realLiveWindowMs(
  real: PreviewLikeRow
): { start: number; end: number } | null {
  const startIso = real.actual_start ?? rowScheduleIso(real);
  if (!startIso) return null;
  const start = parseScheduleMs(startIso);
  if (!Number.isFinite(start)) return null;

  if (real.actual_end) {
    const end = parseScheduleMs(real.actual_end);
    if (Number.isFinite(end) && end >= start) return { start, end };
  }
  return { start, end: start + PREVIEW_MATCH_WINDOW_MS };
}

function pickBySameDate(
  real: PreviewLikeRow,
  mocks: PreviewLikeRow[],
  realMs: number,
  realDate: string
): string | null {
  let bestId: string | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const mock of mocks) {
    if (!isUnlinkedPreview(mock)) continue;
    if (isCancelledPreview(mock)) continue;
    if (!channelsMatchForPreview(real, mock)) continue;
    const mockDate = previewLocalDate(mock);
    if (mockDate !== realDate) continue;
    const mockIso = rowScheduleIso(mock);
    if (!mockIso) continue;
    const mockMs = parseScheduleMs(mockIso);
    if (!Number.isFinite(mockMs)) continue;
    const delta = Math.abs(realMs - mockMs);
    if (delta > PREVIEW_MATCH_WINDOW_MS) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = mock.video_id;
    }
  }

  return bestId;
}

/**
 * Fallback for mocks only: same channel + mock schedule inside real window
 * (or within ±3h of real start). Does not require the same Bangkok date —
 * covers reschedule / cross-midnight cases.
 */
function pickByTimeOverlap(
  real: PreviewLikeRow,
  mocks: PreviewLikeRow[]
): string | null {
  const window = realLiveWindowMs(real);
  if (!window) return null;

  let bestId: string | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const mock of mocks) {
    if (!isUnlinkedPreview(mock)) continue;
    if (isCancelledPreview(mock)) continue;
    if (!channelsMatchForPreview(real, mock)) continue;
    const mockIso = rowScheduleIso(mock);
    if (!mockIso) continue;
    const mockMs = parseScheduleMs(mockIso);
    if (!Number.isFinite(mockMs)) continue;

    const inWindow = mockMs >= window.start && mockMs <= window.end;
    const nearStart = Math.abs(mockMs - window.start) <= PREVIEW_MATCH_WINDOW_MS;
    if (!inWindow && !nearStart) continue;

    const delta = Math.abs(mockMs - window.start);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = mock.video_id;
    }
  }

  return bestId;
}

/**
 * Pick one unlinked mock to delete for this real live.
 * ONLY matches on the SAME Bangkok calendar date.
 * If a live was rescheduled to another day, the past mock is preserved as a ghost log.
 */
export function pickMatchingPreviewVideoId(
  real: PreviewLikeRow,
  mocks: PreviewLikeRow[]
): string | null {
  if (real.video_id.startsWith("manual-")) return null;
  const realIso = rowScheduleIso(real);
  if (!realIso) return null;
  const realMs = parseScheduleMs(realIso);
  if (!Number.isFinite(realMs)) return null;
  const realDate = bangkokDateFromIso(realIso);

  if (realDate) {
    return pickBySameDate(real, mocks, realMs, realDate);
  }

  return null;
}

/** Collect mock video_ids that should be removed given newly saved real lives. */
export function collectPreviewIdsToDelete(
  reals: PreviewLikeRow[],
  mocks: PreviewLikeRow[]
): string[] {
  const available = mocks.filter(isUnlinkedPreview);
  const used = new Set<string>();
  const out: string[] = [];

  for (const real of reals) {
    if (real.video_id.startsWith("manual-")) continue;
    const remaining = available.filter((m) => !used.has(m.video_id));
    const id = pickMatchingPreviewVideoId(real, remaining);
    if (id) {
      used.add(id);
      out.push(id);
    }
  }

  return out;
}
