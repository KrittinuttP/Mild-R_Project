import { isLuckyDrawChannel, type LuckyDrawContact } from "@/lib/lucky-draw";

/**
 * Evidence hunt progress, kept in this browser only (localStorage).
 * Browser-only module: call these from event handlers, effects or
 * `useHuntState` — never while rendering on the server.
 */

export const CAFE_HUNT_STORAGE_KEY = "mild-r-cafe-hunt-v1";

const CHANGE_EVENT = "mild-r-cafe-hunt-change";

export type HuntStamp = {
  /** Code from the QR link; sent back to the server as proof when entering. */
  token: string;
  at: string;
};

export type HuntEntry = LuckyDrawContact & { at: string };

export type HuntState = {
  v: 1;
  /** The full preload is shown once per browser, not once per scan. */
  splashSeenAt: string | null;
  noticeAcceptedAt: string | null;
  /** Keyed by evidence id (`ev-1` …). */
  stamps: Record<string, HuntStamp>;
  /** Set after the lucky-wheel form was accepted by the server. */
  entry: HuntEntry | null;
};

export const EMPTY_HUNT_STATE: HuntState = {
  v: 1,
  splashSeenAt: null,
  noticeAcceptedAt: null,
  stamps: {},
  entry: null,
};

/** Copy used for the rest of the visit when the browser refuses to save. */
let memory: string | null = null;
let broken = false;

export function readHuntRaw(): string {
  if (broken) return memory ?? "";
  try {
    return window.localStorage.getItem(CAFE_HUNT_STORAGE_KEY) ?? "";
  } catch {
    broken = true;
    return memory ?? "";
  }
}

/** True once a read or write failed: stamps will be lost when the tab closes. */
export function isHuntStorageBroken(): boolean {
  return broken;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Stored data can be edited by hand, so every field is checked again. */
export function parseHuntState(raw: string): HuntState {
  if (!raw) return EMPTY_HUNT_STATE;

  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_HUNT_STATE;
    data = parsed as Record<string, unknown>;
  } catch {
    return EMPTY_HUNT_STATE;
  }

  const stamps: Record<string, HuntStamp> = {};
  if (data.stamps && typeof data.stamps === "object") {
    for (const [id, value] of Object.entries(
      data.stamps as Record<string, unknown>
    )) {
      if (!value || typeof value !== "object") continue;
      const stamp = value as Record<string, unknown>;
      const token = text(stamp.token);
      const at = text(stamp.at);
      if (token && at) stamps[id] = { token, at };
    }
  }

  let entry: HuntEntry | null = null;
  if (data.entry && typeof data.entry === "object") {
    const value = data.entry as Record<string, unknown>;
    const contactName = text(value.contactName);
    const contactHandle = text(value.contactHandle);
    const at = text(value.at);
    if (
      contactName &&
      contactHandle &&
      at &&
      isLuckyDrawChannel(value.contactChannel)
    ) {
      entry = {
        contactName,
        contactChannel: value.contactChannel,
        contactHandle,
        at,
      };
    }
  }

  return {
    v: 1,
    splashSeenAt: text(data.splashSeenAt),
    noticeAcceptedAt: text(data.noticeAcceptedAt),
    stamps,
    entry,
  };
}

/**
 * Apply a change and save it. Returns false when the browser could not save
 * (private mode, storage blocked or full) — the change then lives in memory
 * until the tab closes, and the page must tell the visitor.
 */
export function updateHuntState(
  change: (state: HuntState) => HuntState
): boolean {
  const next = JSON.stringify(change(parseHuntState(readHuntRaw())));
  memory = next;
  if (!broken) {
    try {
      window.localStorage.setItem(CAFE_HUNT_STORAGE_KEY, next);
    } catch {
      broken = true;
    }
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return !broken;
}

/**
 * Stamp one piece of evidence. `already` when this browser holds it from
 * before (scanning the same point twice never counts twice).
 */
export function addHuntStamp(itemId: string, token: string): "new" | "already" {
  if (parseHuntState(readHuntRaw()).stamps[itemId]) return "already";
  updateHuntState((state) => ({
    ...state,
    stamps: {
      ...state.stamps,
      [itemId]: { token, at: new Date().toISOString() },
    },
  }));
  return "new";
}

/** For `useSyncExternalStore`: also fires when another tab stamps. */
export function subscribeHuntState(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
