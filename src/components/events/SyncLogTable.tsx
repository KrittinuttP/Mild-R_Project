import { cn } from "@/lib/utils";
import type { SyncLogRow } from "@/types/sync-log";

type SyncLogTableProps = {
  logs: SyncLogRow[];
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function statusClass(status: string) {
  if (status === "success") {
    return "border-emerald-400/35 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "skipped") {
    return "border-[#f3b8c4]/30 bg-[#fff5f7]/05 text-[#f3b8c4]";
  }
  return "border-red-400/35 bg-red-500/10 text-red-100";
}

export function SyncLogTable({ logs }: SyncLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="border border-dashed border-[#f3b8c4]/20 bg-[#1a0d12]/35 px-5 py-8 text-sm text-[#f3b8c4]/70">
        ยังไม่มี sync log — รอ Cron / Edge Function หรือรัน backfill
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[#f3b8c4]/14 bg-[#1a0d12]/45">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#f3b8c4]/12 text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/65 uppercase">
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
              className="border-b border-[#f3b8c4]/08 last:border-0"
            >
              <td className="whitespace-nowrap px-4 py-3 text-[#f7d7de]/85 tabular-nums">
                {formatWhen(log.created_at)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[#fff5f7]">
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
              <td className="px-4 py-3 tabular-nums text-[#f3b8c4]/85">
                {log.saved_count}
              </td>
              <td className="max-w-md px-4 py-3 text-[#f7d7de]/80">
                {log.message ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
