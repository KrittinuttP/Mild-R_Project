export type SyncLogStatus = "success" | "error" | "skipped";

export type SyncLogRow = {
  id: string;
  source: string;
  status: SyncLogStatus | string;
  message: string | null;
  saved_count: number;
  meta: Record<string, unknown> | null;
  created_at: string;
};
