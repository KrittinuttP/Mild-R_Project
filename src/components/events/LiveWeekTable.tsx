"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CollabBadge } from "@/components/events/CollabBadge";
import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import { OfflineBadge } from "@/components/events/OfflineBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  findDefaultWeekIndex,
  formatThaiShortDate,
  parseISODate,
  sortLiveWeeks,
  thaiWeekdayShort,
  weekDayDates,
} from "@/lib/events";
import { cn } from "@/lib/utils";
import type {
  LiveOfflineDay,
  LivePlatform,
  LiveSlot,
  LiveWeek,
} from "@/types/vtuber";

type LiveWeekTableProps = {
  weeks: LiveWeek[];
  className?: string;
  compact?: boolean;
};

function platformLabel(platform?: LivePlatform) {
  if (platform === "youtube") return "YouTube";
  if (platform === "x") return "X";
  if (platform === "other") return "Other";
  return null;
}

function SlotCard({
  slot,
  compact,
  onOpen,
}: {
  slot: LiveSlot;
  compact?: boolean;
  onOpen: () => void;
}) {
  const platform = platformLabel(slot.platform);
  const collab = slot.kind === "collab";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full w-full flex-col rounded-sm border bg-[#1a0d12]/80 p-2.5 text-left transition sm:p-3",
        compact ? "min-h-[5.75rem]" : "min-h-[7.25rem] sm:min-h-[8rem]",
        collab
          ? "border-[#d4a574]/35 hover:border-[#d4a574]/55 hover:bg-[#d4a574]/10"
          : "border-[#f3b8c4]/15 hover:border-[#e85a7a]/45 hover:bg-[#e85a7a]/10"
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <p
          className={cn(
            "text-[0.65rem] tabular-nums tracking-wide",
            collab ? "text-[#e8c49a]" : "text-[#e85a7a]"
          )}
        >
          {slot.time}
        </p>
        {collab ? <CollabBadge /> : null}
      </div>
      <p
        className={cn(
          "mt-1 font-medium text-[#fff5f7]",
          compact ? "text-xs leading-snug" : "text-sm leading-snug"
        )}
      >
        {slot.titleLocal ?? slot.title}
      </p>
      {!compact && slot.titleLocal ? (
        <p className="mt-0.5 text-xs text-[#f3b8c4]/60">{slot.title}</p>
      ) : null}
      <div className="mt-auto pt-2">
        {platform ? (
          <p className="text-[0.6rem] tracking-[0.16em] text-[#f3b8c4]/55 uppercase">
            {platform}
          </p>
        ) : null}
        {slot.note ? (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-[0.65rem]",
              slot.note.startsWith("ช่อง ")
                ? "font-medium text-[#e8c49a]/90"
                : "text-[#f3b8c4]/45",
              compact && "line-clamp-1"
            )}
          >
            {slot.note}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function OfflineDaySlot({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center rounded-sm border border-[#8a7f88]/20 bg-[#161217]/60",
        compact ? "min-h-[5.75rem]" : "min-h-[7.25rem] sm:min-h-[8rem]"
      )}
    >
      <OfflineBadge size={compact ? "sm" : "md"} />
    </div>
  );
}

function EmptyDaySlot({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[7.25rem] items-center justify-center rounded-sm border border-dashed border-[#f3b8c4]/15 bg-[#1a0d12]/30 sm:min-h-[8rem]",
        compact && "min-h-[5.5rem] sm:min-h-[5.5rem]"
      )}
      aria-hidden
    >
      <span className="text-[0.65rem] text-[#f3b8c4]/35">—</span>
    </div>
  );
}

export function LiveWeekTable({
  weeks,
  className,
  compact = false,
}: LiveWeekTableProps) {
  const sorted = useMemo(() => sortLiveWeeks(weeks), [weeks]);
  const [index, setIndex] = useState(() => findDefaultWeekIndex(sorted));
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);

  const safeIndex = Math.min(
    Math.max(index, 0),
    Math.max(sorted.length - 1, 0)
  );
  const week = sorted[safeIndex];
  const dayIsos = week ? weekDayDates(week.weekStart) : [];

  const slotsByDate = useMemo(() => {
    const map = new Map<string, LiveSlot[]>();
    if (!week) return map;
    for (const slot of week.slots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [week]);

  const offlineByDate = useMemo(() => {
    const map = new Map<string, LiveOfflineDay>();
    for (const day of week?.offlineDays ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [week]);

  if (!week) {
    return <p className="text-sm text-[#f3b8c4]/70">ยังไม่มีตารางไลฟ์</p>;
  }

  const rangeLabel = `${formatThaiShortDate(dayIsos[0] ?? week.weekStart)} – ${formatThaiShortDate(dayIsos[6] ?? week.weekStart)}`;

  const renderDayBody = (iso: string, forceCompact?: boolean) => {
    const daySlots = slotsByDate.get(iso) ?? [];
    const offline = offlineByDate.get(iso);
    const useCompact = forceCompact ?? compact;

    if (daySlots.length > 0) {
      return daySlots.map((slot) => (
        <div key={slot.id} className="flex-1">
          <SlotCard
            slot={slot}
            compact={useCompact}
            onOpen={() => setActiveSlot(slot)}
          />
        </div>
      ));
    }

    if (offline) {
      return (
        <div className="flex-1">
          <OfflineDaySlot compact={useCompact} />
        </div>
      );
    }

    return (
      <div className="flex-1">
        <EmptyDaySlot compact={useCompact} />
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] tracking-[0.22em] text-[#f3b8c4]/65 uppercase">
            {week.label ?? "ตารางไลฟ์รายสัปดาห์"}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-[#fff5f7] sm:text-xl">
            {rangeLabel}
          </p>
        </div>

        {sorted.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="สัปดาห์ก่อนหน้า"
              disabled={safeIndex <= 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "size-9 rounded-none border-[#f3b8c4]/25 bg-transparent text-[#fff5f7] disabled:opacity-35"
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-[#f3b8c4]/70">
              {safeIndex + 1} / {sorted.length}
            </span>
            <button
              type="button"
              aria-label="สัปดาห์ถัดไป"
              disabled={safeIndex >= sorted.length - 1}
              onClick={() =>
                setIndex((value) => Math.min(sorted.length - 1, value + 1))
              }
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "size-9 rounded-none border-[#f3b8c4]/25 bg-transparent text-[#fff5f7] disabled:opacity-35"
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "hidden overflow-x-auto sm:block",
          compact && "sm:block"
        )}
      >
        <div className="grid min-w-[44rem] grid-cols-7 items-stretch gap-2">
          {dayIsos.map((iso) => {
            const date = parseISODate(iso);
            return (
              <div key={iso} className="flex min-w-0 flex-col">
                <div className="shrink-0 border-b border-[#f3b8c4]/20 pb-2 text-center">
                  <p className="text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/65 uppercase">
                    {thaiWeekdayShort(date)}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-[#f7d7de]/80">
                    {formatThaiShortDate(iso)}
                  </p>
                </div>
                <div className="mt-2 flex flex-1 flex-col gap-2">
                  {renderDayBody(iso)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="divide-y divide-[#f3b8c4]/12 border-y border-[#f3b8c4]/15 sm:hidden">
        {dayIsos.map((iso) => {
          const date = parseISODate(iso);
          const daySlots = slotsByDate.get(iso) ?? [];
          const offline = offlineByDate.get(iso);
          return (
            <li key={iso} className="py-3">
              <p className="text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/65 uppercase">
                {thaiWeekdayShort(date)} · {formatThaiShortDate(iso)}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {daySlots.length > 0 || offline ? (
                  renderDayBody(iso, true)
                ) : (
                  <p className="text-xs text-[#f3b8c4]/40">ไม่มีข้อมูล</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <LiveDetailModal
        slot={activeSlot}
        open={activeSlot !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSlot(null);
        }}
      />
    </div>
  );
}
