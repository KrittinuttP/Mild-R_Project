"use client";

import { useCallback, useEffect, useState } from "react";

import type { LiveWeek } from "@/types/vtuber";

export type LiveScheduleStatus = "loading" | "ready" | "error";

export function useLiveSchedule() {
  const [weeks, setWeeks] = useState<LiveWeek[]>([]);
  const [status, setStatus] = useState<LiveScheduleStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/live/schedule", { cache: "no-store" });
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
  }, [fetchKey]);

  return { weeks, status, error, retry };
}
