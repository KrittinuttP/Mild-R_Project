import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Radio, Sparkles } from "lucide-react";

import { AddManualLiveButton } from "@/components/events/AddManualLiveModal";
import { LiveViewTrendsPanel } from "@/components/events/LiveViewTrendsPanel";
import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  CTA_OUTLINE_CLASS,
  DISPLAY_H1_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import {
  loadLiveKindStats,
  loadLiveViewPeaks,
  loadLiveViewTrends,
  parseGrainRanges,
  sumTrendRows,
} from "@/lib/live-view-trends";
import type { TrendGrain } from "@/types/live-view-trends";

export const metadata: Metadata = {
  title: "Live view trends",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    grain?: string;
    own?: string;
    from?: string;
    to?: string;
    from_day?: string;
    to_day?: string;
    from_month?: string;
    to_month?: string;
    from_year?: string;
    to_year?: string;
  }>;
};

function parseGrain(value: string | undefined): TrendGrain {
  if (value === "month" || value === "year" || value === "day") return value;
  return "day";
}

export default async function LiveOpsTrendsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const grain = parseGrain(params.grain);
  const ownOnly = params.own === "1";
  const ranges = parseGrainRanges(params, grain);
  const { from: fromYmd, to: toYmd } = ranges[grain];

  const [rows, peaks, kindStats] = await Promise.all([
    loadLiveViewTrends({ grain, ownOnly, fromYmd, toYmd }),
    loadLiveViewPeaks({ grain, ownOnly, fromYmd, toYmd }),
    loadLiveKindStats({ grain, ownOnly, fromYmd, toYmd }),
  ]);
  const totals = sumTrendRows(rows);

  return (
    <main className="relative min-h-dvh bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8 sm:py-14">
      {/* 🌟 Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 bg-[radial-gradient(circle,rgba(232,90,122,0.14),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl space-y-10">
        <header className="border-b border-[#f3b8c4]/12 pb-6">
          <BackLink href="/live" className="mb-4">
            กลับหน้าตารางไลฟ์
          </BackLink>
          <div className="mt-4 flex items-center gap-2">
            <Activity className="size-4 text-[#e85a7a]" />
            <p className={META_CLASS}>
              Live View Analytics · Internal
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className={DISPLAY_H1_CLASS}>
              View Trends
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <AddManualLiveButton />
              <Link
                href="/live/ops"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  CTA_OUTLINE_CLASS,
                  "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                )}
              >
                <Radio className="size-3.5 text-[#e85a7a]" />
                <span>Sync Monitor</span>
              </Link>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#f7d7de]/80">
            วิเคราะห์แนวโน้มยอดคนดูหลังจบไลฟ์, ยอดวิวสะสมล่าสุด และสัดส่วน Solo / Collab / Member
          </p>
        </header>

        <LiveViewTrendsPanel
          rows={rows}
          totals={totals}
          peaks={peaks}
          kindStats={kindStats}
          grain={grain}
          ownOnly={ownOnly}
          ranges={ranges}
        />
      </div>
    </main>
  );
}
