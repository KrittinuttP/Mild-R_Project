"use client";

import { useNow } from "@/hooks/useNow";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { daysSinceDebut } from "@/lib/milestones";

/**
 * "Day N since debut" (debut day = 1), Bangkok calendar, refreshed every minute.
 * `null` on the server / first paint — the number depends on today's date.
 */
export function useDebutDay(debutYmd: string): number | null {
  const nowMs = useNow(60_000);
  if (nowMs === null) return null;
  const today = bangkokDateFromIso(new Date(nowMs).toISOString());
  return today ? daysSinceDebut(debutYmd, today) : null;
}
