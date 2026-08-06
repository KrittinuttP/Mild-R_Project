import type { Metadata } from "next";
import Link from "next/link";

import { LiveViewTrendsPanel } from "@/components/events/LiveViewTrendsPanel";
import {
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
  const ownOnly = params.own !== "0";
  const ranges = parseGrainRanges(params, grain);
  const { from: fromYmd, to: toYmd } = ranges[grain];

  const [rows, peaks] = await Promise.all([
    loadLiveViewTrends({ grain, ownOnly, fromYmd, toYmd }),
    loadLiveViewPeaks({ grain, ownOnly, fromYmd, toYmd }),
  ]);
  const totals = sumTrendRows(rows);

  return (
    <main className="min-h-dvh bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="border-b border-[#f3b8c4]/12 pb-6">
          <p className="text-[0.65rem] tracking-[0.28em] text-[#f3b8c4]/60 uppercase">
            Internal · noindex
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              View trends
            </h1>
            <Link
              href="/live/ops"
              className="text-sm text-[#f3b8c4]/75 underline-offset-4 hover:text-[#fff5f7] hover:underline"
            >
              ← กลับ ops
            </Link>
          </div>
          <p className="mt-2 max-w-xl text-sm text-[#f7d7de]/70">
            ยอดคนดูหลังไลฟ์ · ยอดรวมล่าสุด · ส่วนต่าง (diff) — ช่วงวันที่ของรายวัน
            / เดือน / ปี แยกกันอิสระ
          </p>
        </header>

        <LiveViewTrendsPanel
          rows={rows}
          totals={totals}
          peaks={peaks}
          grain={grain}
          ownOnly={ownOnly}
          ranges={ranges}
        />
      </div>
    </main>
  );
}
