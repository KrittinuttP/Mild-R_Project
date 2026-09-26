import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { notifyJobDiscord } from "@/lib/discord-job-alert";
import type { SyncLogRow, SyncLogStatus } from "@/types/sync-log";

/** Source label for Live Schedule Agent runs (ops → อื่น ๆ). */
export const LIVE_SCHEDULE_AGENT_SOURCE = "agent-live-schedule";

export type SyncLogSourceTab = "all" | "main" | "search" | "refresh" | "other";

export type LoadSyncLogsOptions = {
  limit?: number;
  /** Inclusive UTC lower bound (ISO) */
  fromIso?: string | null;
  /** Exclusive UTC upper bound (ISO) */
  toIso?: string | null;
  sourceTab?: SyncLogSourceTab;
};

export type WriteSyncLogInput = {
  source: string;
  status: SyncLogStatus;
  message?: string | null;
  saved_count?: number;
  meta?: Record<string, unknown> | null;
};

/** Insert a sync log row (service role). Same table as YouTube / X sync. */
export async function writeSyncLog(entry: WriteSyncLogInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("mild_r_sync_logs").insert({
      source: entry.source,
      status: entry.status,
      message: entry.message ?? null,
      saved_count: entry.saved_count ?? 0,
      meta: entry.meta ?? null,
    });
    if (error) {
      console.error("[sync_logs] write:", error.message);
    }
  } catch (err) {
    console.error("[sync_logs] write:", err);
  }

  await notifyJobDiscord(entry);
}

export function summarizeLiveAgentRun(options: {
  dryRun?: boolean;
  via: "api" | "cli";
  processed: number;
  results: Array<{
    tweet_id: string;
    status: string;
    imported?: number;
    error?: string;
    toInsert?: number | null;
    skippedDates?: string[];
    attempt?: number;
    nextRetryAt?: string | null;
    recovered?: boolean;
  }>;
}): WriteSyncLogInput {
  const { dryRun, via, processed, results } = options;
  const importedTotal = results.reduce(
    (n, r) => n + (typeof r.imported === "number" ? r.imported : 0),
    0
  );
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped");
  const imported = results.filter((r) => r.status === "imported");

  let status: SyncLogStatus = "success";
  if (processed === 0) status = "skipped";
  else if (failed.length > 0) status = "error";
  else if (imported.length === 0 && skipped.length > 0) status = "skipped";

  const parts: string[] = [];
  if (dryRun) parts.push("dry-run");
  parts.push(`via=${via}`);
  parts.push(`processed=${processed}`);
  if (imported.length) parts.push(`importedRows=${imported.length}`);
  if (skipped.length) parts.push(`skippedRows=${skipped.length}`);
  if (failed.length) parts.push(`failedRows=${failed.length}`);
  const recovered = results.filter((r) => r.recovered);
  if (recovered.length) parts.push(`recovered=${recovered.length}`);
  if (importedTotal) parts.push(`saved=${importedTotal}`);
  if (failed[0]) {
    if (failed[0].attempt) parts.push(`attempt=${failed[0].attempt}`);
    parts.push(
      failed[0].nextRetryAt ? `retryAt=${failed[0].nextRetryAt}` : "noRetry"
    );
    if (failed[0].error) parts.push(failed[0].error.slice(0, 180));
  }

  return {
    source: LIVE_SCHEDULE_AGENT_SOURCE,
    status,
    message: parts.join(" · ") || "Live schedule agent",
    saved_count: importedTotal,
    meta: {
      dryRun: Boolean(dryRun),
      via,
      processed,
      results,
      rowAlerts: !dryRun && processed > 0,
    },
  };
}

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
export function syncLogSourceTab(
  source: string
): Exclude<SyncLogSourceTab, "all"> {
  if (source === "edge-main") return "main";
  if (source === "edge-search") return "search";
  if (source === "edge-refresh") return "refresh";
  return "other";
}
