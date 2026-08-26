"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LiveWeek } from "@/types/vtuber";

export type LiveScheduleStatus = "loading" | "ready" | "error";

export type LiveScheduleRange = {
  from: string;
  to: string;
};

const scheduleCache = new Map<string, LiveWeek[]>();

function cacheKey(range: LiveScheduleRange) {
  return `${range.from}:${range.to}`;
}

export function useLiveSchedule(range: LiveScheduleRange) {
  const [weeks, setWeeks] = useState<LiveWeek[]>(() => {
    return scheduleCache.get(cacheKey(range)) ?? [];
  });
  const [status, setStatus] = useState<LiveScheduleStatus>(() =>
    scheduleCache.has(cacheKey(range)) ? "ready" : "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const retry = useCallback(() => {
    scheduleCache.delete(cacheKey(rangeRef.current));
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(range);
    const cached = scheduleCache.get(key);

    if (cached) {
      setWeeks(cached);
      setStatus("ready");
      setError(null);
      return;
    }

    setWeeks([]);
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const qs = new URLSearchParams({
          from: range.from,
          to: range.to,
        });
        const res = await fetch(`/api/live/schedule?${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          weeks?: LiveWeek[];
          error?: string;
        };
        if (cancelled) return;
        if (!Array.isArray(data.weeks)) {
          throw new Error(data.error ?? "invalid response");
        }
        scheduleCache.set(key, data.weeks);
        setWeeks(data.weeks);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setWeeks([]);
        setStatus("error");
        setError(err instanceof Error ? err.message : "load failed");
        console.error("[useLiveSchedule]", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, fetchKey]);

  return { weeks, status, error, retry };
}
