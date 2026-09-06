"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Layers,
  Radio,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Tv,
  Users,
  Video,
} from "lucide-react";

import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import { LiveViewTrendsChart } from "@/components/events/LiveViewTrendsChart";
import { createClient } from "@/lib/supabase/client";
import { liveStreamToSlot } from "@/lib/live-stream-utils";
import {
  countKindStats,
  defaultFromToYmd,
  grainRangesToSearchParams,
  loadStreamsInBucket,
  type TrendGrainRanges,
} from "@/lib/live-view-trends";
import { cn } from "@/lib/utils";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H2_CLASS,
  GLASS_CARD_CLASS,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_MILD,
  LIVE_BADGE_PILL_SM,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { getYoutubeThumbnailUrl } from "@/lib/youtube";
import type {
  LiveKindStats,
  LiveTrendStreamItem,
  LiveViewPeaks,
  LiveViewPeakStream,
  LiveViewTrendRow,
  LiveViewTrendTotals,
  TrendGrain,
} from "@/types/live-view-trends";
import type { LiveSlot } from "@/types/vtuber";

type LiveViewTrendsPanelProps = {
  rows: LiveViewTrendRow[];
  totals: LiveViewTrendTotals;
  peaks: LiveViewPeaks;
  kindStats: LiveKindStats;
  grain: TrendGrain;
  ownOnly: boolean;
  ranges: TrendGrainRanges;
};

function formatViews(n: number) {
  return new Intl.NumberFormat("th-TH").format(n);
}

function formatBucket(bucket: string, grain: TrendGrain) {
  const d = new Date(`${bucket}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return bucket;
  if (grain === "year") {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(d);
  }
  if (grain === "month") {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "long",
    }).format(d);
  }
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
  }).format(d);
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function trendsHref(options: {
  grain: TrendGrain;
  ownOnly: boolean;
  ranges: TrendGrainRanges;
}) {
  const active = options.ranges[options.grain];
  const params = new URLSearchParams({
    grain: options.grain,
    own: options.ownOnly ? "1" : "0",
    from: active.from,
    to: active.to,
    ...grainRangesToSearchParams(options.ranges),
  });
  return `/live/ops/trends?${params.toString()}`;
}

const GRAIN_LABEL: Record<TrendGrain, string> = {
  day: "รายวัน",
  month: "รายเดือน",
  year: "รายปี",
};

const GRAINS: { id: TrendGrain; label: string }[] = [
  { id: "day", label: "รายวัน" },
  { id: "month", label: "รายเดือน" },
  { id: "year", label: "รายปี" },
];

const dateInputClass =
  "rounded-2xl border border-[#f3b8c4]/20 bg-[#12070c]/90 px-3.5 py-2 text-sm text-[#fff5f7] outline-none transition focus:border-[#e85a7a] focus:ring-1 focus:ring-[#e85a7a]/40 [color-scheme:dark]";

export function LiveViewTrendsPanel({
  rows,
  totals,
  peaks,
  kindStats,
  grain,
  ownOnly,
  ranges,
}: LiveViewTrendsPanelProps) {
  const router = useRouter();
  const fromYmd = ranges[grain].from;
  const toYmd = ranges[grain].to;
  const [draftFrom, setDraftFrom] = useState(fromYmd);
  const [draftTo, setDraftTo] = useState(toYmd);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [streams, setStreams] = useState<LiveTrendStreamItem[]>([]);
  const [bucketPeaks, setBucketPeaks] = useState<LiveViewPeaks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const detailRef = useRef<HTMLElement | null>(null);

  function openLiveModal(item: LiveTrendStreamItem | LiveViewPeakStream) {
    setActiveSlot(trendItemToSlot(item));
    setModalOpen(true);
  }

  useEffect(() => {
    setDraftFrom(fromYmd);
    setDraftTo(toYmd);
    setSelectedBucket(null);
    setStreams([]);
    setBucketPeaks(null);
    setError(null);
  }, [grain, ownOnly, fromYmd, toYmd]);

  function applyDateRange() {
    let from = draftFrom;
    let to = draftTo;
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }
    router.push(
      trendsHref({
        grain,
        ownOnly,
        ranges: { ...ranges, [grain]: { from, to } },
      })
    );
  }

  function resetDateRange() {
    const d = defaultFromToYmd(grain);
    router.push(
      trendsHref({
        grain,
        ownOnly,
        ranges: { ...ranges, [grain]: d },
      })
    );
  }

  function selectBucket(bucket: string) {
    setSelectedBucket(bucket);
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const list = await loadStreamsInBucket(supabase, {
          bucket,
          grain,
          ownOnly,
        });
        setStreams(list);
        setBucketPeaks({
          byLatest: peakFromList(list, "latest_views"),
          byOnEnd: peakFromList(list, "views_on_end"),
        });
        requestAnimationFrame(() => {
          detailRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      } catch (err) {
        setStreams([]);
        setBucketPeaks(null);
        setError(err instanceof Error ? err.message : "โหลดไลฟ์ไม่สำเร็จ");
      }
    });
  }

  const activePeaks = peaks;
  const peakScopeLabel = `${GRAIN_LABEL[grain]} · ${fromYmd} → ${toYmd}`;
  const selectedTrendRow =
    rows.find((r) => r.bucket === selectedBucket) ?? null;

  const displayKindStats = useMemo(() => {
    if (selectedBucket && !pending) {
      return countKindStats(streams);
    }
    return kindStats;
  }, [selectedBucket, pending, streams, kindStats]);

  const kindStatsLabel = selectedBucket
    ? `สรุป · ${formatBucket(selectedBucket, grain)}`
    : "สรุปช่วงนี้";

  return (
    <div className="space-y-8">
      {/* 🎛️ Navigation Filter Bars */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Grain Selector */}
        <div className="flex items-center gap-1.5 rounded-full border border-[#f3b8c4]/15 bg-[#14080e]/90 p-1 shadow-inner">
          {GRAINS.map((g) => (
            <Link
              key={g.id}
              href={trendsHref({
                grain: g.id,
                ownOnly,
                ranges,
              })}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition",
                grain === g.id
                  ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_12px_rgba(232,90,122,0.35)]"
                  : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
              )}
            >
              {g.label}
            </Link>
          ))}
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-1.5 rounded-full border border-[#f3b8c4]/15 bg-[#14080e]/90 p-1 shadow-inner">
          <Link
            href={trendsHref({ grain, ownOnly: true, ranges })}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition",
              ownOnly
                ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_12px_rgba(232,90,122,0.35)]"
                : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
            )}
          >
            ช่อง Mild-R
          </Link>
          <Link
            href={trendsHref({ grain, ownOnly: false, ranges })}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition",
              !ownOnly
                ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_12px_rgba(232,90,122,0.35)]"
                : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
            )}
          >
            รวมทั้งหมด
          </Link>
        </div>
      </div>

      {/* 📅 Date Range Filter Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/80 to-[#14080e]/90 p-5 shadow-lg sm:p-6">
        <div className="flex items-center justify-between gap-2 border-b border-[#f3b8c4]/10 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-[#e85a7a]" />
            <p className={META_CLASS}>
              ช่วงเวลา · {GRAIN_LABEL[grain]} (Asia/Bangkok)
            </p>
          </div>
          <span className="text-[0.68rem] text-[#f3b8c4]/50">
            {fromYmd} → {toYmd}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium text-[#f3b8c4]/70">วันที่เริ่มต้น (Start)</span>
            <input
              type="date"
              className={dateInputClass}
              value={draftFrom}
              max={draftTo}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium text-[#f3b8c4]/70">วันที่สิ้นสุด (End)</span>
            <input
              type="date"
              className={dateInputClass}
              value={draftTo}
              min={draftFrom}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={applyDateRange}
              className={cn(
                CTA_PRIMARY_CLASS,
                "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              )}
            >
              <Filter className="size-3.5" />
              <span>ใช้ช่วงนี้</span>
            </button>
            <button
              type="button"
              onClick={resetDateRange}
              className={cn(
                CTA_OUTLINE_CLASS,
                "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              )}
            >
              <RotateCcw className="size-3.5" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 Metric Summary Cards */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatCard
          label="หลังจบไลฟ์ (รวม)"
          sublabel="Views on stream end"
          value={totals.views_on_end}
          icon={Radio}
        />
        <StatCard
          label="ยอดสะสมล่าสุด"
          sublabel="Latest accumulated views"
          value={totals.latest_views}
          icon={Flame}
        />
        <StatCard
          label="วิวเพิ่มขึ้น (Diff)"
          sublabel="Views after stream"
          value={totals.views_diff}
          accent
          icon={TrendingUp}
        />
      </div>

      {/* 🏆 Peak Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className={META_CLASS}>
            ยอดวิวสูงสุด · {peakScopeLabel}
          </p>
          <p className="text-xs text-[#f3b8c4]/60">
            {totals.stream_count.toLocaleString("th-TH")} ไลฟ์ในช่วงที่เลือก
          </p>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <PeakCard
            label="สูงสุดหลังจบไลฟ์"
            peak={activePeaks.byOnEnd}
            onOpen={openLiveModal}
          />
          <PeakCard
            label="สูงสุดยอดสะสมล่าสุด"
            peak={activePeaks.byLatest}
            onOpen={openLiveModal}
          />
        </div>
      </div>

      {/* 📈 Main Interactive Chart */}
      <LiveViewTrendsChart
        rows={rows}
        grain={grain}
        selectedBucket={selectedBucket}
        onSelectBucket={selectBucket}
      />

      {/* 🏷️ Stream Kind Breakdown Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f3b8c4]/15 bg-[#14080e]/90 px-4 py-3 shadow-md sm:px-5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-[#e85a7a]" />
          <p className="text-xs font-medium text-[#f3b8c4]/80">
            {kindStatsLabel}
            <span className="ml-1.5 font-bold tabular-nums text-[#fff5f7]">
              ({pending && selectedBucket ? "…" : displayKindStats.total} ไลฟ์)
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(LIVE_BADGE_PILL_SM, LIVE_BADGE_MEMBER, "gap-1.5 shadow-sm")}>
            Member
            <span className="font-bold tabular-nums">
              {pending && selectedBucket ? "…" : displayKindStats.member}
            </span>
          </span>
          <span className={cn(LIVE_BADGE_PILL_SM, LIVE_BADGE_MILD, "gap-1.5 shadow-sm")}>
            Solo
            <span className="font-bold tabular-nums">
              {pending && selectedBucket ? "…" : displayKindStats.solo}
            </span>
          </span>
          <span className={cn(LIVE_BADGE_PILL_SM, LIVE_BADGE_COLLAB, "gap-1.5 shadow-sm")}>
            Collab
            <span className="font-bold tabular-nums">
              {pending && selectedBucket ? "…" : displayKindStats.collab}
            </span>
          </span>
        </div>
      </div>

      {/* 🔍 Selected Bucket Detail Section */}
      <section
        ref={detailRef}
        className="overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/85 via-[#1a0c12]/80 to-[#14080e]/95 shadow-xl"
      >
        {!selectedBucket ? (
          <div className="px-6 py-10 text-center">
            <Activity className="mx-auto size-8 text-[#e85a7a]/60 animate-pulse" />
            <p className="mt-3 text-sm font-medium text-[#f7d7de]/80">
              คลิกจุดหรือแท่งบนกราฟ เพื่อดูรายละเอียดคลิปของวัน / เดือน นั้น
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3b8c4]/15 bg-[#14080e]/90 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#e85a7a]" />
                <h2 className="text-xs font-bold tracking-wider text-[#e85a7a] uppercase sm:text-sm">
                  รายละเอียดสตรีม · {formatBucket(selectedBucket, grain)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBucket(null);
                  setStreams([]);
                  setBucketPeaks(null);
                }}
                className="rounded-full border border-[#f3b8c4]/20 bg-[#1f0d16] px-3 py-1 text-xs text-[#f3b8c4]/80 transition hover:border-[#e85a7a]/50 hover:text-[#fff5f7]"
              >
                ล้างการเลือก
              </button>
            </div>

            {pending ? (
              <div className="flex min-h-[20vh] flex-col items-center justify-center gap-2 py-10">
                <span className="size-2.5 rounded-full bg-[#e85a7a] animate-ping" />
                <p className="text-xs text-[#f3b8c4]/60">กำลังโหลดข้อมูลไลฟ์…</p>
              </div>
            ) : error ? (
              <p className="px-5 py-6 text-sm text-red-300">{error}</p>
            ) : streams.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#f3b8c4]/70">
                ไม่มีไลฟ์ในช่วงนี้
              </p>
            ) : (
              <BucketPeriodDetail
                trendRow={selectedTrendRow}
                streams={streams}
                peaks={bucketPeaks}
                onOpen={openLiveModal}
              />
            )}
          </div>
        )}
      </section>

      {/* 📑 Summary Table Dropdown */}
      <div className="overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1a0c12]/80 to-[#14080e]/90 shadow-lg">
        <button
          type="button"
          onClick={() => setTableOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#e85a7a]/08"
        >
          <div className="flex items-center gap-2">
            <Video className="size-4 text-[#e85a7a]" />
            <span className="text-xs font-bold tracking-wider text-[#fff5f7] uppercase sm:text-sm">
              ตารางสรุปข้อมูล ({rows.length} แถว)
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#e85a7a]">
            {tableOpen ? (
              <>
                <span>ซ่อนตาราง</span>
                <ChevronUp className="size-4" />
              </>
            ) : (
              <>
                <span>เปิดดูตาราง</span>
                <ChevronDown className="size-4" />
              </>
            )}
          </span>
        </button>
        {tableOpen ? (
          <div className="overflow-x-auto border-t border-[#f3b8c4]/12">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#f3b8c4]/15 bg-[#14080e]/80 text-[0.68rem] tracking-wider text-[#f3b8c4]/70 uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">ช่วงเวลา</th>
                  <th className="px-5 py-3 font-semibold">หลังไลฟ์</th>
                  <th className="px-5 py-3 font-semibold">ยอดรวมล่าสุด</th>
                  <th className="px-5 py-3 font-semibold">Diff (เพิ่มขึ้น)</th>
                  <th className="px-5 py-3 font-semibold">จำนวนคลิป</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((row) => (
                  <tr
                    key={row.bucket}
                    onClick={() => selectBucket(row.bucket)}
                    className={cn(
                      "cursor-pointer border-b border-[#f3b8c4]/08 last:border-0 transition-colors hover:bg-[#e85a7a]/12",
                      selectedBucket === row.bucket && "bg-[#e85a7a]/20 font-semibold"
                    )}
                  >
                    <td className="px-5 py-3 text-[#fff5f7]">
                      {formatBucket(row.bucket, grain)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[#f7d7de]/85">
                      {formatViews(row.views_on_end)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[#fff5f7]">
                      {formatViews(row.latest_views)}
                    </td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-[#7dd3c0]">
                      +{formatViews(row.views_diff)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[#f3b8c4]/80">
                      {row.stream_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <LiveDetailModal
        slot={activeSlot}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

function trendItemToSlot(
  item: LiveTrendStreamItem | LiveViewPeakStream
): LiveSlot {
  const viewsOnEnd = item.views_on_end ?? null;
  const latestViews =
    item.latest_views ??
    ("views" in item ? (item as LiveViewPeakStream).views : null);
  const isOwn =
    "is_own_channel" in item ? (item.is_own_channel ?? null) : null;
  const isCollab =
    "is_collab" in item
      ? (item.is_collab ?? null)
      : isOwn === false
        ? true
        : null;
  const isMember =
    "is_member" in item ? Boolean(item.is_member) : false;

  const scheduled =
    "scheduled_start" in item ? (item.scheduled_start ?? null) : null;
  const slot = liveStreamToSlot({
    video_id: item.video_id,
    channel_id: null,
    channel_name: item.channel_name,
    title: item.title,
    url: item.url,
    source_title:
      "source_title" in item
        ? ((item as { source_title?: string | null }).source_title ?? null)
        : null,
    scheduled_start: scheduled,
    scheduled_start_first:
      "scheduled_start_first" in item
        ? ((item as { scheduled_start_first?: string | null })
            .scheduled_start_first ?? scheduled)
        : scheduled,
    actual_start:
      "actual_start" in item
        ? (item.actual_start ?? item.actual_end)
        : item.actual_end,
    actual_end: item.actual_end,
    thumbnail_url:
      "thumbnail_url" in item ? (item.thumbnail_url ?? null) : null,
    thumbnail_cached_url: null,
    views_on_end: viewsOnEnd,
    latest_views: latestViews,
    likes_on_end:
      "likes_on_end" in item ? (item.likes_on_end ?? null) : null,
    latest_likes:
      ("latest_likes" in item ? item.latest_likes : null) ??
      ("likes" in item ? item.likes : null),
    is_own_channel: isOwn,
    is_collab: isCollab,
    metadata: isMember ? { member: true } : null,
    created_at: item.actual_end ?? new Date().toISOString(),
  });

  const viewBits: string[] = [];
  if (viewsOnEnd != null) {
    viewBits.push(`หลังไลฟ์ ${formatViews(viewsOnEnd)}`);
  }
  if (latestViews != null) {
    viewBits.push(`ยอดรวม ${formatViews(latestViews)}`);
  }
  const likesOnEnd =
    "likes_on_end" in item ? (item.likes_on_end ?? null) : null;
  const latestLikes =
    ("latest_likes" in item ? item.latest_likes : null) ??
    ("likes" in item ? item.likes : null);
  if (likesOnEnd != null) {
    viewBits.push(`ไลก์หลังไลฟ์ ${formatViews(likesOnEnd)}`);
  }
  if (latestLikes != null) {
    viewBits.push(`ไลก์ล่าสุด ${formatViews(latestLikes)}`);
  }
  if ("updated_at" in item && item.updated_at) {
    viewBits.push(`อัปเดตล่าสุด ${formatWhen(item.updated_at)}`);
  }

  if (viewBits.length > 0) {
    slot.note = slot.note
      ? `${slot.note} · ${viewBits.join(" · ")}`
      : viewBits.join(" · ");
  }

  return slot;
}

function formatDuration(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} นาที`;
  return `${h} ชม. ${m} นาที`;
}

function streamThumb(videoId: string, thumbnailUrl: string | null) {
  // Prefer DB thumbnail when present; always have a YT fallback from video_id
  if (thumbnailUrl && /^https?:\/\//i.test(thumbnailUrl)) return thumbnailUrl;
  return getYoutubeThumbnailUrl(videoId);
}

function TrendThumb({
  videoId,
  thumbnailUrl,
  alt,
  className,
  children,
}: {
  videoId: string;
  thumbnailUrl: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
}) {
  const [src, setSrc] = useState(streamThumb(videoId, thumbnailUrl));

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#10070b]",
        className ?? "aspect-video min-h-[200px]"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover select-none [-webkit-user-drag:none]"
        onError={() => {
          const fallback = getYoutubeThumbnailUrl(videoId);
          if (src !== fallback) setSrc(fallback);
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d] via-transparent to-transparent" />
      {children}
    </div>
  );
}

function pickHeroStream(
  streams: LiveTrendStreamItem[],
  peaks: LiveViewPeaks | null
): LiveTrendStreamItem {
  const peakId =
    peaks?.byOnEnd?.video_id ?? peaks?.byLatest?.video_id ?? null;
  if (peakId) {
    const match = streams.find((s) => s.video_id === peakId);
    if (match) return match;
  }
  return [...streams].sort(
    (a, b) => (b.views_on_end ?? 0) - (a.views_on_end ?? 0)
  )[0];
}

function BucketPeriodDetail({
  trendRow,
  streams,
  peaks,
  onOpen,
}: {
  trendRow: LiveViewTrendRow | null | undefined;
  streams: LiveTrendStreamItem[];
  peaks: LiveViewPeaks | null;
  onOpen: (item: LiveTrendStreamItem) => void;
}) {
  const hero = pickHeroStream(streams, peaks);
  const others = streams.filter((s) => s.video_id !== hero.video_id);
  const onEnd = hero.views_on_end ?? 0;
  const latest = hero.latest_views ?? 0;
  const diff = latest - onEnd;
  const url =
    hero.url ?? `https://www.youtube.com/watch?v=${hero.video_id}`;

  return (
    <div>
      {trendRow ? (
        <div className="grid grid-cols-2 border-b border-[#f3b8c4]/12 sm:grid-cols-4">
          <PeriodChip
            label="หลังไลฟ์ (รวมช่วง)"
            value={formatViews(trendRow.views_on_end)}
          />
          <PeriodChip
            label="ยอดรวมช่วง"
            value={formatViews(trendRow.latest_views)}
          />
          <PeriodChip
            label="Diff ช่วง"
            value={formatViews(trendRow.views_diff)}
            accent
          />
          <PeriodChip
            label="จำนวนไลฟ์"
            value={String(trendRow.stream_count)}
          />
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => onOpen(hero)}
          className="group relative block w-full text-left"
        >
          <TrendThumb
            videoId={hero.video_id}
            thumbnailUrl={hero.thumbnail_url}
            alt={hero.title ?? "Peak live"}
            className="aspect-[16/10] min-h-[240px] lg:min-h-full lg:aspect-auto lg:h-full"
          >
            <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-[#0c0709] via-[#0c0709]/80 to-transparent p-4 pt-16">
              <div className="flex flex-wrap gap-1.5">
                <span className="border border-[#e85a7a]/50 bg-[#e85a7a]/20 px-2 py-0.5 text-[0.58rem] tracking-[0.16em] text-[#fff5f7] uppercase">
                  ยอดสูงสุดช่วงนี้
                </span>
                <span
                  className={cn(
                    "border px-2 py-0.5 text-[0.58rem] tracking-[0.14em] uppercase",
                    hero.is_own_channel
                      ? "border-[#f3b8c4]/30 bg-[#140a0d]/70 text-[#fff5f7]"
                      : "border-[#d4a574]/40 bg-[#140a0d]/70 text-[#e8c49a]"
                  )}
                >
                  {hero.is_own_channel ? "Own" : "Other"}
                </span>
                {hero.is_collab ? (
                  <span className="border border-[#d4a574]/45 bg-[#d4a574]/15 px-2 py-0.5 text-[0.58rem] tracking-[0.14em] text-[#e8c49a] uppercase">
                    Collab
                  </span>
                ) : null}
              </div>
              <p className="font-[family-name:var(--font-display)] text-xl leading-snug tracking-normal text-[#fff5f7] sm:text-2xl">
                {hero.title || hero.video_id}
              </p>
              <p className="text-xs text-[#f3b8c4]/75">
                {hero.channel_name || "—"}
              </p>
            </div>
          </TrendThumb>
        </button>

        <div className="flex flex-col justify-between gap-5 border-t border-[#f3b8c4]/12 p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <div className="space-y-4">
            <div>
              <p className="text-[0.65rem] tracking-[0.2em] text-[#f3b8c4]/55 uppercase">
                ยอดวิวคลิปนี้
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[0.58rem] tracking-[0.14em] text-[#f3b8c4]/50 uppercase">
                    หลังไลฟ์
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-[#fff5f7]">
                    {formatViews(onEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.58rem] tracking-[0.14em] text-[#f3b8c4]/50 uppercase">
                    ยอดรวม
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-[#fff5f7]">
                    {formatViews(latest)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.58rem] tracking-[0.14em] text-[#f3b8c4]/50 uppercase">
                    Diff
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums text-[#7dd3c0]">
                    {formatViews(diff)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.75rem]">
              <MetaCell
                label="ตั้งเวลา"
                value={formatWhen(hero.scheduled_start)}
              />
              <MetaCell label="เริ่ม" value={formatWhen(hero.actual_start)} />
              <MetaCell label="จบ" value={formatWhen(hero.actual_end)} />
              <MetaCell
                label="ความยาว"
                value={formatDuration(hero.actual_start, hero.actual_end)}
              />
              <MetaCell
                label="ไลก์หลังไลฟ์"
                value={
                  hero.likes_on_end != null
                    ? formatViews(hero.likes_on_end)
                    : "—"
                }
              />
              <MetaCell
                label="ไลก์ล่าสุด"
                value={
                  hero.latest_likes != null
                    ? formatViews(hero.latest_likes)
                    : hero.likes != null
                      ? formatViews(hero.likes)
                      : "—"
                }
                accent
              />
              <MetaCell label="Video ID" value={hero.video_id} />
              <MetaCell
                label="อัปเดตล่าสุด"
                value={formatWhen(hero.updated_at)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#f3b8c4]/10 pt-3">
            <button
              type="button"
              onClick={() => onOpen(hero)}
              className="border border-[#e85a7a]/45 bg-[#e85a7a]/12 px-3 py-1.5 text-xs tracking-wide text-[#fff5f7] transition-colors hover:bg-[#e85a7a]/22"
            >
              เปิดรายละเอียด
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#f3b8c4]/75 underline-offset-4 hover:text-[#fff5f7] hover:underline"
            >
              เปิด YouTube
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </div>

      {others.length > 0 ? (
        <div className="border-t border-[#f3b8c4]/12 px-4 py-4">
          <p className="mb-3 text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/55 uppercase">
            ไลฟ์อื่นในช่วงนี้ · {others.length}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {others.map((s) => (
              <TrendStreamCard
                key={s.video_id}
                stream={s}
                onOpen={() => onOpen(s)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PeriodChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-b border-[#f3b8c4]/08 px-4 py-3 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[0.58rem] tracking-[0.14em] text-[#f3b8c4]/50 uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-[family-name:var(--font-display)] text-lg tabular-nums",
          accent ? "text-[#7dd3c0]" : "text-[#fff5f7]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TrendStreamCard({
  stream,
  onOpen,
}: {
  stream: LiveTrendStreamItem;
  onOpen: () => void;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const onEnd = stream.views_on_end ?? 0;
  const latest = stream.latest_views ?? 0;
  const diff = latest - onEnd;
  const url =
    stream.url ?? `https://www.youtube.com/watch?v=${stream.video_id}`;

  return (
    <li>
      <div className="overflow-hidden border border-[#f3b8c4]/14 bg-[#0c0709]/45">
        <button
          type="button"
          onClick={onOpen}
          className="group block w-full text-left transition-colors hover:bg-[#e85a7a]/08"
        >
          <TrendThumb
            videoId={stream.video_id}
            thumbnailUrl={stream.thumbnail_url}
            alt={stream.title ?? "Live stream"}
            className="aspect-video min-h-[220px] sm:min-h-[260px]"
          >
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[0.58rem] tracking-[0.14em] uppercase backdrop-blur-sm",
                  stream.is_own_channel
                    ? "border-[#f3b8c4]/30 bg-[#140a0d]/75 text-[#fff5f7]"
                    : "border-[#d4a574]/40 bg-[#140a0d]/75 text-[#e8c49a]"
                )}
              >
                {stream.is_own_channel ? "Own" : "Other"}
              </span>
              {stream.is_collab ? (
                <span className="rounded-md border border-[#d4a574]/45 bg-[#d4a574]/15 px-2 py-0.5 text-[0.58rem] tracking-[0.14em] text-[#e8c49a] uppercase backdrop-blur-sm">
                  Collab
                </span>
              ) : null}
            </div>
          </TrendThumb>
          <div className="space-y-3 p-4">
            <div>
              <p className="line-clamp-2 text-base font-medium text-[#fff5f7]">
                {stream.title || stream.video_id}
              </p>
              <p className="mt-1 text-xs text-[#f3b8c4]/65">
                {stream.channel_name || "—"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[0.7rem] sm:grid-cols-4">
              <MetaCell
                label="ตั้งเวลา"
                value={formatWhen(stream.scheduled_start)}
              />
              <MetaCell
                label="เริ่ม"
                value={formatWhen(stream.actual_start)}
              />
              <MetaCell label="จบ" value={formatWhen(stream.actual_end)} />
              <MetaCell
                label="ความยาว"
                value={formatDuration(stream.actual_start, stream.actual_end)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[0.75rem] tabular-nums sm:grid-cols-4">
              <MetaCell label="หลังไลฟ์" value={formatViews(onEnd)} />
              <MetaCell label="ยอดรวม" value={formatViews(latest)} accent />
              <MetaCell label="Diff" value={formatViews(diff)} accent />
              <MetaCell
                label="ไลก์หลังไลฟ์"
                value={
                  stream.likes_on_end != null
                    ? formatViews(stream.likes_on_end)
                    : "—"
                }
              />
              <MetaCell
                label="ไลก์ล่าสุด"
                value={
                  stream.latest_likes != null
                    ? formatViews(stream.latest_likes)
                    : stream.likes != null
                      ? formatViews(stream.likes)
                      : "—"
                }
                accent
              />
              <MetaCell
                label="อัปเดตล่าสุด"
                value={formatWhen(stream.updated_at)}
              />
            </div>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-3 border-t border-[#f3b8c4]/10 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setShowEmbed((v) => !v)}
            className="text-xs text-[#e85a7a] underline-offset-4 hover:underline"
          >
            {showEmbed ? "ซ่อนฝังวิดีโอ" : "ฝังวิดีโอ"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#f3b8c4]/75 underline-offset-4 hover:text-[#fff5f7] hover:underline"
          >
            เปิด YouTube
            <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </div>
        {showEmbed ? (
          <div className="border-t border-[#f3b8c4]/10 bg-black">
            <div className="relative aspect-video min-h-[220px] w-full">
              <iframe
                title={stream.title || stream.video_id}
                src={`https://www.youtube.com/embed/${stream.video_id}`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function MetaCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[#f3b8c4]/50">{label}</p>
      <p
        className={cn(
          "mt-0.5 tabular-nums",
          accent ? "text-[#7dd3c0]" : "text-[#f7d7de]/90"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function peakFromList(
  list: LiveTrendStreamItem[],
  key: "latest_views" | "views_on_end"
): LiveViewPeakStream | null {
  if (list.length === 0) return null;
  let best = list[0];
  let bestViews = best[key] ?? 0;
  for (const item of list) {
    const v = item[key] ?? 0;
    if (v > bestViews) {
      best = item;
      bestViews = v;
    }
  }
  return {
    video_id: best.video_id,
    title: best.title,
    url: best.url,
    channel_name: best.channel_name,
    actual_end: best.actual_end,
    thumbnail_url: best.thumbnail_url,
    views: bestViews,
    views_on_end: best.views_on_end ?? 0,
    latest_views: best.latest_views ?? 0,
  };
}

function PeakCard({
  label,
  peak,
  onOpen,
}: {
  label: string;
  peak: LiveViewPeakStream | null;
  onOpen: (peak: LiveViewPeakStream) => void;
}) {
  if (!peak) {
    return (
      <div className="rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/75 to-[#14080e]/90 p-5">
        <p className={META_MUTED_CLASS}>
          {label}
        </p>
        <p className="mt-2 text-xs text-[#f3b8c4]/50">ไม่มีข้อมูลในช่วงนี้</p>
      </div>
    );
  }

  const thumb = streamThumb(peak.video_id, peak.thumbnail_url);

  return (
    <button
      type="button"
      onClick={() => onOpen(peak)}
      className="group relative flex w-full flex-col justify-between overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/85 to-[#14080e]/95 p-5 text-left transition duration-300 hover:border-[#e85a7a]/50 hover:shadow-[0_12px_32px_rgba(232,90,122,0.18)]"
    >
      <div className="flex w-full items-start gap-4">
        {/* 16:9 Thumbnail Mini Preview */}
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#12070c] sm:w-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-[#e85a7a]/20 px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-[#e85a7a] uppercase">
            {label}
          </span>
          <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed text-[#fff5f7] group-hover:text-white sm:text-sm">
            {peak.title || peak.video_id}
          </p>
          <p className="mt-1 text-[0.7rem] text-[#f3b8c4]/65">
            {peak.channel_name || "Mild-R Channel"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex w-full items-end justify-between border-t border-[#f3b8c4]/10 pt-3">
        <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-[#e85a7a] opacity-80 group-hover:opacity-100">
          <span>คลิกดูรายละเอียด</span>
          <ArrowUpRight className="size-3.5" />
        </span>
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-tight tabular-nums text-[#fff5f7] sm:text-3xl">
            {formatViews(peak.views)}
          </p>
          <p className="text-[0.62rem] text-[#f3b8c4]/50 uppercase">Views</p>
        </div>
      </div>
    </button>
  );
}

function StatCard({
  label,
  sublabel,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  sublabel?: string;
  value: number;
  accent?: boolean;
  icon?: typeof Flame;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/85 via-[#1a0c12]/80 to-[#14080e]/95 p-5 shadow-lg transition hover:border-[#e85a7a]/35">
      <div className="flex items-center justify-between">
        <p className={META_CLASS}>
          {label}
        </p>
        {Icon ? (
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl border",
              accent
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : "border-[#e85a7a]/30 bg-[#e85a7a]/15 text-[#e85a7a]"
            )}
          >
            <Icon className="size-4" />
          </div>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-3 font-[family-name:var(--font-display)] text-3xl font-normal tracking-tight tabular-nums sm:text-4xl",
          accent ? "text-[#7dd3c0]" : "text-[#fff5f7]"
        )}
      >
        {accent && value > 0 ? `+${formatViews(value)}` : formatViews(value)}
      </p>

      {sublabel ? (
        <p className="mt-1 text-[0.68rem] text-[#f3b8c4]/50">
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}
