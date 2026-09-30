"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Current time floored to `intervalMs`, re-rendering when it changes.
 * `null` during SSR / hydration so server and client markup match.
 */
export function useNow(intervalMs: number, enabled = true): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => {};
      const id = window.setInterval(onChange, Math.max(intervalMs / 4, 50));
      return () => window.clearInterval(id);
    },
    [intervalMs, enabled]
  );

  return useSyncExternalStore(
    subscribe,
    () => (enabled ? Math.floor(Date.now() / intervalMs) * intervalMs : null),
    () => null
  );
}
