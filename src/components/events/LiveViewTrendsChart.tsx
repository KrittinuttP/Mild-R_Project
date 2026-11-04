"use client";

import { useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { LiveViewTrendRow, TrendGrain } from "@/types/live-view-trends";
import { R_PILL_ACTIVE_CLASS } from "@/lib/site-ui";

type ChartPoint = LiveViewTrendRow & { label: string };
type ChartMode = "totals" | "peak";

type LiveViewTrendsChartProps = {
  rows: LiveViewTrendRow[];
  grain: TrendGrain;
  selectedBucket: string | null;
  onSelectBucket: (bucket: string) => void;
};

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
      year: "2-digit",
      month: "short",
    }).format(d);
  }
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatViews(n: number) {
  return new Intl.NumberFormat("th-TH", {
    notation: n >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

function TrendsTooltip({
  active,
  payload,
  label,
  grain,
  peakOnly,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: number | string;
    color?: string;
    payload?: ChartPoint;
  }>;
  label?: string | number;
  grain: TrendGrain;
  peakOnly: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const showExtraPeak = grain !== "day" && !peakOnly && point;

  return (
    <div className="rounded-2xl bg-r-bg/95 ring-1 ring-r-line ring-inset px-3.5 py-2.5 text-xs text-r-text shadow-[0_12px_32px_rgba(0,0,0,0.7)] backdrop-blur-md">
      <p className="mb-2 font-medium text-r-text-2/80">
        {label} · คลิกดูรายละเอียด
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <p key={String(entry.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {String(entry.name)}
            </span>
            <span className="font-semibold tabular-nums text-white">
              {formatViews(Number(entry.value ?? 0))}
            </span>
          </p>
        ))}
        {showExtraPeak ? (
          <p className="flex items-center justify-between gap-4 border-t border-r-text-2/15 pt-1.5">
            <span className="flex items-center gap-1.5 text-[#f7c98a]">
              <span className="size-1.5 rounded-full bg-[#f7c98a]" />
              สูงสุดไลฟ์
            </span>
            <span className="font-semibold tabular-nums text-[#f7c98a]">
              {formatViews(point.peak_views_on_end)}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function pickBucketFromClick(
  state: {
    activePayload?: Array<{ payload?: ChartPoint }>;
    activeTooltipIndex?: number | string | null;
  } | null,
  data: ChartPoint[],
  hoverIndex: number | null
): string | null {
  const fromPayload = state?.activePayload?.[0]?.payload?.bucket;
  if (fromPayload) return fromPayload;

  const idxRaw = state?.activeTooltipIndex;
  const idx =
    typeof idxRaw === "number"
      ? idxRaw
      : typeof idxRaw === "string"
        ? Number(idxRaw)
        : hoverIndex;
  if (idx != null && Number.isFinite(idx) && data[idx]) {
    return data[idx].bucket;
  }
  if (hoverIndex != null && data[hoverIndex]) {
    return data[hoverIndex].bucket;
  }
  return null;
}

function PeakDot({
  cx,
  cy,
  payload,
  selectedBucket,
  onSelectBucket,
  showDots,
}: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  selectedBucket: string | null;
  onSelectBucket: (bucket: string) => void;
  showDots: boolean;
}) {
  if (!showDots || cx == null || cy == null || !payload) return null;
  const selected = payload.bucket === selectedBucket;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={selected ? 5 : 3.5}
      fill={selected ? "#f7c98a" : "#1a0d12"}
      stroke="#f7c98a"
      strokeWidth={selected ? 2 : 1.5}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectBucket(payload.bucket);
      }}
    />
  );
}

export function LiveViewTrendsChart({
  rows,
  grain,
  selectedBucket,
  onSelectBucket,
}: LiveViewTrendsChartProps) {
  const hoverIndexRef = useRef<number | null>(null);
  const [, setHoverTick] = useState(0);
  const [chartMode, setChartMode] = useState<ChartMode>("totals");
  const canTogglePeak = grain === "month" || grain === "year";
  const peakOnly = canTogglePeak && chartMode === "peak";

  if (!canTogglePeak && chartMode !== "totals") setChartMode("totals");

  if (rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-r-text-2/20 bg-white/[0.03] text-sm text-r-text-2/70">
        ไม่มีข้อมูลในช่วงนี้
      </div>
    );
  }

  const data: ChartPoint[] = rows.map((row) => ({
    ...row,
    label: formatBucket(row.bucket, grain),
  }));

  const showDots = data.length <= 60;

  return (
    <div className="w-full overflow-hidden rounded-3xl r-card p-4 shadow-xl sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-r-text-2/65">
          คลิกที่จุดหรือบริเวณกราฟเพื่อดูรายละเอียดด้านล่าง
          {peakOnly
            ? " · กำลังดูยอดไลฟ์สูงสุดต่อช่วง"
            : ""}
        </p>
        {canTogglePeak ? (
          <div className="flex items-center gap-1.5 rounded-full bg-white/[0.03] ring-1 ring-r-line ring-inset p-1">
            <button
              type="button"
              onClick={() => setChartMode("totals")}
              className={cn(
                "rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wider uppercase transition",
                chartMode === "totals"
                  ? R_PILL_ACTIVE_CLASS
                  : "text-r-text-2 hover:text-r-text"
              )}
            >
              ยอดรวมช่วง
            </button>
            <button
              type="button"
              onClick={() => setChartMode("peak")}
              className={cn(
                "rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wider uppercase transition",
                chartMode === "peak"
                  ? "border border-[#f7c98a]/60 bg-[#f7c98a]/20 text-[#f7c98a] shadow-[0_0_12px_rgba(247,201,138,0.25)]"
                  : "text-r-text-2 hover:text-r-text"
              )}
            >
              สูงสุดต่อ{grain === "month" ? "เดือน" : "ปี"}
            </button>
          </div>
        ) : null}
      </div>
      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              const idx = state?.activeTooltipIndex;
              const next =
                typeof idx === "number"
                  ? idx
                  : typeof idx === "string"
                    ? Number(idx)
                    : null;
              if (next !== hoverIndexRef.current) {
                hoverIndexRef.current =
                  next != null && Number.isFinite(next) ? next : null;
                setHoverTick((n) => n + 1);
              }
            }}
            onClick={(state) => {
              const bucket = pickBucketFromClick(
                state,
                data,
                hoverIndexRef.current
              );
              if (bucket) onSelectBucket(bucket);
            }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid
              stroke="rgba(243,184,196,0.12)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(243,184,196,0.65)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(243,184,196,0.2)" }}
              tickLine={false}
              minTickGap={grain === "day" ? 28 : 12}
            />
            <YAxis
              tick={{ fill: "rgba(243,184,196,0.65)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={formatViews}
            />
            <Tooltip
              content={
                <TrendsTooltip grain={grain} peakOnly={peakOnly} />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "rgba(247,215,222,0.8)" }}
            />
            {peakOnly ? (
              <Line
                type="monotone"
                dataKey="peak_views_on_end"
                name="สูงสุดไลฟ์"
                stroke="#f7c98a"
                strokeWidth={2.5}
                dot={(props) => (
                  <PeakDot
                    {...props}
                    selectedBucket={selectedBucket}
                    onSelectBucket={onSelectBucket}
                    showDots={showDots}
                  />
                )}
                activeDot={{ r: 7 }}
              />
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="views_on_end"
                  name="หลังไลฟ์"
                  stroke="#f3b8c4"
                  strokeWidth={2}
                  dot={
                    showDots
                      ? {
                          r: 3,
                          strokeWidth: 1,
                          fill: "#1a0d12",
                          stroke: "#f3b8c4",
                        }
                      : false
                  }
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="latest_views"
                  name="ยอดรวม"
                  stroke="#f2437d"
                  strokeWidth={2}
                  dot={
                    showDots
                      ? (props: {
                          cx?: number;
                          cy?: number;
                          payload?: ChartPoint;
                        }) => {
                          const { cx, cy, payload } = props;
                          if (cx == null || cy == null || !payload) return null;
                          const selected = payload.bucket === selectedBucket;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={selected ? 5 : 3}
                              fill={selected ? "#f2437d" : "#1a0d12"}
                              stroke="#f2437d"
                              strokeWidth={selected ? 2 : 1}
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBucket(payload.bucket);
                              }}
                            />
                          );
                        }
                      : false
                  }
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="views_diff"
                  name="Diff"
                  stroke="#7dd3c0"
                  strokeWidth={2}
                  dot={
                    showDots
                      ? {
                          r: 3,
                          strokeWidth: 1,
                          fill: "#1a0d12",
                          stroke: "#7dd3c0",
                        }
                      : false
                  }
                  activeDot={{ r: 6 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
