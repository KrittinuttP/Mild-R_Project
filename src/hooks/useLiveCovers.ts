"use client";

import { useCallback, useEffect, useState } from "react";

import type { LiveCoverItem } from "@/lib/live-streams";

export type LiveCoversStatus = "idle" | "loading" | "ready" | "error";

/**
 * Fetch live covers once per page visit, only after `enabled` turns true
 * (section near viewport). No polling. `limit` fetches only the newest N.
 */
export function useLiveCovers(enabled: boolean, limit?: number) {
  const [covers, setCovers] = useState<LiveCoverItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<LiveCoversStatus>("idle");
  const [fetchKey, setFetchKey] = useState(0);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("loading");

    const url = limit ? `/api/live/covers?limit=${limit}` : "/api/live/covers";
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          covers?: LiveCoverItem[];
          total?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        const rows = body.covers ?? [];
        setCovers(rows);
        setTotal(typeof body.total === "number" ? body.total : rows.length);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setCovers([]);
        setTotal(0);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, limit, fetchKey]);

  return { covers, total, status, retry };
}
