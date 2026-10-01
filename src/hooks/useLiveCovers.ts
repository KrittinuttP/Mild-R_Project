"use client";

import { useCallback, useEffect, useState } from "react";

import type { LiveCoverItem } from "@/lib/live-streams";

export type LiveCoversStatus = "idle" | "loading" | "ready" | "error";

type CoversPayload = {
  covers: LiveCoverItem[];
  /** Year the server resolved (`year=latest` → e.g. "2026"). */
  year: string | null;
  years: string[];
};

type Entry = { status: "ready"; data: CoversPayload } | { status: "error" };

export type LiveCoversScope =
  /** Newest N only (home preview). */
  | { kind: "latest"; limit: number }
  /** One year; `null` = newest year with lives. */
  | { kind: "year"; year: string | null }
  /** Whole archive (search / "all years"). */
  | { kind: "all" };

const NO_COVERS: LiveCoverItem[] = [];
const LATEST_YEAR_QUERY = "year=latest";
const ALL_QUERY = "";

/**
 * Fetch live covers once per scope per page visit, only after `enabled` turns
 * true (section near viewport). No polling. Once the whole archive is loaded,
 * every year scope reuses it (callers filter by year locally).
 */
export function useLiveCovers(enabled: boolean, scope: LiveCoversScope) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  /** Last year list / latest year seen — kept while another scope loads. */
  const [years, setYears] = useState<string[]>([]);
  const [latestYear, setLatestYear] = useState<string | null>(null);

  const hasAll = entries[ALL_QUERY]?.status === "ready";
  const query =
    scope.kind === "latest"
      ? `limit=${scope.limit}`
      : scope.kind === "all" || hasAll
        ? ALL_QUERY
        : scope.year === null || scope.year === latestYear
          ? LATEST_YEAR_QUERY
          : `year=${scope.year}`;
  const entry = entries[query];

  const retry = useCallback(() => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[query];
      return next;
    });
  }, [query]);

  useEffect(() => {
    if (!enabled || entry) return;
    let cancelled = false;

    fetch(`/api/live/covers${query ? `?${query}` : ""}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<
          CoversPayload & { error: string }
        >;
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        const data: CoversPayload = {
          covers: body.covers ?? [],
          year: body.year ?? null,
          years: body.years ?? [],
        };
        setEntries((prev) => ({ ...prev, [query]: { status: "ready", data } }));
        if (data.years.length > 0) setYears(data.years);
        if (query === LATEST_YEAR_QUERY && data.year) setLatestYear(data.year);
      })
      .catch(() => {
        if (cancelled) return;
        setEntries((prev) => ({ ...prev, [query]: { status: "error" } }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, query, entry]);

  const status: LiveCoversStatus = !enabled
    ? "idle"
    : (entry?.status ?? "loading");

  return {
    covers: entry?.status === "ready" ? entry.data.covers : NO_COVERS,
    years,
    latestYear,
    status,
    retry,
  };
}
