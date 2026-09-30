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

export function useLiveSchedule(
  range: LiveScheduleRange,
  {
    keepPreviousData = false,
    initialWeeks = null,
  }: {
    keepPreviousData?: boolean;
    /** Server-rendered weeks for `range`; shown immediately, refreshed silently. */
    initialWeeks?: LiveWeek[] | null;
  } = {}
) {
  const initialSeed = (): LiveWeek[] | null =>
    scheduleCache.get(cacheKey(range)) ?? initialWeeks;
  const [weeks, setWeeks] = useState<LiveWeek[]>(() => initialSeed() ?? []);
  const [status, setStatus] = useState<LiveScheduleStatus>(() =>
    initialSeed() ? "ready" : "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(() => initialSeed() !== null);
  const [resolvedKey, setResolvedKey] = useState(() =>
    initialSeed() ? cacheKey(range) : null
  );
  const [fetchKey, setFetchKey] = useState(0);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const silentKeyRef = useRef<string | null>(
    initialWeeks && !scheduleCache.has(cacheKey(range)) ? cacheKey(range) : null
  );

  const retry = useCallback(() => {
    silentKeyRef.current = null;
    scheduleCache.delete(cacheKey(rangeRef.current));
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(range);
    const cached = scheduleCache.get(key);

    if (cached) {
      setResolvedKey(key);
      setHasLoaded(true);
      setWeeks(cached);
      setStatus("ready");
      setError(null);
      return;
    }

    const silent = silentKeyRef.current === key;

    if (!silent) {
      if (!keepPreviousData) setWeeks([]);
      setStatus("loading");
      setError(null);
    }

    (async () => {
      try {
        const qs = new URLSearchParams({
          from: range.from,
          to: range.to,
        });
        const res = await fetch(`/api/live/schedule?${qs}`);
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
        if (silentKeyRef.current === key) silentKeyRef.current = null;
        setWeeks(data.weeks);
        setResolvedKey(key);
        setHasLoaded(true);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (silent) {
          console.warn("[useLiveSchedule] background refresh failed", err);
          return;
        }
        if (!keepPreviousData) setWeeks([]);
        setStatus("error");
        setError(err instanceof Error ? err.message : "load failed");
        console.error("[useLiveSchedule]", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, fetchKey, keepPreviousData]);

  return { weeks, status, error, retry, hasLoaded, resolvedKey };
}
