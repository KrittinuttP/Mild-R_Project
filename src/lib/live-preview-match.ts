/**
 * Manual preview mocks vs real YouTube lives — match & replace rules.
 *
 * Overwrite (JSON save): replace unlinked previews for the same Bangkok date only.
 * Real live wins: same Bangkok date + same channel ownership + |Δscheduled| ≤ 3h
 * → keep real row, delete the closest matching mock.
 */

export const PREVIEW_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

const BANGKOK = "Asia/Bangkok";

export function bangkokDateFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(new Date(iso)); // YYYY-MM-DD
}

export type PreviewLikeRow = {
  video_id: string;
  channel_id?: string | null;
  is_own_channel?: boolean | null;
  scheduled_start?: string | null;
  scheduled_start_first?: string | null;
  actual_start?: string | null;
  metadata?: Record<string, unknown> | null;
};

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

/** Own↔own or same YouTube channel_id. */
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

/**
 * Pick one unlinked mock to delete for this real live.
 * Criteria: same Bangkok date, channel match, within ±3h; closest time wins.
 */
export function pickMatchingPreviewVideoId(
  real: PreviewLikeRow,
  mocks: PreviewLikeRow[]
): string | null {
  if (real.video_id.startsWith("manual-")) return null;
  const realIso = rowScheduleIso(real);
  const realDate = bangkokDateFromIso(realIso);
  if (!realIso || !realDate) return null;
  const realMs = new Date(realIso).getTime();
  if (!Number.isFinite(realMs)) return null;

  let bestId: string | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const mock of mocks) {
    if (!isUnlinkedPreview(mock)) continue;
    if (!channelsMatchForPreview(real, mock)) continue;
    const mockDate = previewLocalDate(mock);
    if (mockDate !== realDate) continue;
    const mockIso = rowScheduleIso(mock);
    if (!mockIso) continue;
    const mockMs = new Date(mockIso).getTime();
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
