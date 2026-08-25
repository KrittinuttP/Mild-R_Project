import type { Metadata } from "next";
import Link from "next/link";

import { LiveOpsSyncPanel } from "@/components/events/LiveOpsSyncPanel";
import { BackLink } from "@/components/layout/BackLink";
import {
  bangkokInclusiveToUtcRange,
  bangkokYmdToday,
} from "@/lib/live-view-trends";
import {
  loadLiveStreamsInRange,
  partitionLiveStreams,
} from "@/lib/live-streams";
import { loadSyncLogs } from "@/lib/sync-logs";

export const metadata: Metadata = {
  title: "YouTube Sync Monitor",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Hidden ops page — not linked from public nav. Open `/live/ops` directly. */
export default async function LiveOpsPage() {
  const toYmd = bangkokYmdToday();
  const fromYmd = addDaysYmd(toYmd, -6); // default 7 days inclusive
  const { from, to } = bangkokInclusiveToUtcRange(fromYmd, toYmd);

  const [streamRows, logs] = await Promise.all([
    loadLiveStreamsInRange(fromYmd, toYmd, 500),
    loadSyncLogs({
      fromIso: from,
      toIso: to,
      sourceTab: "all",
      limit: 1500,
    }),
  ]);
  const streams = partitionLiveStreams(streamRows);

  return (
    <main className="min-h-dvh bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="border-b border-[#f3b8c4]/12 pb-6">
          <BackLink href="/live" className="mb-6">
            ตารางไลฟ์
          </BackLink>
          <p className="mt-6 text-[0.65rem] tracking-[0.28em] text-[#f3b8c4]/60 uppercase">
            Internal · noindex
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              YouTube Sync Monitor
            </h1>
            <Link
              href="/live/ops/trends"
              className="border border-[#e85a7a]/45 bg-[#e85a7a]/10 px-3 py-1.5 text-[0.7rem] tracking-[0.16em] text-[#fff5f7] uppercase transition-colors hover:border-[#e85a7a]/7 hover:bg-[#e85a7a]/18"
            >
              View trends →
            </Link>
          </div>
          <p className="mt-2 max-w-xl text-sm text-[#f7d7de]/70">
            ติดตาม sync YouTube (Main / Search) และคลิปในช่วงวันที่เลือก —
            หน้าซ่อน ไม่โชว์ในเมนูเว็บ
          </p>
        </header>

        <LiveOpsSyncPanel
          initialLogs={logs}
          initialStreams={streams}
          initialFromYmd={fromYmd}
          initialToYmd={toYmd}
        />
      </div>
    </main>
  );
}
