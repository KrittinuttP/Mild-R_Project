/**
 * Cafe page lock: which page a visitor gets, by time, by a team override
 * stored in the database, or by a test env. Pure functions only (no I/O), so
 * the proxy, the API and the tests share one set of rules.
 * Spec: doc/cafe-countdown.md (E · page lock)
 *
 * Client components may `import type` from here; the defaults below pull in
 * the switch times, so do not import values into browser code.
 */
import {
  COUNTDOWN_PATH,
  COUNTDOWN_TARGETS,
  TEASER_PATH,
} from "@/lib/cafe-countdown";

/** ① CD1 · ② CD2 · ③ the real cafe. */
export const CAFE_PHASES = ["countdown", "teaser", "open"] as const;
export type CafePhase = (typeof CAFE_PHASES)[number];

/** `auto` follows the clock; the others pin a phase. */
export const PHASE_MODES = ["auto", ...CAFE_PHASES] as const;
export type PhaseMode = (typeof PHASE_MODES)[number];

/** For a single page (e.g. the hunt): `auto` opens it with the cafe. */
export const PAGE_MODES = ["auto", "open", "locked"] as const;
export type PageMode = (typeof PAGE_MODES)[number];

export type CafeGateConfig = {
  phase: PhaseMode;
  hunt: PageMode;
  /** Epoch ms: CD1 → CD2. */
  teaserAt: number;
  /** Epoch ms: CD2 → cafe. */
  openAt: number;
};

export const DEFAULT_GATE: CafeGateConfig = {
  phase: "auto",
  hunt: "auto",
  teaserAt: Date.parse(COUNTDOWN_TARGETS.teaser),
  openAt: Date.parse(COUNTDOWN_TARGETS.open),
};

/** Database keys (`mild_r.cafe_gate.key`). Add a key to lock another page. */
export const GATE_KEYS = ["phase", "hunt", "teaser_at", "open_at"] as const;
export type GateKey = (typeof GATE_KEYS)[number];

export function isPhaseMode(value: unknown): value is PhaseMode {
  return typeof value === "string" && (PHASE_MODES as readonly string[]).includes(value);
}

export function isPageMode(value: unknown): value is PageMode {
  return typeof value === "string" && (PAGE_MODES as readonly string[]).includes(value);
}

function isCafePhase(value: unknown): value is CafePhase {
  return typeof value === "string" && (CAFE_PHASES as readonly string[]).includes(value);
}

/** Database rows → config. Unknown keys and bad values fall back to the default. */
export function configFromRows(
  rows: ReadonlyArray<{ key: string; value: string | null }>
): CafeGateConfig {
  const config = { ...DEFAULT_GATE };
  for (const { key, value } of rows) {
    if (key === "phase" && isPhaseMode(value)) config.phase = value;
    if (key === "hunt" && isPageMode(value)) config.hunt = value;
    if (key === "teaser_at" || key === "open_at") {
      const ms = Date.parse(value ?? "");
      if (Number.isFinite(ms)) config[key === "teaser_at" ? "teaserAt" : "openAt"] = ms;
    }
  }
  // A swapped pair would skip CD2 entirely; keep the defaults instead.
  if (config.teaserAt >= config.openAt) {
    config.teaserAt = DEFAULT_GATE.teaserAt;
    config.openAt = DEFAULT_GATE.openAt;
  }
  return config;
}

export function phaseByTime(config: CafeGateConfig, nowMs: number): CafePhase {
  if (nowMs < config.teaserAt) return "countdown";
  if (nowMs < config.openAt) return "teaser";
  return "open";
}

/** Next automatic switch, or null when a phase is pinned or the cafe is open. */
export function nextSwitch(
  config: CafeGateConfig,
  nowMs: number
): { at: number; to: CafePhase } | null {
  if (config.phase !== "auto") return null;
  if (nowMs < config.teaserAt) return { at: config.teaserAt, to: "teaser" };
  if (nowMs < config.openAt) return { at: config.openAt, to: "open" };
  return null;
}

/* ---------------------------------------------------------------- env ---- */

export type GateEnv = {
  /** `CAFE_GATE_BYPASS=1`: every page opens, lock ignored. */
  bypass: boolean;
  /** `CAFE_PHASE=countdown|teaser|open`: pin a phase. */
  phase: CafePhase | null;
};

/**
 * Test switches. Read only in `next dev` and on Vercel preview deploys, so a
 * value left in the production env can never open the cafe early.
 */
export function readGateEnv(env: {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  CAFE_GATE_BYPASS?: string;
  CAFE_PHASE?: string;
}): GateEnv {
  const allowed = env.NODE_ENV === "development" || env.VERCEL_ENV === "preview";
  if (!allowed) return { bypass: false, phase: null };
  const phase = env.CAFE_PHASE?.trim().toLowerCase();
  return {
    bypass: env.CAFE_GATE_BYPASS?.trim() === "1",
    phase: isCafePhase(phase) ? phase : null,
  };
}

/* ------------------------------------------------------------ resolve ---- */

export type GateSource = "env" | "db" | "time";

export type GateState = {
  phase: CafePhase;
  /** Why this phase: test env, team override, or the clock. */
  source: GateSource;
  huntOpen: boolean;
  /** Lock ignored (test env). */
  bypass: boolean;
};

export function resolveGate(
  config: CafeGateConfig,
  env: GateEnv,
  nowMs: number
): GateState {
  let phase: CafePhase;
  let source: GateSource;
  if (env.phase) {
    phase = env.phase;
    source = "env";
  } else if (config.phase !== "auto") {
    phase = config.phase;
    source = "db";
  } else {
    phase = phaseByTime(config, nowMs);
    source = "time";
  }
  const huntOpen =
    config.hunt === "open" ? true : config.hunt === "locked" ? false : phase === "open";
  return { phase, source, huntOpen, bypass: env.bypass };
}

/* ------------------------------------------------------------- routes ---- */

export type GateDecision =
  | { kind: "pass" }
  /** Show another page under the same URL. */
  | { kind: "rewrite"; to: string }
  | { kind: "redirect"; to: string }
  /** API answer while its page is locked. */
  | { kind: "not-found" };

const PASS: GateDecision = { kind: "pass" };
const HOME = "/cafe";

/** Behind their own password, so never locked by time. */
const ALWAYS_OPEN = [
  "/cafe/settings",
  "/cafe/secret",
  "/cafe/lab",
  "/api/cafe/settings",
  "/api/cafe/gate",
];

function under(path: string, base: string) {
  return path === base || path.startsWith(`${base}/`);
}

/** Paths the lock looks at; everything else skips the database read. */
export function isGatedPath(pathname: string) {
  const path = pathname.toLowerCase();
  return under(path, HOME) || under(path, "/api/cafe");
}

/**
 * What to do with a request. `isTeam` = signed in with the team password
 * (sees the real pages at any time, and can still open CD1/CD2 directly).
 */
export function decideCafeRoute(
  pathname: string,
  state: GateState,
  isTeam: boolean
): GateDecision {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (!isGatedPath(path)) return PASS;
  if (ALWAYS_OPEN.some((base) => under(path, base))) return PASS;
  if (state.bypass || isTeam) return PASS;

  if (under(path, "/api/cafe/hunt")) {
    return state.huntOpen ? PASS : { kind: "not-found" };
  }
  if (under(path, "/api/cafe")) return PASS;

  if (under(path, "/cafe/hunt")) {
    return state.huntOpen ? PASS : { kind: "redirect", to: HOME };
  }

  switch (state.phase) {
    case "countdown":
      if (path === HOME) return { kind: "rewrite", to: COUNTDOWN_PATH };
      if (path === COUNTDOWN_PATH) return PASS;
      return { kind: "redirect", to: HOME };
    case "teaser":
      if (path === HOME) return { kind: "rewrite", to: TEASER_PATH };
      if (path === TEASER_PATH) return PASS;
      return { kind: "redirect", to: HOME };
    case "open":
      if (under(path, COUNTDOWN_PATH)) return { kind: "redirect", to: HOME };
      return PASS;
  }
}

/* --------------------------------------------- times for the CD pages ---- */

/** Request header carrying `{ teaserAt, openAt }` from the proxy to the pages. */
export const CAFE_GATE_TIMES_HEADER = "x-cafe-gate-times";

export function encodeGateTimes(config: CafeGateConfig) {
  return `${config.teaserAt}.${config.openAt}`;
}

export function decodeGateTimes(value: string | null): { teaserAt: number; openAt: number } {
  const [teaser, open] = (value ?? "").split(".").map(Number);
  if (Number.isFinite(teaser) && Number.isFinite(open) && teaser < open) {
    return { teaserAt: teaser, openAt: open };
  }
  return { teaserAt: DEFAULT_GATE.teaserAt, openAt: DEFAULT_GATE.openAt };
}

/** "30 · 10 · 2026" in Bangkok time, for the line under the CD2 timer. */
export function bangkokDateLine(ms: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} · ${get("month")} · ${get("year")}`;
}
