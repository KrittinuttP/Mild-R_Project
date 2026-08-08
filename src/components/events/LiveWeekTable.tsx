"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import {
  LiveDayChannelBadges,
  LiveSlotTime,
  LiveSourceBadges,
  preferOwnChannelSlots,
} from "@/components/events/LiveSlotMeta";
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
  crowded,
  onOpen,
}: {
  slot: LiveSlot;
  compact?: boolean;
  /** Day has more than one live — lock height + truncate titles */
  crowded?: boolean;
  onOpen: () => void;
}) {
  const platform = platformLabel(slot.platform);
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  // Own channel always rose; guests keep copper accent when collab/other
  const guestTone = !own && collab && !cancelled;
  const label = slot.titleLocal ?? slot.title;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${slot.timeUpdated ?? slot.time} · ${label}`}
      className={cn(
        "group flex w-full flex-col rounded-sm border bg-[#1a0d12]/80 p-2.5 text-left transition sm:p-3",
        crowded
          ? cn(
              "h-full min-h-0 overflow-hidden",
              compact ? "max-h-[5.75rem]" : "max-h-[7.25rem] sm:max-h-[8rem]"
            )
          : cn(
              "h-full",
              compact ? "min-h-[5.75rem]" : "min-h-[7.25rem] sm:min-h-[8rem]"
            ),
        cancelled
          ? "border-[#8a7f88]/30 opacity-80 hover:border-[#8a7f88]/50 hover:bg-[#8a7f88]/10"
          : guestTone
            ? "border-[#d4a574]/35 hover:border-[#d4a574]/55 hover:bg-[#d4a574]/10"
            : "border-[#f3b8c4]/15 hover:border-[#e85a7a]/45 hover:bg-[#e85a7a]/10"
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <LiveSlotTime
          time={slot.time}
          timePrevious={slot.timePrevious}
          timeUpdated={slot.timeUpdated}
          className="text-[0.65rem]"
          accentClassName={
            cancelled
              ? "text-[#d8d0d4]"
              : guestTone
                ? "text-[#e8c49a]"
                : "text-[#e85a7a]"
          }
        />
        {cancelled ? (
          <span className="rounded-full border border-[#8a7f88]/45 px-2 py-0.5 text-[0.55rem] tracking-[0.12em] text-[#d8d0d4] uppercase">
            ยกเลิก
          </span>
        ) : collab || slot.isMember ? (
          <LiveSourceBadges
            isCollab={collab}
            isMember={slot.isMember}
            showChannel={false}
            size="sm"
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 min-w-0 font-medium text-[#fff5f7]",
          compact ? "text-xs leading-snug" : "text-sm leading-snug",
          crowded ? "truncate" : "line-clamp-3"
        )}
      >
        {label}
      </p>
      {!compact && !crowded && slot.titleLocal ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-[#f3b8c4]/60">
          {slot.title}
        </p>
      ) : null}
      {platform && !crowded ? (
        <p className="mt-auto pt-2 text-[0.6rem] tracking-[0.16em] text-[#f3b8c4]/55 uppercase">
          {platform}
        </p>
      ) : null}
    </button>
  );
}

function OfflineDaySlot({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center rounded-sm border border-[#6ec9b0]/25 bg-[#6ec9b0]/06",
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
        "flex h-full min-h-[7.25rem] items-center justify-center rounded-sm border border-dashed border-[#6ec9b0]/25 bg-[#6ec9b0]/05 sm:min-h-[8rem]",
        compact && "min-h-[5.5rem] sm:min-h-[5.5rem]"
      )}
    >
      <OfflineBadge size={compact ? "sm" : "md"} />
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
    const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
    const offline = offlineByDate.get(iso);
    const useCompact = forceCompact ?? compact;
    const crowded = daySlots.length > 1;

    if (daySlots.length > 0) {
      return (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2",
            crowded &&
              (useCompact
                ? "max-h-[12.5rem] overflow-hidden"
                : "max-h-[15.5rem] overflow-hidden sm:max-h-[17rem]")
          )}
        >
          {daySlots.map((slot) => (
            <div
              key={slot.id}
              className={cn("min-h-0", crowded ? "min-h-0 flex-1" : "flex-1")}
            >
              <SlotCard
                slot={slot}
                compact={useCompact}
                crowded={crowded}
                onOpen={() => setActiveSlot(slot)}
              />
            </div>
          ))}
        </div>
      );
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
            const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
            return (
              <div key={iso} className="flex min-w-0 flex-col">
                <div className="shrink-0 border-b border-[#f3b8c4]/20 pb-2 text-center">
                  <p className="text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/65 uppercase">
                    {thaiWeekdayShort(date)}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1">
                    <p className="text-xs tabular-nums text-[#f7d7de]/80">
                      {formatThaiShortDate(iso)}
                    </p>
                    <LiveDayChannelBadges slots={daySlots} size="sm" />
                  </div>
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
          const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
          const offline = offlineByDate.get(iso);
          return (
            <li key={iso} className="py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[0.65rem] tracking-[0.18em] text-[#f3b8c4]/65 uppercase">
                  {thaiWeekdayShort(date)} · {formatThaiShortDate(iso)}
                </p>
                <LiveDayChannelBadges slots={daySlots} size="sm" />
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {daySlots.length > 0 || offline ? (
                  renderDayBody(iso, true)
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#6ec9b0]/25 bg-[#6ec9b0]/06 px-3 py-2.5">
                    <OfflineBadge size="sm" />
                    <span className="text-xs text-[#a8e6d4]/75">
                      ไม่มีไลฟ์วันนี้
                    </span>
                  </div>
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
