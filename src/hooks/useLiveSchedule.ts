"use client";

import { useCallback, useEffect, useState } from "react";

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
  const key = cacheKey(range);
  const initialSeed = (): LiveWeek[] | null =>
    scheduleCache.get(key) ?? initialWeeks;
  const [weeks, setWeeks] = useState<LiveWeek[]>(() => initialSeed() ?? []);
  const [status, setStatus] = useState<LiveScheduleStatus>(() =>
    initialSeed() ? "ready" : "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(() => initialSeed() !== null);
  const [resolvedKey, setResolvedKey] = useState(() =>
    initialSeed() ? key : null
  );
  const [fetchKey, setFetchKey] = useState(0);
  /** Range seeded from `initialWeeks` — refetched without clearing / loading UI. */
  const [silentKey, setSilentKey] = useState<string | null>(() =>
    initialWeeks && !scheduleCache.has(key) ? key : null
  );

  const retry = useCallback(() => {
    setSilentKey(null);
    scheduleCache.delete(key);
    setFetchKey((k) => k + 1);
  }, [key]);

  const requestKey = `${key}|${fetchKey}`;
  const [startedKey, setStartedKey] = useState(requestKey);
  if (startedKey !== requestKey) {
    setStartedKey(requestKey);
    const cached = scheduleCache.get(key);
    if (cached) {
      setResolvedKey(key);
      setHasLoaded(true);
      setWeeks(cached);
      setStatus("ready");
      setError(null);
    } else if (silentKey !== key) {
      if (!keepPreviousData) setWeeks([]);
      setStatus("loading");
      setError(null);
    }
  }

  useEffect(() => {
    if (scheduleCache.has(key)) return;
    let cancelled = false;
    const silent = silentKey === key;

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
        setWeeks(data.weeks);
        setResolvedKey(key);
        setHasLoaded(true);
        setStatus("ready");
        setError(null);
        if (silent) setSilentKey(null);
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
  }, [key, range.from, range.to, fetchKey, keepPreviousData, silentKey]);

  return { weeks, status, error, retry, hasLoaded, resolvedKey };
}
