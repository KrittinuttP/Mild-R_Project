"use client";

import { useEffect } from "react";

import { scrollToHashTarget } from "@/lib/scroll-to-hash";

type SectionScrollRestoreProps = {
  /** Wait until true (e.g. after splash) before scrolling to hash */
  ready?: boolean;
};

/**
 * Restores section from URL hash after ready.
 * Without a hash: leave position alone on back/forward; go top on fresh land.
 */
export function SectionScrollRestore({
  ready = true,
}: SectionScrollRestoreProps) {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      const prev = history.scrollRestoration;
      history.scrollRestoration = "manual";
      return () => {
        history.scrollRestoration = prev;
      };
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    const hash = window.location.hash;
    if (hash) {
      const tryScroll = () => scrollToHashTarget(hash, "auto");
      if (tryScroll()) return;

      const t1 = window.setTimeout(tryScroll, 80);
      const t2 = window.setTimeout(tryScroll, 320);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;

    if (nav?.type === "back_forward") return;

    window.scrollTo(0, 0);
  }, [ready]);

  useEffect(() => {
    const onHashChange = () => {
      scrollToHashTarget(window.location.hash, "auto");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}
