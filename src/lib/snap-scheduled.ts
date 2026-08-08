/**
 * Snap scheduled instants to nearest :00 / :30 when within ±5 minutes.
 * Matches supabase/migrations/20260808010000_snap_scheduled_half_hour.sql
 * (UTC epoch rounding). Does not touch actual_start / actual_end.
 */
const HALF_HOUR_SEC = 1800;
const SNAP_WINDOW_SEC = 300;

export function snapScheduledToHalfHour(
  iso: string | null | undefined
): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;

  const epochSec = ms / 1000;
  const nearest = Math.round(epochSec / HALF_HOUR_SEC) * HALF_HOUR_SEC;
  if (Math.abs(epochSec - nearest) <= SNAP_WINDOW_SEC) {
    return new Date(nearest * 1000).toISOString();
  }
  return new Date(ms).toISOString();
}
