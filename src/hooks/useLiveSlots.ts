"use client";

import { useEffect, useState } from "react";

import { flattenLiveSlots } from "@/lib/events";
import type { LiveSlot, LiveWeek } from "@/types/vtuber";

const REFRESH_MS = 2 * 60_000;
/** Used while `fastWhen` says a start is near, so LIVE shows soon after the tracker sees it. */
const FAST_REFRESH_MS = 30_000;

/**
 * Live slots for a Bangkok date range from `/api/live/schedule`, re-polled every 2 min
 * (30 s while `fastWhen(slots)` is true). `null` until the first load for this range.
 * Network errors keep the last result — callers treat live info as optional.
 */
export function useLiveSlots(
  from: string | null,
  to: string | null,
  fastWhen?: (slots: LiveSlot[]) => boolean
): LiveSlot[] | null {
  const key = from && to ? `${from}_${to}` : null;
  const [loaded, setLoaded] = useState<{ key: string; slots: LiveSlot[] } | null>(null);

  const current = key && loaded?.key === key ? loaded.slots : null;
  const fast = Boolean(current && fastWhen?.(current));

  useEffect(() => {
    if (!from || !to || !key) return;
    let cancelled = false;

    const load = async () => {
      try {
        const qs = new URLSearchParams({ from, to });
        const res = await fetch(`/api/live/schedule?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { weeks?: LiveWeek[] };
        if (cancelled || !Array.isArray(data.weeks)) return;
        setLoaded({ key, slots: flattenLiveSlots(data.weeks) });
      } catch {
        /* optional data — keep what we have */
      }
    };

    void load();
    const id = window.setInterval(load, fast ? FAST_REFRESH_MS : REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [from, to, key, fast]);

  return current;
}
