"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SOFT_NAV_KEY = "mild-r-soft-nav";

/** Marks in-session client navigations so home splash can skip. */
export function SoftNavMarker() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== pathname) {
      try {
        sessionStorage.setItem(SOFT_NAV_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    prev.current = pathname;
  }, [pathname]);

  return null;
}

export function wasSoftNavigation() {
  try {
    return sessionStorage.getItem(SOFT_NAV_KEY) === "1";
  } catch {
    return false;
  }
}

export function isReloadNavigation() {
  const nav = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}
