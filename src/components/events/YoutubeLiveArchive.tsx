"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Radio } from "lucide-react";

import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import {
  getLiveStreamStatus,
  liveStreamToSlot,
} from "@/lib/live-stream-utils";
import { cn } from "@/lib/utils";
import type { LiveStreamRow } from "@/types/live-stream";
import type { LiveSlot } from "@/types/vtuber";

type YoutubeLiveArchiveProps = {
  live: LiveStreamRow[];
  upcoming: LiveStreamRow[];
  ended: LiveStreamRow[];
  cancelled?: LiveStreamRow[];
  /** When true, show every ended/cancelled row (date-filtered ops). */
  showAll?: boolean;
};

function statusLabel(row: LiveStreamRow) {
  const status = getLiveStreamStatus(row);
  if (status === "live") return "Live now";
  if (status === "upcoming") return "Upcoming";
  if (status === "cancelled") return "Cancelled";
  return "Ended";
}

function StreamCard({
  row,
  onOpen,
}: {
  row: LiveStreamRow;
  onOpen: (slot: LiveSlot) => void;
}) {
  const status = getLiveStreamStatus(row);
  const slot = liveStreamToSlot(row);
  const thumb =
    slot.coverUrl ??
    row.thumbnail_cached_url ??
    row.thumbnail_url ??
    `https://i.ytimg.com/vi/${row.video_id}/hqdefault.jpg`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(slot)}
        className="group r-card flex w-full flex-col overflow-hidden rounded-2xl text-left transition hover:bg-r-pri/10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc"
      >
        <div className="relative aspect-video overflow-hidden bg-r-bg">
          <ProtectedImage
            src={thumb}
            alt={row.title ?? "Live stream"}
            wrapClassName="absolute inset-0 block"
            className={cn(
              "h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]",
              status === "cancelled" && "opacity-70 grayscale-[0.35]"
            )}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-r-bg via-transparent to-transparent" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.58rem] tracking-[0.16em] uppercase backdrop-blur-sm",
                status === "live"
                  ? "border-red-400/40 bg-red-500/20 text-red-100"
                  : status === "upcoming"
                    ? "border-r-pri/35 bg-r-bg/70 text-r-text-2"
                    : status === "cancelled"
                      ? "border-[#8a7f88]/40 bg-r-bg/70 text-[#d8d0d4]"
                      : "border-white/15 bg-r-bg/70 text-r-text-2/75"
              )}
            >
              {status === "live" ? (
                <Radio className="size-3 animate-pulse" />
              ) : null}
              {statusLabel(row)}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.58rem] tracking-[0.14em] uppercase backdrop-blur-sm",
                row.is_own_channel
                  ? "border-r-text-2/30 bg-r-bg/70 text-r-text"
                  : "border-r-acc/40 bg-r-bg/70 text-r-acc"
              )}
            >
              {row.is_own_channel ? "Own" : "Other"}
            </span>
            {row.is_collab ? (
              <span className="inline-flex items-center rounded-full border border-r-acc/45 bg-r-acc/15 px-2 py-0.5 text-[0.58rem] tracking-[0.14em] text-r-acc uppercase backdrop-blur-sm">
                Collab
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-2 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium text-r-text">
              {row.title}
            </p>
            <p className="mt-1 text-xs text-r-text-2/65">
              {row.channel_name}
              {slot.time ? ` · ${slot.date} ${slot.time}` : null}
            </p>
          </div>
          <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-r-text-2/40" />
        </div>
      </button>
    </li>
  );
}

function Section({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: LiveStreamRow[];
  onOpen: (slot: LiveSlot) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="text-[0.7rem] tracking-[0.22em] text-r-text-2/70 uppercase">
        {title}
      </h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <StreamCard key={row.video_id} row={row} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  );
}

export function YoutubeLiveArchive({
  live,
  upcoming,
  ended,
  cancelled = [],
  showAll = false,
}: YoutubeLiveArchiveProps) {
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);
  const [open, setOpen] = useState(false);

  const recentEnded = useMemo(
    () => (showAll ? ended : ended.slice(0, 12)),
    [ended, showAll]
  );
  const recentCancelled = useMemo(
    () => (showAll ? cancelled : cancelled.slice(0, 12)),
    [cancelled, showAll]
  );
  const empty =
    live.length === 0 &&
    upcoming.length === 0 &&
    ended.length === 0 &&
    cancelled.length === 0;

  function openSlot(slot: LiveSlot) {
    setActiveSlot(slot);
    setOpen(true);
  }

  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-r-text-2/20 bg-white/[0.03] px-5 py-8 text-sm text-r-text-2/70">
        ยังไม่มีไลฟ์ในช่วงวันที่เลือก
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        <Section title="Live now" rows={live} onOpen={openSlot} />
        <Section title="Upcoming" rows={upcoming} onOpen={openSlot} />
        <Section title="Cancelled" rows={recentCancelled} onOpen={openSlot} />
        <Section title="Recent streams" rows={recentEnded} onOpen={openSlot} />
      </div>

      <LiveDetailModal
        slot={activeSlot}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
