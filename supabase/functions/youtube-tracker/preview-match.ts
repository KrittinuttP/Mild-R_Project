/**
 * Deno copy of preview↔real match helpers (Edge Function cannot import @/lib).
 * Keep in sync with src/lib/live-preview-match.ts
 */

export const PREVIEW_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

const BANGKOK = "Asia/Bangkok";

export type PreviewLikeRow = {
  video_id: string;
  channel_id?: string | null;
  is_own_channel?: boolean | null;
  scheduled_start?: string | null;
  scheduled_start_first?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Parse timestamptz from Supabase / Postgres-style strings. */
export function parseScheduleMs(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const direct = new Date(iso).getTime();
  if (Number.isFinite(direct)) return direct;
  const normalized = iso
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  return new Date(normalized).getTime();
}

export function bangkokDateFromIso(iso: string | null | undefined): string | null {
  const ms = parseScheduleMs(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function isUnlinkedPreview(row: PreviewLikeRow): boolean {
  const linked = row.metadata?.linked_video_id;
  if (typeof linked === "string" && linked.trim()) return false;
  if (row.metadata?.preview === true) return true;
  return row.video_id.startsWith("manual-");
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

export function channelsMatchForPreview(
  a: Pick<PreviewLikeRow, "channel_id" | "is_own_channel">,
  b: Pick<PreviewLikeRow, "channel_id" | "is_own_channel">
): boolean {
  const aOwn = Boolean(a.is_own_channel);
  const bOwn = Boolean(b.is_own_channel);
  if (aOwn && bOwn) return true;
  if (aOwn !== bOwn) return false;
  if (!a.channel_id || !b.channel_id) return false;
  return a.channel_id === b.channel_id;
}

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
    const byDate = pickBySameDate(real, mocks, realMs, realDate);
    if (byDate) return byDate;
  }

  return pickByTimeOverlap(real, mocks);
}

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
