import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SyncLogRow } from "@/types/sync-log";

export type SyncLogSourceTab = "all" | "main" | "search" | "refresh" | "other";

export type LoadSyncLogsOptions = {
  limit?: number;
  /** Inclusive UTC lower bound (ISO) */
  fromIso?: string | null;
  /** Exclusive UTC upper bound (ISO) */
  toIso?: string | null;
  sourceTab?: SyncLogSourceTab;
};

function applySourceFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  tab: SyncLogSourceTab | undefined
) {
  if (!tab || tab === "all") return query;
  if (tab === "main") {
    return query.eq("source", "edge-main");
  }
  if (tab === "search") {
    return query.eq("source", "edge-search");
  }
  if (tab === "refresh") {
    return query.eq("source", "edge-refresh");
  }
  return query.not("source", "in", "(edge-main,edge-search,edge-refresh)");
}

export async function loadSyncLogs(
  limitOrOpts: number | LoadSyncLogsOptions = 80
): Promise<SyncLogRow[]> {
  if (!isSupabaseConfigured()) return [];

  const opts: LoadSyncLogsOptions =
    typeof limitOrOpts === "number" ? { limit: limitOrOpts } : limitOrOpts;
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), 2000);

  try {
    const supabase = createPublicClient();
    let query = supabase
      .from("mild_r_sync_logs")
      .select("id, source, status, message, saved_count, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts.fromIso) {
      query = query.gte("created_at", opts.fromIso);
    }
    if (opts.toIso) {
      query = query.lt("created_at", opts.toIso);
    }
    query = applySourceFilter(query, opts.sourceTab);

    const { data, error } = await query;

    if (error) {
      console.error("[sync_logs]", error.message);
      return [];
    }

    return (data ?? []) as SyncLogRow[];
  } catch (err) {
    console.error("[sync_logs]", err);
    return [];
  }
}

/** Classify sync source into ops tab buckets. */
export function syncLogSourceTab(source: string): Exclude<SyncLogSourceTab, "all"> {
  if (source === "edge-main") return "main";
  if (source === "edge-search") return "search";
  return "other";
}
