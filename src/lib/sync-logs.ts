import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SyncLogRow } from "@/types/sync-log";

export async function loadSyncLogs(limit = 80): Promise<SyncLogRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_sync_logs")
      .select("id, source, status, message, saved_count, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

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
