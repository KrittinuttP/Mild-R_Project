import huntData from "@/data/mild-r/cafe-hunt.json";
import type { LuckyDrawCampaign } from "@/lib/lucky-draw";

/**
 * Cafe evidence hunt — public settings (names, hints, time window).
 * The QR tokens are NOT here: see cafe-hunt-tokens.ts (server only).
 */

export type CafeHuntItem = {
  id: string;
  name: string;
  /** Where the QR is placed. Shown after the piece is found. */
  place: string;
  /** Clue shown before the piece is found. */
  hint: string;
};

export type CafeHuntConfig = {
  campaign: LuckyDrawCampaign;
  title: string;
  /** ISO date-time. null = no limit on that side. */
  opensAt: string | null;
  closesAt: string | null;
  /** Free text shown on the ticket, e.g. the day the wheel is spun. */
  drawAt: string;
  items: CafeHuntItem[];
};

export const cafeHunt = huntData as CafeHuntConfig;

export const CAFE_HUNT_ITEM_COUNT = cafeHunt.items.length;

/** Entries are accepted only inside the window (when one is set). */
export function isCafeHuntOpen(now: Date = new Date()): boolean {
  const time = now.getTime();
  if (cafeHunt.opensAt && time < new Date(cafeHunt.opensAt).getTime()) {
    return false;
  }
  if (cafeHunt.closesAt && time > new Date(cafeHunt.closesAt).getTime()) {
    return false;
  }
  return true;
}
