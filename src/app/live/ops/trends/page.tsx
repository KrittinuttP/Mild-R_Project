import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Radio } from "lucide-react";

import { AddManualLiveButton } from "@/components/events/AddManualLiveModal";
import { LiveViewTrendsPanel } from "@/components/events/LiveViewTrendsPanel";
import { BackLink } from "@/components/layout/BackLink";
import {
  R_CTA_OUTLINE_CLASS,
  R_EYEBROW_CLASS,
  R_H1_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import {
  aggregateTrendsFromStreams,
  bucketPeakStreamsFromList,
  countKindStats,
  isAllLiveKinds,
  loadCompletedStreamsInRange,
  loadLiveViewPeaks,
  loadLiveViewTrends,
  parseGrainRanges,
  parseLiveKinds,
  peaksFromStreams,
  streamMatchesKinds,
  sumTrendRows,
} from "@/lib/live-view-trends";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
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
    kinds?: string;
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
  const kinds = parseLiveKinds(params.kinds);
  const ranges = parseGrainRanges(params, grain);
  const { from: fromYmd, to: toYmd } = ranges[grain];

  const streams = await loadCompletedStreamsInRange({
    grain,
    ownOnly,
    fromYmd,
    toYmd,
  });
  const filtered = streams.filter((s) => streamMatchesKinds(s, kinds));

  const [rows, peaks] = isAllLiveKinds(kinds)
    ? await Promise.all([
        loadLiveViewTrends({ grain, ownOnly, fromYmd, toYmd }),
        loadLiveViewPeaks({ grain, ownOnly, fromYmd, toYmd }),
      ])
    : [
        aggregateTrendsFromStreams(filtered, grain),
        peaksFromStreams(filtered),
      ];

  const kindStats = countKindStats(filtered);
  const bucketPeaks = bucketPeakStreamsFromList(filtered, grain);
  const totals = sumTrendRows(rows);
  const isAdmin = await isSiteAdminUnlocked();

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-r-bg px-4 py-10 text-r-text sm:px-8 sm:py-14">
      {/* 🌟 Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 bg-[radial-gradient(circle,rgba(242,67,125,0.14),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl space-y-10">
        <header className="border-b border-r-text-2/12 pb-6">
          <BackLink href="/live" className="mb-4">
            กลับหน้าตารางไลฟ์
          </BackLink>
          <div className="mt-4 flex items-center gap-2">
            <Activity className="size-4 text-r-pri" />
            <p className={R_EYEBROW_CLASS}>Live View Analytics · Internal</p>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className={R_H1_CLASS}>View Trends</h1>
            <div className="flex flex-wrap items-center gap-2.5">
              {isAdmin ? (
                <>
                  <AddManualLiveButton />
                  <Link
                    href="/live/ops"
                    className={cn(
                      R_CTA_OUTLINE_CLASS,
                      "h-9 px-4 text-sm",
                      "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    )}
                  >
                    <Radio className="size-3.5 text-r-pri" />
                    <span>Sync Monitor</span>
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-r-text-2/80">
            วิเคราะห์แนวโน้มยอดคนดูหลังจบไลฟ์, ยอดวิวสะสมล่าสุด และสัดส่วน Solo /
            Collab / Member
          </p>
        </header>

        <LiveViewTrendsPanel
          rows={rows}
          totals={totals}
          peaks={peaks}
          kindStats={kindStats}
          bucketPeaks={bucketPeaks}
          grain={grain}
          ownOnly={ownOnly}
          kinds={kinds}
          ranges={ranges}
        />
      </div>
    </main>
  );
}
