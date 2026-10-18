/**
 * Read / write the cafe page lock (`mild_r.cafe_gate`, key / value rows).
 * Server only: used by `proxy.ts` and `/api/cafe/gate`.
 *
 * Reads are kept for 30 s per server instance, so the lock costs one small
 * query per instance per 30 s rather than one per page view. A slow or
 * missing database never blocks a page: the last good value is used, or the
 * defaults (which follow the clock).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  configFromRows,
  DEFAULT_GATE,
  type CafeGateConfig,
  type GateKey,
} from "@/lib/cafe-gate";

/** Public view over `mild_r.cafe_gate`. */
const GATE_VIEW = "mild_r_cafe_gate";
const FRESH_MS = 30_000;
/** After a failed read, wait this long before asking the database again. */
const RETRY_MS = 5_000;
const TIMEOUT_MS = 1_500;

type GateRow = { key: string; value: string | null; updated_at?: string };

export type GateLoad = {
  config: CafeGateConfig;
  /** Read from the table (false: defaults, e.g. migration not run yet). */
  stored: boolean;
  error?: string;
};

let cached: { load: GateLoad; until: number } | null = null;
let inflight: Promise<GateLoad> | null = null;
/** Last value read successfully, used while the database is unreachable. */
let lastGood: CafeGateConfig | null = null;

/** Plain REST call with a hard timeout: lighter than a client in the proxy. */
async function fetchRows(): Promise<GateRow[]> {
  const { url, anonKey } = getSupabasePublicEnv();
  const res = await fetch(`${url}/rest/v1/${GATE_VIEW}?select=key,value,updated_at`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`cafe_gate read ${res.status}`);
  return (await res.json()) as GateRow[];
}

async function readGate(): Promise<GateLoad> {
  if (!isSupabaseConfigured()) {
    return { config: DEFAULT_GATE, stored: false, error: "Supabase is not configured" };
  }
  try {
    const rows = await fetchRows();
    const config = configFromRows(rows);
    lastGood = config;
    return { config, stored: rows.length > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cafe_gate]", message);
    return { config: lastGood ?? DEFAULT_GATE, stored: false, error: message };
  }
}

/** Cached read for the proxy. Concurrent callers share one request. */
export async function loadGate(): Promise<GateLoad> {
  const now = Date.now();
  if (cached && now < cached.until) return cached.load;
  if (!inflight) {
    inflight = readGate()
      .then((load) => {
        cached = { load, until: Date.now() + (load.error ? RETRY_MS : FRESH_MS) };
        return load;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Uncached read for the settings page. */
export async function loadGateFresh(): Promise<GateLoad> {
  const load = await readGate();
  cached = { load, until: Date.now() + (load.error ? RETRY_MS : FRESH_MS) };
  return load;
}

/** Service-role upsert. Clears this instance's cache; others follow within 30 s. */
export async function saveGate(updates: Partial<Record<GateKey, string>>): Promise<GateLoad> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const updatedAt = new Date().toISOString();
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value,
    updated_at: updatedAt,
  }));
  if (rows.length > 0) {
    const { error } = await createAdminClient()
      .from(GATE_VIEW)
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  cached = null;
  return loadGateFresh();
}
