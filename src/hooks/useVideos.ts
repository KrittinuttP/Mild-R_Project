"use client";

import { useCallback, useEffect, useState } from "react";

import type { VideoItem } from "@/types/video";

export type VideosStatus = "idle" | "loading" | "ready" | "error";

type Entry = { status: "ready"; videos: VideoItem[] } | { status: "error" };

const NO_VIDEOS: VideoItem[] = [];

/** Fetch `/api/videos?{query}` once per query per page visit, only while `enabled`. */
export function useVideos(enabled: boolean, query: string) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
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

    fetch(`/api/videos?${query}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          videos?: VideoItem[];
        };
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return body.videos ?? [];
      })
      .then((videos) => {
        if (cancelled) return;
        setEntries((prev) => ({ ...prev, [query]: { status: "ready", videos } }));
      })
      .catch(() => {
        if (cancelled) return;
        setEntries((prev) => ({ ...prev, [query]: { status: "error" } }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, query, entry]);

  const status: VideosStatus = !enabled ? "idle" : (entry?.status ?? "loading");

  return {
    videos: entry?.status === "ready" ? entry.videos : NO_VIDEOS,
    status,
    retry,
  };
}
