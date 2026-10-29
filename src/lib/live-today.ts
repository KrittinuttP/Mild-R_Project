import type { LiveSlot } from "@/types/vtuber";

/**
 * Live-slot helpers shared by the "live today" strip and the hero monitor.
 * Slot dates / times are Bangkok wall-clock (UTC+7).
 */

export const HOUR_MS = 60 * 60 * 1000;
/** Upcoming slots this far past their start time are treated as stale data. */
export const STALE_UPCOMING_MS = 3 * HOUR_MS;
/** Poll faster this long before a start so the LIVE flip shows soon after the tracker sees it. */
export const FAST_REFRESH_LEAD_MS = 10 * 60_000;

export function slotTimeLabel(slot: LiveSlot): string | null {
  const time = slot.scheduledUpdated ?? slot.scheduledLabel ?? slot.time;
  return /^\d{1,2}:\d{2}$/.test(time) ? time : null;
}

function bangkokWallClockMs(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h - 7, min);
}

/** Bangkok (UTC+7) wall-clock start of the slot, in epoch ms. */
export function slotStartMs(slot: LiveSlot): number | null {
  const time = slotTimeLabel(slot);
  return time ? bangkokWallClockMs(slot.date, time) : null;
}

export function actualStartMs(slot: LiveSlot): number | null {
  const time = slot.actualStartLabel;
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  return bangkokWallClockMs(slot.date, time);
}

/** `H:MM:SS` from one hour up, `MM:SS` below. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function isOff(slot: LiveSlot) {
  return slot.status === "ended" || slot.status === "cancelled";
}

function byStart(a: LiveSlot, b: LiveSlot) {
  const aStart = slotStartMs(a) ?? Number.POSITIVE_INFINITY;
  const bStart = slotStartMs(b) ?? Number.POSITIVE_INFINITY;
  return aStart - bStart || a.time.localeCompare(b.time);
}

/** Today's live first, then upcoming by start time; ended/cancelled/stale dropped. */
export function pickTodaySlots(slots: LiveSlot[], today: string, nowMs: number): LiveSlot[] {
  return slots
    .filter((slot) => {
      if (slot.date !== today) return false;
      if (slot.status === "live") return true;
      if (isOff(slot)) return false;
      const start = slotStartMs(slot);
      return start === null || start + STALE_UPCOMING_MS > nowMs;
    })
    .sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || byStart(a, b));
}

/** First slot on a later day that is still on the schedule. */
export function pickNextSlotAfter(slots: LiveSlot[], today: string): LiveSlot | null {
  return slots.filter((slot) => slot.date > today && !isOff(slot)).sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b))[0] ?? null;
}

/** An upcoming slot is close to (or past) its start but not yet marked live. */
export function isNearStart(slot: LiveSlot, nowMs: number): boolean {
  if (slot.status === "live") return false;
  const start = slotStartMs(slot);
  return start !== null && nowMs >= start - FAST_REFRESH_LEAD_MS;
}

/**
 * "เริ่มในอีก 3 ชม. 36 นาที" (or short "อีก 3 ชม.") for an upcoming slot starting within 24 h.
 * `null` when the start is unknown, already passed, or more than a day away.
 */
export function startCountdownLabel(slot: LiveSlot, nowMs: number | null, short = false): string | null {
  const targetMs = slotStartMs(slot);
  if (targetMs === null || nowMs === null) return null;
  const diff = targetMs - nowMs;
  if (diff <= 0 || diff > 24 * HOUR_MS) return null;
  const totalMin = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;

  if (short) return hours > 0 ? `อีก ${hours} ชม.` : `อีก ${Math.max(1, minutes)} นาที`;
  if (hours > 0) return minutes > 0 ? `เริ่มในอีก ${hours} ชม. ${minutes} นาที` : `เริ่มในอีก ${hours} ชม.`;
  return `เริ่มในอีก ${Math.max(1, minutes)} นาที`;
}
