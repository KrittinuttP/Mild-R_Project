"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  isHuntStorageBroken,
  parseHuntState,
  readHuntRaw,
  subscribeHuntState,
  type HuntState,
} from "@/lib/cafe-hunt-storage";

/**
 * Hunt progress from this browser.
 * `state` is null on the server and for the first client render (nothing can
 * be read yet), so callers must treat null as "still loading", not "empty".
 */
export function useHuntState(): { state: HuntState | null; broken: boolean } {
  const raw = useSyncExternalStore<string | null>(
    subscribeHuntState,
    readHuntRaw,
    () => null
  );
  const broken = useSyncExternalStore(
    subscribeHuntState,
    isHuntStorageBroken,
    () => false
  );
  const state = useMemo(
    () => (raw === null ? null : parseHuntState(raw)),
    [raw]
  );
  return { state, broken };
}
