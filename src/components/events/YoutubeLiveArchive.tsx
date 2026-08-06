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
};

function statusLabel(row: LiveStreamRow) {
  const status = getLiveStreamStatus(row);
  if (status === "live") return "Live now";
  if (status === "upcoming") return "Upcoming";
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
    row.thumbnail_url ??
    `https://i.ytimg.com/vi/${row.video_id}/hqdefault.jpg`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(slot)}
        className="group flex w-full flex-col overflow-hidden border border-[#f3b8c4]/14 bg-[#1a0d12]/55 text-left transition hover:border-[#e85a7a]/40 hover:bg-[#e85a7a]/10"
      >
        <div className="relative aspect-video overflow-hidden bg-[#10070b]">
          <ProtectedImage
            src={thumb}
            alt={row.title ?? "Live stream"}
            wrapClassName="absolute inset-0 block"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d] via-transparent to-transparent" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.58rem] tracking-[0.16em] uppercase backdrop-blur-sm",
                status === "live"
                  ? "border-red-400/40 bg-red-500/20 text-red-100"
                  : status === "upcoming"
                    ? "border-[#e85a7a]/35 bg-[#140a0d]/70 text-[#f3b8c4]"
                    : "border-white/15 bg-[#140a0d]/70 text-[#f7d7de]/75"
              )}
            >
              {status === "live" ? (
                <Radio className="size-3 animate-pulse" />
              ) : null}
              {statusLabel(row)}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[0.58rem] tracking-[0.14em] uppercase backdrop-blur-sm",
                row.is_own_channel
                  ? "border-[#f3b8c4]/30 bg-[#140a0d]/70 text-[#fff5f7]"
                  : "border-[#d4a574]/40 bg-[#140a0d]/70 text-[#e8c49a]"
              )}
            >
              {row.is_own_channel ? "Own" : "Other"}
            </span>
            {row.is_collab ? (
              <span className="inline-flex items-center rounded-md border border-[#d4a574]/45 bg-[#d4a574]/15 px-2 py-0.5 text-[0.58rem] tracking-[0.14em] text-[#e8c49a] uppercase backdrop-blur-sm">
                Collab
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-2 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium text-[#fff5f7]">
              {row.title}
            </p>
            <p className="mt-1 text-xs text-[#f3b8c4]/65">
              {row.channel_name}
              {slot.time ? ` · ${slot.date} ${slot.time}` : null}
            </p>
          </div>
          <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-[#f3b8c4]/40" />
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
      <h3 className="text-[0.7rem] tracking-[0.22em] text-[#f3b8c4]/70 uppercase">
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
}: YoutubeLiveArchiveProps) {
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);
  const [open, setOpen] = useState(false);

  const recentEnded = useMemo(() => ended.slice(0, 12), [ended]);
  const empty =
    live.length === 0 && upcoming.length === 0 && ended.length === 0;

  function openSlot(slot: LiveSlot) {
    setActiveSlot(slot);
    setOpen(true);
  }

  if (empty) {
    return (
      <div className="border border-dashed border-[#f3b8c4]/20 bg-[#1a0d12]/35 px-5 py-8 text-sm text-[#f3b8c4]/70">
        ยังไม่มีข้อมูลจาก YouTube ในฐานข้อมูล — รัน migration / backfill
        หรือรอ Edge Function sync
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        <Section title="Live now" rows={live} onOpen={openSlot} />
        <Section title="Upcoming" rows={upcoming} onOpen={openSlot} />
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
