"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { YoutubeLiveArchive } from "@/components/events/YoutubeLiveArchive";
import { cn } from "@/lib/utils";
import type { SyncLogSourceTab } from "@/lib/sync-logs";
import type { LiveStreamRow } from "@/types/live-stream";
import type { SyncLogRow } from "@/types/sync-log";

type RangePreset = "1d" | "7d" | "14d" | "30d" | "custom";

type StreamPartition = {
  live: LiveStreamRow[];
  upcoming: LiveStreamRow[];
  ended: LiveStreamRow[];
  cancelled: LiveStreamRow[];
};

const EMPTY_STREAMS: StreamPartition = {
  live: [],
  upcoming: [],
  ended: [],
  cancelled: [],
};

function normalizeStreams(value: unknown): StreamPartition {
  if (!value || typeof value !== "object") return EMPTY_STREAMS;
  const v = value as Partial<StreamPartition>;
  return {
    live: Array.isArray(v.live) ? v.live : [],
    upcoming: Array.isArray(v.upcoming) ? v.upcoming : [],
    ended: Array.isArray(v.ended) ? v.ended : [],
    cancelled: Array.isArray(v.cancelled) ? v.cancelled : [],
  };
}

type LiveOpsSyncPanelProps = {
  initialLogs: SyncLogRow[];
  initialStreams: StreamPartition;
  initialFromYmd: string;
  initialToYmd: string;
};

const PRESETS: { id: RangePreset; label: string; days: number | null }[] = [
  { id: "1d", label: "1 วัน", days: 1 },
  { id: "7d", label: "7 วัน", days: 7 },
  { id: "14d", label: "14 วัน", days: 14 },
  { id: "30d", label: "1 เดือน", days: 30 },
  { id: "custom", label: "กำหนดเอง", days: null },
];

const TABS: { id: SyncLogSourceTab; label: string; hint: string }[] = [
  { id: "all", label: "ทั้งหมด", hint: "ทุกแหล่ง sync" },
  { id: "main", label: "Main", hint: "ช่อง Mild-R · ทุก 30 นาที" },
  { id: "search", label: "Search", hint: "Related / search · ทุก 6 ชม." },
  { id: "refresh", label: "Refresh", hint: "อัปยอดวิว/ไลก์ · ทุก 6 ชม." },
  { id: "other", label: "อื่น ๆ", hint: "Backfill · manual · error" },
];

function bangkokYmdToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function rangeFromPreset(preset: RangePreset): { from: string; to: string } {
  const to = bangkokYmdToday();
  if (preset === "custom") return { from: to, to };
  const days = PRESETS.find((p) => p.id === preset)?.days ?? 7;
  return { from: addDaysYmd(to, -(days - 1)), to };
}

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

function sourceBadgeClass(source: string) {
  if (source === "edge-main") {
    return "border-[#e85a7a]/40 bg-[#e85a7a]/12 text-[#f3b8c4]";
  }
  if (source === "edge-search") {
    return "border-[#7eb6d4]/45 bg-[#7eb6d4]/12 text-[#b8d9ec]";
  }
  if (source === "edge-refresh") {
    return "border-[#7dd3c0]/45 bg-[#7dd3c0]/12 text-[#b8ede0]";
  }
  return "border-[#d4a574]/40 bg-[#d4a574]/12 text-[#e8c49a]";
}

export function LiveOpsSyncPanel({
  initialLogs,
  initialStreams,
  initialFromYmd,
  initialToYmd,
}: LiveOpsSyncPanelProps) {
  const [sourceTab, setSourceTab] = useState<SyncLogSourceTab>("all");
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [fromYmd, setFromYmd] = useState(initialFromYmd);
  const [toYmd, setToYmd] = useState(initialToYmd);
  const [logs, setLogs] = useState(initialLogs);
  const [streams, setStreams] = useState(() =>
    normalizeStreams(initialStreams)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bootRef = useRef({
    from: initialFromYmd,
    to: initialToYmd,
    tab: "all" as SyncLogSourceTab,
  });
  const skipBootFetch = useRef(true);

  const fetchBundle = useCallback(
    async (from: string, to: string, tab: SyncLogSourceTab) => {
      setBusy(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ from, to, source: tab });
        const res = await fetch(`/api/live/ops?${qs}`, { cache: "no-store" });
        const data = (await res.json()) as {
          logs?: SyncLogRow[];
          streams?: StreamPartition;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "โหลดไม่สำเร็จ");
          return;
        }
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setStreams(normalizeStreams(data.streams));
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    if (skipBootFetch.current) {
      const boot = bootRef.current;
      if (
        fromYmd === boot.from &&
        toYmd === boot.to &&
        sourceTab === boot.tab
      ) {
        skipBootFetch.current = false;
        return;
      }
      skipBootFetch.current = false;
    }
    void fetchBundle(fromYmd, toYmd, sourceTab);
  }, [fromYmd, toYmd, sourceTab, fetchBundle]);

  const safeStreams = streams ?? EMPTY_STREAMS;

  const counts = useMemo(() => {
    let success = 0;
    let errorCount = 0;
    let saved = 0;
    for (const log of logs) {
      if (log.status === "success") success += 1;
      else if (log.status === "error") errorCount += 1;
      saved += log.saved_count ?? 0;
    }
    const streamTotal =
      safeStreams.live.length +
      safeStreams.upcoming.length +
      safeStreams.ended.length +
      safeStreams.cancelled.length;
    return { success, errorCount, saved, total: logs.length, streamTotal };
  }, [logs, safeStreams]);

  function applyPreset(next: RangePreset) {
    setPreset(next);
    if (next === "custom") return;
    const range = rangeFromPreset(next);
    // Always bump fetch even if dates match (force reload)
    if (range.from === fromYmd && range.to === toYmd) {
      void fetchBundle(range.from, range.to, sourceTab);
      return;
    }
    setFromYmd(range.from);
    setToYmd(range.to);
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[0.7rem] tracking-[0.22em] text-[#e85a7a] uppercase">
              Sync logs
            </h2>
            <p className="mt-1 text-xs text-[#f3b8c4]/55">
              แยกตามโหมดดึง · กรองช่วงเวลา (Asia/Bangkok) — streams ใช้ช่วงเดียวกัน
            </p>
          </div>
          <p className="text-[0.65rem] tabular-nums text-[#f3b8c4]/50">
            {busy
              ? "กำลังโหลด…"
              : `${counts.total} logs · ${counts.streamTotal} streams · saved ${counts.saved}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              title={tab.hint}
              onClick={() => setSourceTab(tab.id)}
              className={cn(
                "border px-3 py-1.5 text-[0.65rem] tracking-[0.14em] uppercase transition",
                sourceTab === tab.id
                  ? "border-[#e85a7a]/55 bg-[#e85a7a]/15 text-[#fff5f7]"
                  : "border-[#f3b8c4]/18 bg-[#1a0d12]/40 text-[#f3b8c4]/70 hover:border-[#f3b8c4]/35"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={cn(
                "border px-2.5 py-1 text-[0.62rem] tracking-[0.12em] uppercase transition",
                preset === p.id
                  ? "border-[#7eb6d4]/50 bg-[#7eb6d4]/12 text-[#b8d9ec]"
                  : "border-[#f3b8c4]/15 text-[#f3b8c4]/60 hover:border-[#f3b8c4]/30"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-[0.65rem] tracking-[0.12em] text-[#f3b8c4]/65 uppercase">
            เริ่ม
            <input
              type="date"
              value={fromYmd}
              onChange={(e) => {
                setPreset("custom");
                setFromYmd(e.target.value);
              }}
              className="block border border-[#f3b8c4]/20 bg-[#10070b] px-2.5 py-1.5 text-sm normal-case tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/45"
            />
          </label>
          <span className="pb-2 text-[#f3b8c4]/40">→</span>
          <label className="space-y-1 text-[0.65rem] tracking-[0.12em] text-[#f3b8c4]/65 uppercase">
            สิ้นสุด
            <input
              type="date"
              value={toYmd}
              onChange={(e) => {
                setPreset("custom");
                setToYmd(e.target.value);
              }}
              className="block border border-[#f3b8c4]/20 bg-[#10070b] px-2.5 py-1.5 text-sm normal-case tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/45"
            />
          </label>
          <div className="flex flex-wrap gap-2 pb-1 text-[0.6rem] text-[#f3b8c4]/45">
            <span>สำเร็จ {counts.success}</span>
            <span>·</span>
            <span>error {counts.errorCount}</span>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-[#ffb3bc]">{error}</p>
        ) : null}

        {logs.length === 0 && !busy ? (
          <div className="border border-dashed border-[#f3b8c4]/20 bg-[#1a0d12]/35 px-5 py-8 text-sm text-[#f3b8c4]/70">
            ไม่มี sync log ในช่วงที่เลือก
          </div>
        ) : (
          <div className="max-h-[min(70dvh,calc(100dvh-16rem))] overflow-auto border border-[#f3b8c4]/14 bg-[#1a0d12]/45">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-[#f3b8c4]/12 bg-[#160b10] text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/65 uppercase shadow-[0_1px_0_0_rgba(243,184,196,0.12)]">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Saved</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className={cn(busy && "opacity-60")}>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#f3b8c4]/08 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[#f7d7de]/85 tabular-nums">
                      {formatWhen(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 font-mono text-[0.62rem]",
                          sourceBadgeClass(log.source)
                        )}
                      >
                        {log.source}
                      </span>
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
        )}
      </div>

      <section className={cn("space-y-4 border-t border-[#f3b8c4]/12 pt-10", busy && "opacity-70")}>
        <div>
          <h2 className="text-[0.7rem] tracking-[0.22em] text-[#e85a7a] uppercase">
            YouTube streams
          </h2>
          <p className="mt-1 text-xs text-[#f3b8c4]/55">
            คลิปในช่วง {fromYmd} → {toYmd} (Bangkok) · {counts.streamTotal} รายการ
          </p>
        </div>
        <YoutubeLiveArchive
          live={safeStreams.live}
          upcoming={safeStreams.upcoming}
          ended={safeStreams.ended}
          cancelled={safeStreams.cancelled}
          showAll
        />
      </section>
    </div>
  );
}
