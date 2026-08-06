"use client";

import { useEffect, useRef, useState } from "react";
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
    <div className="border border-[#f3b8c4]/25 bg-[#1a0d12] px-3 py-2 text-xs text-[#fff5f7]">
      <p className="mb-1.5 text-[#f3b8c4]/80">
        {label} · คลิกดูรายละเอียด
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <p key={String(entry.name)} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{String(entry.name)}</span>
            <span className="tabular-nums">
              {formatViews(Number(entry.value ?? 0))}
            </span>
          </p>
        ))}
        {showExtraPeak ? (
          <p className="flex justify-between gap-4 border-t border-[#f3b8c4]/15 pt-1">
            <span className="text-[#f7c98a]">สูงสุดไลฟ์</span>
            <span className="tabular-nums text-[#f7c98a]">
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

  useEffect(() => {
    if (!canTogglePeak) setChartMode("totals");
  }, [canTogglePeak]);

  if (rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center border border-dashed border-[#f3b8c4]/20 bg-[#1a0d12]/35 text-sm text-[#f3b8c4]/70">
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
    <div className="w-full border border-[#f3b8c4]/14 bg-[#1a0d12]/45 p-3 sm:p-4">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#f3b8c4]/55">
          คลิกที่จุดหรือบริเวณกราฟเพื่อดูรายละเอียดด้านล่าง
          {peakOnly
            ? " · กำลังดูยอดไลฟ์สูงสุดต่อช่วง"
            : ""}
        </p>
        {canTogglePeak ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setChartMode("totals")}
              className={cn(
                "border px-2.5 py-1 text-[0.65rem] tracking-[0.14em] uppercase transition-colors",
                chartMode === "totals"
                  ? "border-[#e85a7a]/70 bg-[#e85a7a]/15 text-[#fff5f7]"
                  : "border-[#f3b8c4]/20 text-[#f3b8c4]/70 hover:border-[#f3b8c4]/40"
              )}
            >
              ยอดรวมช่วง
            </button>
            <button
              type="button"
              onClick={() => setChartMode("peak")}
              className={cn(
                "border px-2.5 py-1 text-[0.65rem] tracking-[0.14em] uppercase transition-colors",
                chartMode === "peak"
                  ? "border-[#f7c98a]/70 bg-[#f7c98a]/12 text-[#fff5f7]"
                  : "border-[#f3b8c4]/20 text-[#f3b8c4]/70 hover:border-[#f3b8c4]/40"
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
                  stroke="#e85a7a"
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
                              fill={selected ? "#e85a7a" : "#1a0d12"}
                              stroke="#e85a7a"
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
