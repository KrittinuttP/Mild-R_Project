"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { XLiveScheduleHistoryRow } from "@/lib/x-live-schedules";

export type XSchedulesRange = { from: string; to: string };

const cache = new Map<string, XLiveScheduleHistoryRow[]>();

function keyOf(range: XSchedulesRange) {
  return `${range.from}:${range.to}`;
}

export function useXLiveSchedules(range: XSchedulesRange) {
  const [rows, setRows] = useState<XLiveScheduleHistoryRow[]>(
    () => cache.get(keyOf(range)) ?? []
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() =>
    cache.has(keyOf(range)) ? "ready" : "loading"
  );
  const [fetchKey, setFetchKey] = useState(0);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const retry = useCallback(() => {
    cache.delete(keyOf(rangeRef.current));
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = keyOf(range);
    const cached = cache.get(key);
    if (cached) {
      setRows(cached);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    const url = `/api/live/x-schedules?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

    fetch(url)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          schedules?: XLiveScheduleHistoryRow[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return body.schedules ?? [];
      })
      .then((schedules) => {
        if (cancelled) return;
        cache.set(key, schedules);
        setRows(schedules);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, fetchKey]);

  return { rows, status, retry };
}
