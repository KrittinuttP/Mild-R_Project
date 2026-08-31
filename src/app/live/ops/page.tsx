import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Radio } from "lucide-react";

import { LiveOpsSyncPanel } from "@/components/events/LiveOpsSyncPanel";
import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  CTA_OUTLINE_CLASS,
  DISPLAY_H1_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
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
    <main className="relative min-h-dvh bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8 sm:py-14">
      {/* 🌟 Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 bg-[radial-gradient(circle,rgba(232,90,122,0.12),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl space-y-12">
        <header className="border-b border-[#f3b8c4]/12 pb-6">
          <BackLink href="/live" className="mb-4">
            กลับหน้าตารางไลฟ์
          </BackLink>
          <div className="mt-4 flex items-center gap-2">
            <Radio className="size-4 text-[#e85a7a]" />
            <p className={META_CLASS}>
              Live Ops & Sync Monitor · Internal
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className={DISPLAY_H1_CLASS}>
              YouTube Sync Monitor
            </h1>
            <Link
              href="/live/ops/trends"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                CTA_OUTLINE_CLASS,
                "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              )}
            >
              <Activity className="size-3.5 text-[#e85a7a]" />
              <span>View trends</span>
            </Link>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#f7d7de]/80">
            ติดตามสถานะ sync YouTube (Main / Search) และประวัติคลิปในช่วงวันที่เลือก
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
