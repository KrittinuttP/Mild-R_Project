import { cn } from "@/lib/utils";
import type { SyncLogRow } from "@/types/sync-log";

type SyncLogTableProps = {
  logs: SyncLogRow[];
};

function formatWhen(iso: string) {
  return (new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))).replace("Sept", "Sep");
}

function statusClass(status: string) {
  if (status === "success") {
    return "border-emerald-400/35 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "skipped") {
    return "border-r-text-2/30 bg-r-text/05 text-r-text-2";
  }
  return "border-red-400/35 bg-red-500/10 text-red-100";
}

export function SyncLogTable({ logs }: SyncLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-r-text-2/20 bg-white/[0.03] px-5 py-8 text-sm text-r-text-2/70">
        ยังไม่มี sync log — รอ Cron / Edge Function หรือรัน backfill
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white/[0.03] ring-1 ring-r-line ring-inset">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-r-text-2/12 text-[0.65rem] tracking-[0.18em] text-r-text-2/65 uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Saved</th>
            <th className="px-4 py-3 font-medium">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-r-text-2/08 last:border-0"
            >
              <td className="whitespace-nowrap px-4 py-3 text-r-text-2/85 tabular-nums">
                {formatWhen(log.created_at)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-r-text">
                {log.source}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-0.5 text-[0.62rem] tracking-[0.14em] uppercase",
                    statusClass(log.status)
                  )}
                >
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums text-r-text-2/85">
                {log.saved_count}
              </td>
              <td className="max-w-md px-4 py-3 text-r-text-2/80">
                {log.message ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
