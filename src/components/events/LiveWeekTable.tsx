"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Timer,
} from "lucide-react";

import { LiveCoverPlaceholder } from "@/components/events/LiveCoverPlaceholder";
import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import {
  LiveCancelledBadge,
  LiveDayChannelBadges,
  LiveSlotTime,
  LiveSourceBadges,
  preferOwnChannelSlots,
} from "@/components/events/LiveSlotMeta";
import { OfflineBadge } from "@/components/events/OfflineBadge";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  findDefaultWeekIndex,
  formatISODate,
  formatThaiShortDate,
  parseISODate,
  sortLiveWeeks,
  thaiWeekdayShort,
  weekDayDates,
  weekOverlapsYmdRange,
} from "@/lib/events";
import { getSlotCoverUrl } from "@/lib/live-cover";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import {
  BADGE_ACCENT_CLASS,
  BADGE_SOFT_CLASS,
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  LIVE_BADGE_CANCELLED,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_PILL_COMPACT,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type {
  LiveOfflineDay,
  LivePlatform,
  LiveSlot,
  LiveWeek,
  LiveWeekBanner,
} from "@/types/vtuber";

type LiveWeekTableProps = {
  weeks: LiveWeek[];
  className?: string;
  compact?: boolean;
  /** All slots for reschedule banner navigation (defaults to slots in `weeks`). */
  slotLookup?: LiveSlot[];
  /** Clamp week picker to the loaded schedule window (e.g. homepage 2-week range). */
  weekRange?: { from: string; to: string };
};

function platformLabel(platform?: LivePlatform) {
  if (platform === "youtube") return "YouTube";
  if (platform === "x") return "X";
  if (platform === "other") return "Other";
  return null;
}

function MobileSlotCard({
  slot,
  onOpen,
}: {
  slot: LiveSlot;
  onOpen: () => void;
}) {
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  const isMember = Boolean(slot.isMember);
  const guestTone = !own && collab && !cancelled;
  const label = slot.titleLocal ?? slot.title;
  const coverUrl = getSlotCoverUrl(slot);
  const isLive = slot.status === "live";
  const hasBadges = cancelled || collab || isMember;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${slot.timeUpdated ?? slot.time} · ${label}`}
      className={cn(
        "group flex h-[5.5rem] w-full items-stretch overflow-hidden rounded-2xl border bg-[#1a0c12]/70 text-left transition",
        cancelled
          ? "border-[#8a7f88]/30 opacity-80 hover:border-[#8a7f88]/50 hover:bg-[#8a7f88]/10"
          : guestTone
            ? "border-[#d4a574]/35 hover:border-[#d4a574]/55 hover:bg-[#d4a574]/10"
            : isLive
              ? "border-[#e85a7a]/60 shadow-[0_0_16px_rgba(232,90,122,0.18)] hover:border-[#e85a7a] hover:bg-[#1f0d16]"
              : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
      )}
    >
      {/* 🖼️ Left: Thumbnail Image (Fixed Width + Full Height) */}
      <div className="relative h-full w-28 shrink-0 overflow-hidden bg-[#10070b] xs:w-32">
        {coverUrl ? (
          <>
            <ProtectedImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className={cn(
                "absolute inset-0 h-full w-full scale-[1.25] object-cover object-center transition duration-500 group-hover:scale-[1.3]",
                cancelled && "opacity-60 grayscale-[0.35]"
              )}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/80 via-transparent to-transparent" />
          </>
        ) : (
          <LiveCoverPlaceholder className="relative" size="sm" />
        )}

        {/* Status badges on bottom-right of thumbnail */}
        {hasBadges ? (
          <div className="absolute bottom-1 right-1 flex flex-wrap items-center justify-end gap-1">
            {cancelled ? (
              <span
                className={cn(
                  LIVE_BADGE_PILL_COMPACT,
                  LIVE_BADGE_CANCELLED,
                  "h-4 bg-[#140a0d]/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                )}
              >
                ยกเลิก
              </span>
            ) : (
              <>
                {isMember ? (
                  <span
                    className={cn(
                      LIVE_BADGE_PILL_COMPACT,
                      LIVE_BADGE_MEMBER,
                      "h-4 bg-[#140a0d]/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                    )}
                  >
                    Member
                  </span>
                ) : null}
                {collab ? (
                  <span
                    className={cn(
                      LIVE_BADGE_PILL_COMPACT,
                      LIVE_BADGE_COLLAB,
                      "h-4 bg-[#140a0d]/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                    )}
                  >
                    Collab
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* 📝 Right: Content Details (Strict 2-Line Clamp with ellipsis '...') */}
      <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden p-2.5 sm:p-3">
        {/* Time Bar */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#e85a7a] px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-white uppercase shadow-[0_0_8px_rgba(232,90,122,0.6)]">
              <span className="size-1.5 animate-ping rounded-full bg-white" />
              LIVE NOW
            </span>
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <Clock
                className={cn(
                  "size-3 shrink-0",
                  cancelled
                    ? "text-[#8a7f88]"
                    : isMember
                      ? "text-[#9b8cff]"
                      : guestTone
                        ? "text-[#d4a574]"
                        : "text-[#e85a7a]"
                )}
              />
              <LiveSlotTime
                time={slot.time}
                timePrevious={slot.timePrevious ?? undefined}
                timeUpdated={slot.timeUpdated ?? undefined}
                className="text-xs font-bold tabular-nums"
                accentClassName={
                  cancelled
                    ? "text-[#d8d0d4]"
                    : isMember
                      ? "text-[#cfc6ff]"
                      : guestTone
                        ? "text-[#f3d9be]"
                        : "text-[#fff5f7]"
                }
              />
            </div>
          )}
        </div>

        {/* Title: บังคับตัดบรรทัดด้วย line-clamp-2 (เกินใส่ ...) */}
        <p className="line-clamp-2 min-w-0 text-[0.8rem] font-medium leading-snug text-[#fff5f7]">
          {label}
        </p>
      </div>
    </button>
  );
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
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  const isMember = Boolean(slot.isMember);
  // Own channel always rose; guests keep copper accent when collab/other
  const guestTone = !own && collab && !cancelled;
  const label = slot.titleLocal ?? slot.title;
  const coverUrl = getSlotCoverUrl(slot);
  const isLive = slot.status === "live";

  const hasBadges = cancelled || collab || isMember;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${slot.timeUpdated ?? slot.time} · ${label}`}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-2xl border bg-[#1a0c12]/60 text-left transition",
        crowded
          ? cn(
              "h-full min-h-0",
              compact ? "max-h-[12rem]" : "max-h-[15rem] sm:max-h-[16rem]"
            )
          : cn(
              "h-full",
              compact ? "min-h-[6.5rem]" : "min-h-[8.5rem] sm:min-h-[9.5rem]"
            ),
        cancelled
          ? "border-[#8a7f88]/30 opacity-80 hover:border-[#8a7f88]/50 hover:bg-[#8a7f88]/10"
          : guestTone
            ? "border-[#d4a574]/35 hover:border-[#d4a574]/55 hover:bg-[#d4a574]/10"
            : isLive
              ? "border-[#e85a7a]/60 shadow-[0_0_16px_rgba(232,90,122,0.18)] hover:border-[#e85a7a] hover:bg-[#1f0d16]"
              : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
      )}
    >
      {/* 🖼️ 1. Image Header (With Cover or Placeholder) */}
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#10070b]">
        {coverUrl ? (
          <>
            <ProtectedImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.04]",
                cancelled && "opacity-60 grayscale-[0.35]"
              )}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/80 via-transparent to-transparent" />
          </>
        ) : (
          <LiveCoverPlaceholder className="relative h-full w-full" size="md" />
        )}

        {/* 🏷️ Status Badges on Bottom-Right of Image with drop-shadow & backdrop blur */}
        {hasBadges ? (
          <div className="absolute bottom-1.5 right-1.5 flex flex-wrap items-center justify-end gap-1">
            {cancelled ? (
              <span
                className={cn(
                  LIVE_BADGE_PILL_COMPACT,
                  LIVE_BADGE_CANCELLED,
                  "shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md bg-[#140a0d]/85"
                )}
              >
                ยกเลิก
              </span>
            ) : (
              <>
                {slot.isMember ? (
                  <span
                    className={cn(
                      LIVE_BADGE_PILL_COMPACT,
                      LIVE_BADGE_MEMBER,
                      "shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md bg-[#140a0d]/85"
                    )}
                  >
                    Member
                  </span>
                ) : null}
                {collab ? (
                  <span
                    className={cn(
                      LIVE_BADGE_PILL_COMPACT,
                      LIVE_BADGE_COLLAB,
                      "shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md bg-[#140a0d]/85"
                    )}
                  >
                    Collab
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* 🕒 2. Hero Time Highlight Bar (คั่นกลางชัดเจน โล่ง โปร่ง เด่นชัด) */}
      <div
        className={cn(
          "flex min-w-0 items-center justify-between gap-1 border-y px-2.5 py-1.5 transition sm:px-3",
          cancelled
            ? "border-[#8a7f88]/20 bg-[#160a0f]/90"
            : isLive
              ? "border-[#e85a7a]/40 bg-[#e85a7a]/20"
              : "border-[#f3b8c4]/10 bg-[#14080e]/95 group-hover:bg-[#180912]"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#e85a7a] px-2 py-0.5 text-[0.68rem] font-bold tracking-wider text-white uppercase shadow-[0_0_8px_rgba(232,90,122,0.6)]">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
              LIVE NOW
            </span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock
                className={cn(
                  "size-3.5 shrink-0",
                  cancelled
                    ? "text-[#8a7f88]"
                    : isMember
                      ? "text-[#9b8cff]"
                      : guestTone
                        ? "text-[#d4a574]"
                        : "text-[#e85a7a]"
                )}
              />
              <LiveSlotTime
                time={slot.time}
                timePrevious={slot.timePrevious ?? undefined}
                timeUpdated={slot.timeUpdated ?? undefined}
                className="text-xs font-bold tabular-nums sm:text-[0.84rem]"
                accentClassName={
                  cancelled
                    ? "text-[#d8d0d4]"
                    : isMember
                      ? "text-[#cfc6ff]"
                      : guestTone
                        ? "text-[#f3d9be]"
                        : "text-[#fff5f7]"
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* 📝 3. Title Content */}
      <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-2.5">
        <p
          className={cn(
            "min-w-0 font-medium text-[#fff5f7]",
            compact
              ? "text-[0.72rem] leading-tight"
              : "text-[0.8rem] sm:text-[0.84rem] leading-snug",
            crowded ? "line-clamp-2" : "line-clamp-3"
          )}
        >
          {label}
        </p>
        {!compact && !crowded && slot.titleLocal ? (
          <p className="mt-0.5 line-clamp-1 text-[0.68rem] text-[#f3b8c4]/60">
            {slot.title}
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
        "flex h-full items-center justify-center border border-dashed border-[#6ec9b0]/25 bg-[#6ec9b0]/05",
        compact ? "min-h-[5.75rem] rounded-xl" : "min-h-[7.25rem] rounded-2xl sm:min-h-[8rem]"
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
        "flex h-full min-h-[7.25rem] items-center justify-center border border-dashed border-[#6ec9b0]/20 bg-transparent sm:min-h-[8rem]",
        compact ? "min-h-[5.5rem] rounded-xl sm:min-h-[5.5rem]" : "rounded-2xl"
      )}
    >
      <OfflineBadge size={compact ? "sm" : "md"} />
    </div>
  );
}

/** Spotlight highlight: only slots on today's Bangkok date. */
function findTodayHighlightSlot(
  week: LiveWeek,
  todayIso: string
): LiveSlot | null {
  if (!week?.slots?.length) return null;

  const todaySlots = week.slots
    .filter((s) => s.date === todayIso && s.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todaySlots.length === 0) return null;

  return (
    todaySlots.find((s) => s.status === "live") ??
    todaySlots.find((s) => s.status === "upcoming") ??
    [...todaySlots].reverse().find((s) => s.status === "ended") ??
    todaySlots[0]
  );
}

/** Next upcoming/live slot after today (current week, then optional pool). */
function findNextHighlightSlot(
  week: LiveWeek,
  todayIso: string,
  allSlots?: LiveSlot[]
): LiveSlot | null {
  const pool = allSlots?.length ? allSlots : (week.slots ?? []);
  const candidates = pool
    .filter(
      (s) =>
        s.date > todayIso &&
        s.status !== "cancelled" &&
        (s.status === "upcoming" || s.status === "live")
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
  return candidates[0] ?? null;
}

function useLiveClock(intervalMs = 30000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function getSlotTargetTimestamp(slot: LiveSlot): number | null {
  const timeStr =
    slot.scheduledUpdated ??
    slot.scheduledLabel ??
    (slot.time !== "LIVE" && slot.time !== "TBA" ? slot.time : null);
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const dateObj = parseISODate(slot.date);
  // Bangkok time is UTC+7
  return new Date(
    Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h - 7, m)
  ).getTime();
}

function getCountdownLabel(
  targetMs: number | null,
  nowMs: number | null,
  short = false
): string | null {
  if (!targetMs || !nowMs) return null;
  const diff = targetMs - nowMs;
  if (diff <= 0) return null;
  // Only show countdown if within 24 hours
  if (diff > 24 * 3600 * 1000) return null;
  const totalMin = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;

  if (short) {
    if (hours > 0) return `อีก ${hours} ชม.`;
    return `อีก ${Math.max(1, minutes)} นาที`;
  }

  if (hours > 0) {
    return minutes > 0
      ? `เริ่มในอีก ${hours} ชม. ${minutes} นาที`
      : `เริ่มในอีก ${hours} ชม.`;
  }
  return `เริ่มในอีก ${Math.max(1, minutes)} นาที`;
}

function LiveSpotlightBanner({
  slot,
  onOpenDetail,
  nowMs,
}: {
  slot: LiveSlot;
  onOpenDetail: () => void;
  nowMs: number | null;
}) {
  const coverUrl = getSlotCoverUrl(slot);
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  const label = slot.titleLocal ?? slot.title;
  const isLive = slot.status === "live";
  const isUpcoming = slot.status === "upcoming";

  const targetTimestamp = isUpcoming ? getSlotTargetTimestamp(slot) : null;
  const countdownText = targetTimestamp
    ? getCountdownLabel(targetTimestamp, nowMs, false)
    : null;

  const badgeText = isLive
    ? "กำลังไลฟ์ (LIVE NOW)"
    : isUpcoming
      ? "ไลฟ์วันนี้"
      : slot.status === "ended"
        ? "ไลฟ์วันนี้ (จบแล้ว)"
        : "ไลฟ์วันนี้";

  const dateObj = parseISODate(slot.date);
  const dateFormatted = `${thaiWeekdayShort(dateObj)} ${formatThaiShortDate(slot.date)}`;
  const timeFormatted = slot.time;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#e85a7a]/35 bg-gradient-to-r from-[#220e18]/95 via-[#1a0c12]/90 to-[#140a0d] shadow-[0_16px_40px_rgba(232,90,122,0.16)]">
      {/* 💻 Desktop / Tablet: Split Panorama Glass Card */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {/* 🏷️ Row 1: Badges & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase shadow-sm",
                isLive
                  ? "border-[#e85a7a] bg-[#e85a7a] text-white shadow-[0_0_16px_rgba(232,90,122,0.6)]"
                  : isUpcoming
                    ? "border-[#e85a7a]/60 bg-[#e85a7a]/20 text-[#fff5f7]"
                    : "border-[#f3b8c4]/30 bg-[#f3b8c4]/15 text-[#f7d7de]"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  isLive
                    ? "animate-ping bg-white"
                    : isUpcoming
                      ? "bg-[#e85a7a] animate-pulse"
                      : "bg-[#f3b8c4]/80"
                )}
              />
              {badgeText}
            </span>

            {countdownText ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e85a7a]/60 bg-[#e85a7a]/25 px-3 py-1 text-xs font-bold text-[#fff5f7] shadow-[0_0_16px_rgba(232,90,122,0.35)]">
                <Timer className="size-3.5 animate-pulse text-[#fff5f7]" />
                {countdownText}
              </span>
            ) : null}

            <LiveSourceBadges
              isOwnChannel={own}
              sourceTitle={slot.sourceTitle}
              isCollab={collab}
              isMember={slot.isMember}
              showChannel={!own}
              size="md"
            />
          </div>

          {/* 🕒 Row 2: Prominent Date & Time Bar */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#f3b8c4]/15 bg-[#14080e]/90 px-3 py-1.5 text-[#fff5f7] shadow-inner">
              <Calendar className="size-3.5 text-[#e85a7a]" />
              <span className="font-semibold">{dateFormatted}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#f3b8c4]/15 bg-[#14080e]/90 px-3 py-1.5 text-[#fff5f7] shadow-inner">
              <Clock
                className={cn(
                  "size-3.5 shrink-0",
                  cancelled
                    ? "text-[#8a7f88]"
                    : slot.isMember
                      ? "text-[#9b8cff]"
                      : collab && !own
                        ? "text-[#d4a574]"
                        : "text-[#e85a7a]"
                )}
              />
              <span className="font-bold tabular-nums text-white">
                {timeFormatted}
              </span>
            </div>
          </div>

          {/* 📝 Row 3: Title */}
          <h3
            className="mt-3.5 line-clamp-2 font-[family-name:var(--font-display)] text-xl font-normal leading-snug tracking-normal text-[#fff5f7] sm:text-2xl"
            title={label}
          >
            {label}
          </h3>

          {slot.titleLocal ? (
            <p className="mt-1 line-clamp-1 text-sm text-[#f3b8c4]/65">
              {slot.title}
            </p>
          ) : null}

          {/* 🔘 Row 4: Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {slot.url ? (
              <a
                href={slot.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  CTA_PRIMARY_CLASS,
                  "inline-flex items-center gap-1.5 shadow-md"
                )}
              >
                เปิดดูสตรีม
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onOpenDetail}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                CTA_OUTLINE_CLASS
              )}
            >
              ดูรายละเอียด
            </button>
          </div>
        </div>

        {/* 🖼️ Right: Thumbnail */}
        {coverUrl ? (
          <button
            type="button"
            onClick={onOpenDetail}
            className="group relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/20 bg-[#12080c] text-left transition hover:border-[#e85a7a]/50 lg:w-80"
          >
            <ProtectedImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/70 via-transparent to-transparent" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenDetail}
            className="relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/20 bg-[#12080c] text-left transition hover:border-[#e85a7a]/50 lg:w-80"
          >
            <LiveCoverPlaceholder className="absolute inset-0" size="lg" />
          </button>
        )}
      </div>

      {/* 📱 Mobile: Vertical Stack Card */}
      <div className="flex flex-col sm:hidden">
        {coverUrl ? (
          <button
            type="button"
            onClick={onOpenDetail}
            className="relative aspect-[16/9] w-full overflow-hidden bg-[#12080c] text-left"
          >
            <ProtectedImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full scale-[1.12] object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a0c12] to-transparent" />
            
            {/* Top-left Badges overlay on mobile image */}
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 max-w-[85%]">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold uppercase shadow-sm backdrop-blur-md",
                  isLive
                    ? "border-[#e85a7a] bg-[#e85a7a] text-white shadow-[0_0_12px_rgba(232,90,122,0.6)]"
                    : "border-[#e85a7a]/60 bg-[#140a0d]/85 text-[#fff5f7]"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isLive ? "animate-ping bg-white" : "bg-[#e85a7a]"
                  )}
                />
                {badgeText}
              </span>

              {countdownText ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#e85a7a]/60 bg-[#140a0d]/85 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#fff5f7] shadow-sm backdrop-blur-md">
                  <Timer className="size-3 animate-pulse text-[#e85a7a]" />
                  {countdownText}
                </span>
              ) : null}

              <LiveSourceBadges
                isOwnChannel={own}
                sourceTitle={slot.sourceTitle}
                isCollab={collab}
                isMember={slot.isMember}
                showChannel={!own}
                size="sm"
              />
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenDetail}
            className="relative aspect-[16/9] w-full overflow-hidden bg-[#12080c] text-left"
          >
            <LiveCoverPlaceholder className="absolute inset-0" size="lg" />
          </button>
        )}

        <div className="p-4">
          {!coverUrl ? (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold uppercase",
                  isLive
                    ? "border-[#e85a7a] bg-[#e85a7a] text-white"
                    : "border-[#e85a7a]/60 bg-[#e85a7a]/20 text-[#fff5f7]"
                )}
              >
                {badgeText}
              </span>

              {countdownText ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#e85a7a]/60 bg-[#e85a7a]/25 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#fff5f7] shadow-sm">
                  <Timer className="size-3 animate-pulse text-[#fff5f7]" />
                  {countdownText}
                </span>
              ) : null}

              <LiveSourceBadges
                isOwnChannel={own}
                sourceTitle={slot.sourceTitle}
                isCollab={collab}
                isMember={slot.isMember}
                showChannel={!own}
                size="sm"
              />
            </div>
          ) : null}

          {/* 🕒 Mobile Date & Time Bar */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#f3b8c4]/15 bg-[#14080e]/90 px-2.5 py-1 text-[#fff5f7]">
              <Calendar className="size-3 text-[#e85a7a]" />
              <span className="font-semibold">{dateFormatted}</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#f3b8c4]/15 bg-[#14080e]/90 px-2.5 py-1 text-[#fff5f7]">
              <Clock
                className={cn(
                  "size-3 shrink-0",
                  cancelled
                    ? "text-[#8a7f88]"
                    : slot.isMember
                      ? "text-[#9b8cff]"
                      : collab && !own
                        ? "text-[#d4a574]"
                        : "text-[#e85a7a]"
                )}
              />
              <span className="font-bold tabular-nums text-white">{timeFormatted}</span>
            </div>
          </div>

          <h3 className="mt-2.5 line-clamp-2 font-[family-name:var(--font-display)] text-lg font-normal leading-snug tracking-normal text-[#fff5f7]">
            {label}
          </h3>

          {slot.titleLocal ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-[#f3b8c4]/65">
              {slot.title}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            {slot.url ? (
              <a
                href={slot.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  CTA_PRIMARY_CLASS,
                  "flex w-full items-center justify-center gap-1.5"
                )}
              >
                เปิดดูสตรีม
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onOpenDetail}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                CTA_OUTLINE_CLASS,
                "w-full text-xs"
              )}
            >
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveTodayOfflineBanner({
  todayIso,
  nextSlot,
  onOpenNext,
}: {
  todayIso: string;
  nextSlot: LiveSlot | null;
  onOpenNext?: () => void;
}) {
  const dateObj = parseISODate(todayIso);
  const dateFormatted = `${thaiWeekdayShort(dateObj)} ${formatThaiShortDate(todayIso)}`;

  const nextCoverUrl = nextSlot ? getSlotCoverUrl(nextSlot) : null;
  const nextLabel = nextSlot
    ? (nextSlot.titleLocal ?? nextSlot.title)
    : null;
  const nextDateFormatted = nextSlot
    ? `${thaiWeekdayShort(parseISODate(nextSlot.date))} ${formatThaiShortDate(nextSlot.date)}`
    : null;

  const nextPreview = nextSlot ? (
    <button
      type="button"
      onClick={onOpenNext}
      className="group flex w-full items-center gap-3 rounded-2xl border border-[#f3b8c4]/20 bg-[#14080e]/90 p-2.5 text-left transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12] sm:w-auto sm:min-w-[18rem]"
    >
      <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl border border-[#f3b8c4]/15 bg-[#12080c] sm:w-24">
        {nextCoverUrl ? (
          <ProtectedImage
            src={nextCoverUrl}
            alt={nextLabel ?? "ไลฟ์ถัดไป"}
            wrapClassName="absolute inset-0 block"
            className="absolute inset-0 h-full w-full scale-[1.2] object-cover object-center"
          />
        ) : (
          <LiveCoverPlaceholder className="absolute inset-0" size="sm" />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-[0.65rem] font-semibold tracking-[0.12em] text-[#e85a7a] uppercase">
          ไลฟ์ถัดไป
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#f7d7de]/90">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3 text-[#e85a7a]" />
            {nextDateFormatted}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="size-3 text-[#e85a7a]" />
            {nextSlot.time}
          </span>
        </span>
        <span className="line-clamp-1 text-sm font-medium text-[#fff5f7] group-hover:text-white">
          {nextLabel}
        </span>
      </span>
    </button>
  ) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#e85a7a]/35 bg-gradient-to-r from-[#220e18]/95 via-[#1a0c12]/90 to-[#140a0d] shadow-[0_16px_40px_rgba(232,90,122,0.16)]">
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <OfflineBadge size="md" />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#f3b8c4]/15 bg-[#14080e]/90 px-3 py-1.5 text-[#fff5f7] shadow-inner">
              <Calendar className="size-3.5 text-[#e85a7a]" />
              <span className="font-semibold">{dateFormatted}</span>
            </div>
          </div>

          {/* Same slot as LiveSpotlight action buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {nextPreview}
          </div>
        </div>

        <div className="relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/20 bg-[#12080c] lg:w-80">
          <LiveCoverPlaceholder
            className="absolute inset-0"
            size="lg"
            variant="offline"
          />
        </div>
      </div>

      <div className="flex flex-col sm:hidden">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#12080c]">
          <LiveCoverPlaceholder
            className="absolute inset-0"
            size="lg"
            variant="offline"
          />
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
            <OfflineBadge size="sm" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#f3b8c4]/15 bg-[#14080e]/90 px-2.5 py-1 text-[#fff5f7]">
              <Calendar className="size-3 text-[#e85a7a]" />
              <span className="font-semibold">{dateFormatted}</span>
            </div>
          </div>

          {/* Same slot as LiveSpotlight mobile action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            {nextPreview}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveWeekBannerCard({
  banner,
}: {
  banner: LiveWeekBanner;
}) {
  const isExternal = banner.linkUrl?.startsWith("http");
  const LinkComponent = banner.linkUrl ? (isExternal ? "a" : Link) : "div";
  const linkProps = banner.linkUrl
    ? isExternal
      ? { href: banner.linkUrl, target: "_blank", rel: "noreferrer" }
      : { href: banner.linkUrl }
    : {};

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e85a7a]/30 bg-gradient-to-r from-[#220e18]/90 via-[#1a0c12]/80 to-[#140a0d] shadow-[0_12px_32px_rgba(232,90,122,0.12)]">
      {/* 💻 Desktop / Tablet: Split Panorama Glass Card */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className={cn(BADGE_ACCENT_CLASS, "uppercase tracking-wider")}>
              <Sparkles className="size-3 shrink-0" />
              {banner.badge ?? "SPECIAL HIGHLIGHT"}
            </span>
          </div>

          <h3 className="mt-2.5 font-[family-name:var(--font-display)] text-xl font-normal leading-snug tracking-normal text-[#fff5f7] sm:text-2xl">
            {banner.title}
          </h3>

          {banner.subtitle ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#f7d7de]/80">
              {banner.subtitle}
            </p>
          ) : null}

          {banner.linkUrl ? (
            <div className="mt-4">
              <LinkComponent
                {...(linkProps as any)}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  CTA_PRIMARY_CLASS,
                  "inline-flex items-center gap-1.5"
                )}
              >
                {banner.buttonLabel ?? "ดูรายละเอียด"}
                <ArrowUpRight className="size-4" />
              </LinkComponent>
            </div>
          ) : null}
        </div>

        {banner.imageUrl ? (
          <div className="relative aspect-[16/9] w-56 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#12080c] lg:w-72">
            <ProtectedImage
              src={banner.imageUrl}
              alt={banner.imageAlt ?? banner.title}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 hover:scale-[1.03]"
            />
          </div>
        ) : null}
      </div>

      {/* 📱 Mobile: Vertical Stack Card */}
      <div className="flex flex-col sm:hidden">
        {banner.imageUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#12080c]">
            <ProtectedImage
              src={banner.imageUrl}
              alt={banner.imageAlt ?? banner.title}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a0c12] to-transparent" />
            <span
              className={cn(
                BADGE_ACCENT_CLASS,
                "absolute left-3 top-3 uppercase tracking-wider backdrop-blur-md"
              )}
            >
              <Sparkles className="size-3 shrink-0" />
              {banner.badge ?? "SPECIAL"}
            </span>
          </div>
        ) : null}

        <div className="p-4">
          {!banner.imageUrl ? (
            <span className={cn(BADGE_ACCENT_CLASS, "uppercase tracking-wider")}>
              <Sparkles className="size-3 shrink-0" />
              {banner.badge ?? "SPECIAL HIGHLIGHT"}
            </span>
          ) : null}

          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-normal leading-snug tracking-normal text-[#fff5f7]">
            {banner.title}
          </h3>

          {banner.subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#f7d7de]/80">
              {banner.subtitle}
            </p>
          ) : null}

          {banner.linkUrl ? (
            <LinkComponent
              {...(linkProps as any)}
              className={cn(
                buttonVariants({ size: "sm" }),
                CTA_PRIMARY_CLASS,
                "mt-3.5 flex w-full items-center justify-center gap-1.5"
              )}
            >
              {banner.buttonLabel ?? "ดูรายละเอียด"}
              <ArrowUpRight className="size-4" />
            </LinkComponent>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LiveWeekTable({
  weeks,
  className,
  compact = false,
  slotLookup,
  weekRange,
}: LiveWeekTableProps) {
  const nowMs = useLiveClock(30000);
  const sorted = useMemo(() => sortLiveWeeks(weeks), [weeks]);
  const visibleWeeks = useMemo(() => {
    if (!weekRange) return sorted;
    return sorted.filter((week) =>
      weekOverlapsYmdRange(week.weekStart, weekRange.from, weekRange.to)
    );
  }, [sorted, weekRange]);

  const [index, setIndex] = useState(() => findDefaultWeekIndex(visibleWeeks));
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);

  useEffect(() => {
    setIndex(findDefaultWeekIndex(visibleWeeks));
  }, [visibleWeeks]);

  const safeIndex = Math.min(
    Math.max(index, 0),
    Math.max(visibleWeeks.length - 1, 0)
  );
  const week = visibleWeeks[safeIndex];
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

  const allSlots = useMemo(
    () => slotLookup ?? sorted.flatMap((w) => w.slots),
    [slotLookup, sorted]
  );

  const offlineByDate = useMemo(() => {
    const map = new Map<string, LiveOfflineDay>();
    for (const day of week?.offlineDays ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [week]);

  const todayIso =
    bangkokDateFromIso(new Date().toISOString()) ?? formatISODate(new Date());
  const weekIncludesToday = Boolean(week && dayIsos.includes(todayIso));

  const highlightSlot = useMemo(
    () =>
      week && weekIncludesToday
        ? findTodayHighlightSlot(week, todayIso)
        : null,
    [week, weekIncludesToday, todayIso]
  );

  const nextHighlightSlot = useMemo(
    () =>
      week && weekIncludesToday && !highlightSlot
        ? findNextHighlightSlot(week, todayIso, allSlots)
        : null,
    [week, weekIncludesToday, highlightSlot, todayIso, allSlots]
  );

  if (!week) {
    return <p className="text-sm text-[#f3b8c4]/70">ยังไม่มีตารางไลฟ์</p>;
  }

  const rangeLabel = `${formatThaiShortDate(dayIsos[0] ?? week.weekStart)} – ${formatThaiShortDate(dayIsos[6] ?? week.weekStart)}`;

  const renderDayBody = (iso: string, isMobile?: boolean) => {
    const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
    const offline = offlineByDate.get(iso);
    const crowded = daySlots.length > 1;

    if (daySlots.length > 0) {
      if (isMobile) {
        return (
          <div className="flex flex-col gap-2">
            {daySlots.map((slot) => (
              <MobileSlotCard
                key={slot.id}
                slot={slot}
                onOpen={() => setActiveSlot(slot)}
              />
            ))}
          </div>
        );
      }

      return (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2",
            crowded &&
              (compact
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
                compact={compact}
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
          <OfflineDaySlot compact={compact} />
        </div>
      );
    }

    return (
      <div className="flex-1">
        <EmptyDaySlot compact={compact} />
      </div>
    );
  };

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={META_MUTED_CLASS}>
            {week.label ?? "สัปดาห์นี้"}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-normal text-[#fff5f7] sm:text-xl">
            {rangeLabel}
          </p>
        </div>

        {visibleWeeks.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="สัปดาห์ก่อนหน้า"
              disabled={safeIndex <= 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                CTA_OUTLINE_CLASS,
                "size-9 disabled:opacity-35"
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-[#f3b8c4]/70 sm:text-sm">
              {safeIndex + 1} / {visibleWeeks.length}
            </span>
            <button
              type="button"
              aria-label="สัปดาห์ถัดไป"
              disabled={safeIndex >= visibleWeeks.length - 1}
              onClick={() =>
                setIndex((value) =>
                  Math.min(visibleWeeks.length - 1, value + 1)
                )
              }
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                CTA_OUTLINE_CLASS,
                "size-9 disabled:opacity-35"
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* 🌟 Top Spotlight Banner: Custom weekly banner or today's live highlight */}
      {week.banner ? (
        <LiveWeekBannerCard banner={week.banner} />
      ) : highlightSlot ? (
        <LiveSpotlightBanner
          slot={highlightSlot}
          nowMs={nowMs}
          onOpenDetail={() => setActiveSlot(highlightSlot)}
        />
      ) : weekIncludesToday ? (
        <LiveTodayOfflineBanner
          todayIso={todayIso}
          nextSlot={nextHighlightSlot}
          onOpenNext={
            nextHighlightSlot
              ? () => setActiveSlot(nextHighlightSlot)
              : undefined
          }
        />
      ) : null}

      <div
        className={cn(
          "hidden overflow-x-auto sm:block -my-3 -mx-2 py-3 px-2",
          compact && "sm:block"
        )}
      >
        <div className="grid min-w-[44rem] grid-cols-7 items-stretch gap-2.5">
          {dayIsos.map((iso) => {
            const date = parseISODate(iso);
            const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
            const isToday = iso === todayIso;

            return (
              <div
                key={iso}
                className="relative flex min-w-0 flex-col"
              >
                {/* 🌟 Today Neon Glow Overlay (ลอยรอบคอลัมน์ครบ 4 ด้าน ไม่บีบการ์ดด้านใน) */}
                {isToday ? (
                  <div className="pointer-events-none absolute -inset-1.5 rounded-2xl border-2 border-[#e85a7a]/60 bg-[#e85a7a]/08 shadow-[0_0_24px_rgba(232,90,122,0.22)]" />
                ) : null}

                <div
                  className={cn(
                    "relative z-10 shrink-0 border-b pb-2 text-center",
                    isToday ? "border-[#e85a7a]/40" : "border-[#f3b8c4]/15"
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isToday ? (
                      <span className="size-1.5 rounded-full bg-[#e85a7a] animate-ping" />
                    ) : null}
                    <p
                      className={cn(
                        "text-xs tracking-[0.14em] uppercase sm:text-sm",
                        isToday ? "font-bold text-[#fff5f7]" : "text-[#f3b8c4]/65"
                      )}
                    >
                      {thaiWeekdayShort(date)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-2 py-0.5 text-xs tabular-nums sm:text-sm",
                        isToday
                          ? "rounded-full border border-[#e85a7a]/50 bg-[#e85a7a]/25 font-semibold text-[#fff5f7] shadow-sm"
                          : "text-[#f7d7de]/80"
                      )}
                    >
                      {formatThaiShortDate(iso)}
                    </span>
                    <LiveDayChannelBadges slots={daySlots} size="sm" />
                  </div>
                </div>
                <div className="relative z-10 mt-2 flex flex-1 flex-col gap-2">
                  {renderDayBody(iso)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="relative divide-y divide-[#f3b8c4]/10 sm:hidden -mx-2 px-2 py-1">
        {dayIsos.map((iso) => {
          const date = parseISODate(iso);
          const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
          const offline = offlineByDate.get(iso);
          const isToday = iso === todayIso;

          return (
            <li
              key={iso}
              className="relative py-4 first:pt-1.5 last:pb-1.5 transition-all"
            >
              {/* 🌟 Today Glow Overlay on Mobile (เหมือนบน Desktop ลอยครอบรอบด้าน ไม่บีบการ์ดด้านใน) */}
              {isToday ? (
                <div className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 rounded-2xl border-2 border-[#e85a7a]/60 bg-[#e85a7a]/08 shadow-[0_0_24px_rgba(232,90,122,0.18)]" />
              ) : null}

              <div className="relative z-10 flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1">
                  {isToday ? (
                    <span className="size-1.5 rounded-full bg-[#e85a7a] animate-ping" />
                  ) : null}
                  <p
                    className={cn(
                      "text-xs tracking-[0.14em] uppercase sm:text-sm",
                      isToday ? "font-bold text-[#fff5f7]" : "text-[#f3b8c4]/65"
                    )}
                  >
                    {thaiWeekdayShort(date)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center justify-center px-2 py-0.5 text-xs tabular-nums sm:text-sm",
                    isToday
                      ? "rounded-full border border-[#e85a7a]/50 bg-[#e85a7a]/25 font-semibold text-[#fff5f7]"
                      : "text-[#f7d7de]/80"
                  )}
                >
                  {formatThaiShortDate(iso)}
                </span>
                {isToday ? (
                  <span className={cn(BADGE_ACCENT_CLASS, "px-2 py-0.5 text-[0.65rem] uppercase font-bold shadow-sm")}>
                    วันนี้
                  </span>
                ) : null}
                <LiveDayChannelBadges slots={daySlots} size="sm" />
              </div>
              <div className="relative z-10 mt-2.5 flex flex-col gap-2">
                {daySlots.length > 0 || offline ? (
                  renderDayBody(iso, true)
                ) : (
                  <div className="flex items-center gap-2 border-l-2 border-dashed border-[#6ec9b0]/40 px-3 py-2">
                    <OfflineBadge size="sm" />
                    <span className="text-xs text-[#a8e6d4]/75">
                      ไม่มีไลฟ์
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
        onSelectSlot={(slotId) => {
          const related = allSlots.find((s) => s.id === slotId);
          if (related) setActiveSlot(related);
        }}
      />
    </div>
  );
}
