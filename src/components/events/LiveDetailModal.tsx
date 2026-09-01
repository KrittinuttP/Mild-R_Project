"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  ExternalLink,
  Images,
  Play,
  Radio,
  Timer,
} from "lucide-react";

import { LiveSlotTime } from "@/components/events/LiveSlotMeta";
import { LiveCoverPlaceholder } from "@/components/events/LiveCoverPlaceholder";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatThaiDate, parseISODate, thaiWeekdayShort } from "@/lib/events";
import { getSlotCoverUrl } from "@/lib/live-cover";
import {
  CTA_PRIMARY_CLASS,
  MODAL_CLOSE_BUTTON_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { LivePlatform, LiveSlot } from "@/types/vtuber";

type LiveDetailModalProps = {
  slot: LiveSlot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Switch modal to a paired rescheduled slot (same video, different date). */
  onSelectSlot?: (slotId: string) => void;
};

function platformLabel(platform?: LivePlatform) {
  if (platform === "youtube") return "YouTube";
  if (platform === "x") return "X";
  if (platform === "other") return "Other";
  return null;
}

function statusLabel(status?: LiveSlot["status"]) {
  if (status === "live") return "กำลังไลฟ์";
  if (status === "upcoming") return "รอไลฟ์";
  if (status === "ended") return "ไลฟ์จบแล้ว";
  if (status === "cancelled") return "ยกเลิก";
  return null;
}

function MetaPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[0.7rem] leading-none tracking-wide md:h-8 md:gap-1.5 md:px-3 md:text-xs",
        className
      )}
    >
      {children}
    </span>
  );
}

function TimeCell({
  label,
  icon,
  children,
  accent,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 px-2.5 py-2 sm:px-3.5 sm:py-2.5",
        accent && "bg-[#e85a7a]/06"
      )}
    >
      <p className="flex items-center gap-1 text-[0.65rem] tracking-[0.12em] text-[#f3b8c4]/60 uppercase sm:gap-1.5 sm:text-xs sm:tracking-[0.14em]">
        <span className="opacity-80" aria-hidden>
          {icon}
        </span>
        {label}
      </p>
      <div className="mt-0.5 font-[family-name:var(--font-display)] text-[0.82rem] tabular-nums text-[#fff5f7] sm:mt-1 sm:text-sm md:text-[0.95rem]">
        {children}
      </div>
    </div>
  );
}

function WatchLink({
  slot,
  external,
  className,
}: {
  slot: LiveSlot;
  external: boolean;
  className?: string;
}) {
  if (!slot.url) return null;

  return (
    <Link
      href={slot.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        buttonVariants({ size: "lg" }),
        CTA_PRIMARY_CLASS,
        "group flex h-10 w-full items-center justify-center gap-2 font-semibold md:h-11",
        className
      )}
    >
      <Play className="size-4 fill-current" aria-hidden />
      <span>ไปดูไลฟ์</span>
      {external ? <ExternalLink className="size-3.5 opacity-75" /> : null}
    </Link>
  );
}

function formatNewLiveDateLine(iso: string, time?: string) {
  const date = parseISODate(iso);
  const shortMonth = date.toLocaleDateString("th-TH-u-ca-gregory", {
    month: "short",
  });
  const label = `${thaiWeekdayShort(date)} ${date.getDate()} ${shortMonth}`;
  return time ? `${label} · ${time}` : label;
}

/** Ghost slot: single card CTA to open the later live round in-app. */
function NewLiveRoundCta({
  link,
  onSelectSlot,
  className,
}: {
  link: NonNullable<LiveSlot["rescheduleLink"]>;
  onSelectSlot: (slotId: string) => void;
  className?: string;
}) {
  const dateLine = formatNewLiveDateLine(link.date, link.time);

  return (
    <button
      type="button"
      onClick={() => onSelectSlot(link.slotId)}
      aria-label={`มีการไลฟ์ใหม่ ${dateLine} — เปิดไลฟ์รอบใหม่`}
      className={cn(
        "group w-full overflow-hidden rounded-xl border border-[#f3b8c4]/18 bg-gradient-to-br from-[#e85a7a]/12 via-[#1c0c14]/90 to-[#14080e]/95 p-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition duration-200 sm:rounded-2xl sm:p-3.5",
        "hover:border-[#e85a7a]/45 hover:from-[#e85a7a]/18 hover:shadow-[0_12px_28px_rgba(232,90,122,0.16)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14080e]",
        className
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e85a7a]/25 bg-[#e85a7a]/12 text-[#f3b8c4] transition group-hover:border-[#e85a7a]/40 group-hover:bg-[#e85a7a]/20 sm:size-10 sm:rounded-xl"
          aria-hidden
        >
          <Radio className="size-3.5 sm:size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-semibold tracking-[0.1em] text-[#e85a7a] uppercase sm:text-[0.68rem] sm:tracking-[0.12em]">
            มีการไลฟ์ใหม่
          </p>
          <p className="mt-px flex items-center gap-1 font-[family-name:var(--font-display)] text-xs leading-snug tabular-nums text-[#fff5f7] sm:mt-0.5 sm:gap-1.5 sm:text-sm">
            <CalendarDays
              className="size-3 shrink-0 text-[#f3b8c4]/55 sm:size-3.5"
              aria-hidden
            />
            <span className="truncate">{dateLine}</span>
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[0.68rem] font-semibold text-[#f3b8c4] transition group-hover:text-[#fff5f7] sm:gap-1 sm:text-xs">
          <span>ไลฟ์รอบใหม่</span>
          <ArrowRight
            className="size-3.5 shrink-0 transition group-hover:translate-x-0.5 sm:size-4"
            aria-hidden
          />
        </span>
      </div>
    </button>
  );
}

function isGhostNewLiveRound(
  slot: LiveSlot,
  onSelectSlot?: (slotId: string) => void
) {
  return (
    slot.status === "cancelled" &&
    slot.rescheduleLink?.direction === "to" &&
    Boolean(onSelectSlot)
  );
}

export function LiveDetailModal({
  slot,
  open,
  onOpenChange,
  onSelectSlot,
}: LiveDetailModalProps) {
  const external = Boolean(slot?.url?.startsWith("http"));
  const own = Boolean(slot?.isOwnChannel);
  const collab = slot?.kind === "collab";
  const cancelled = slot?.status === "cancelled";
  const platform = platformLabel(slot?.platform);
  const coverCandidates = useMemo(() => {
    const urls: string[] = [];
    const primary = slot ? getSlotCoverUrl(slot) : null;
    if (primary) urls.push(primary);
    for (const item of slot?.coverHistory ?? []) {
      if (item.url && !urls.includes(item.url)) urls.push(item.url);
    }
    return urls;
  }, [slot]);
  const [activeCover, setActiveCover] = useState<string | null>(
    coverCandidates[0] ?? null
  );

  useEffect(() => {
    setActiveCover(coverCandidates[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on slot change
  }, [slot?.id, open]);

  const displayTitle = slot?.titleLocal ?? slot?.title ?? "";
  const statusText = statusLabel(slot?.status);
  const history = slot?.coverHistory ?? [];

  const scheduledDisplay =
    slot?.scheduledLabel ??
    (slot?.time !== "LIVE" && slot?.time !== "TBA" ? slot?.time : null);
  const hasScheduleBlock = Boolean(
    scheduledDisplay ||
      slot?.scheduledPrevious ||
      slot?.actualStartLabel ||
      slot?.actualEndLabel ||
      slot?.durationLabel ||
      cancelled
  );

  const startValue = slot?.actualStartLabel ?? (
    <span className="text-[#f3b8c4]/45">
      {cancelled ? "ไม่ได้เริ่ม" : "ยังไม่เริ่ม"}
    </span>
  );
  const endValue = slot?.actualEndLabel ?? (
    <span className="text-[#f3b8c4]/45">—</span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-lg overflow-hidden rounded-3xl border border-[#f3b8c4]/20 bg-gradient-to-b from-[#220e18]/95 via-[#1a0c12]/95 to-[#12070c] p-0 text-[#fff5f7] shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl md:max-w-3xl"
        showCloseButton
        closeButtonClassName={MODAL_CLOSE_BUTTON_CLASS}
      >
        {slot ? (
          <div className="relative md:grid md:grid-cols-12 md:overflow-visible">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#e85a7a]/80 to-transparent" />

            {/* 🖼️ Left Column: Media & Primary Action (md:col-span-5) */}
            <div className="flex flex-col justify-between gap-2 border-b border-[#f3b8c4]/12 bg-[#10070b]/70 p-3 sm:gap-4 sm:p-5 md:col-span-5 md:border-b-0 md:border-r">
              <div className="space-y-2 sm:space-y-3.5">
                {/* Main Thumbnail Container */}
                <div className="relative aspect-video max-h-[9.75rem] w-full overflow-hidden rounded-xl border border-[#f3b8c4]/15 bg-[#12070c] shadow-md sm:max-h-none sm:rounded-2xl">
                  {activeCover ? (
                    <ProtectedImage
                      src={activeCover}
                      alt={displayTitle}
                      wrapClassName="absolute inset-0 block"
                      className={cn(
                        "h-full w-full object-cover",
                        cancelled && "opacity-70 grayscale-[0.35]"
                      )}
                    />
                  ) : (
                    <LiveCoverPlaceholder className="absolute inset-0" size="lg" />
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/80 via-transparent to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold tracking-wider uppercase shadow-md backdrop-blur-md",
                        cancelled
                          ? "border-[#8a7f88]/50 bg-[#140a0d]/85 text-[#d8d0d4]"
                          : slot.status === "live"
                            ? "border-[#e85a7a]/70 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_12px_rgba(232,90,122,0.5)]"
                            : "border-[#f3b8c4]/30 bg-[#140a0d]/85 text-[#f3b8c4]"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          cancelled
                            ? "bg-[#8a7f88]"
                            : slot.status === "live"
                              ? "animate-pulse bg-[#e85a7a]"
                              : "bg-[#f3b8c4]/80"
                        )}
                      />
                      {statusText ?? "Live"}
                    </span>
                  </div>
                </div>

                {/* 🎞️ Cover History (if more than 1) */}
                {history.length > 1 ? (
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-1 text-[0.58rem] font-medium tracking-wider text-[#f3b8c4]/65 uppercase sm:gap-1.5 sm:text-[0.62rem]">
                      <Images className="size-3 text-[#e85a7a]" aria-hidden />
                      ประวัติปก ({history.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {history.map((item, index) => {
                        const selected = activeCover === item.url;
                        return (
                          <button
                            key={`${item.url}-${item.capturedAt}`}
                            type="button"
                            onClick={() => setActiveCover(item.url)}
                            className={cn(
                              "relative h-9 w-14 shrink-0 overflow-hidden rounded-lg border transition sm:h-11 sm:w-16 sm:rounded-xl",
                              selected
                                ? "border-[#e85a7a] ring-2 ring-[#e85a7a]/50"
                                : "border-[#f3b8c4]/20 hover:border-[#e85a7a]/40"
                            )}
                            title={`ปก #${history.length - index}`}
                          >
                            <ProtectedImage
                              src={item.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {isGhostNewLiveRound(slot, onSelectSlot) ? (
                <div className="hidden md:block">
                  <NewLiveRoundCta
                    link={slot.rescheduleLink!}
                    onSelectSlot={onSelectSlot!}
                  />
                </div>
              ) : slot.url && !cancelled ? (
                <div className="hidden md:block">
                  <WatchLink slot={slot} external={external} />
                </div>
              ) : null}
            </div>

            {/* 📝 Right Column: Details & Schedule (md:col-span-7) */}
            <div className="flex flex-col justify-between gap-2.5 p-3 sm:gap-5 sm:p-6 md:col-span-7">
              <div className="space-y-2.5 sm:space-y-4">
                {/* Header & Titles (No line-clamp, full width & wrap) */}
                <DialogHeader className="gap-0.5 pr-7 text-left sm:gap-1.5 sm:pr-8">
                  <DialogTitle
                    className="font-[family-name:var(--font-display)] text-base font-normal leading-snug break-words text-[#fff5f7] sm:text-lg md:text-xl"
                  >
                    {displayTitle}
                  </DialogTitle>
                  {slot.titleLocal ? (
                    <DialogDescription
                      className="text-[0.7rem] leading-snug break-words text-[#f3b8c4]/75 sm:text-xs sm:leading-relaxed md:text-sm"
                    >
                      {slot.title}
                    </DialogDescription>
                  ) : (
                    <DialogDescription className="sr-only">
                      รายละเอียดไลฟ์ {slot.title}
                    </DialogDescription>
                  )}
                </DialogHeader>

                {/* 🏷️ Meta Badges */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  <MetaPill className="border-[#f3b8c4]/30 bg-[#f3b8c4]/10 text-xs font-medium text-[#f7d7de]">
                    <CalendarDays
                      className="size-3.5 shrink-0 text-[#e85a7a]"
                      aria-hidden
                    />
                    {formatThaiDate(slot.date)}
                  </MetaPill>
                  {platform && !slot.isPreview ? (
                    <MetaPill className="border-red-500/40 bg-red-500/15 text-xs font-semibold text-red-200 uppercase">
                      {platform}
                    </MetaPill>
                  ) : null}
                  {slot.isPreview ? (
                    <MetaPill className="border-emerald-500/40 bg-emerald-500/15 text-xs font-semibold text-emerald-200 uppercase">
                      ตัวอย่าง
                    </MetaPill>
                  ) : null}
                  {own ? (
                    <MetaPill className="border-[#e85a7a]/50 bg-[#e85a7a]/15 text-xs font-semibold text-[#f3b8c4] uppercase">
                      Mild-R
                    </MetaPill>
                  ) : null}
                  {!own && slot.sourceTitle ? (
                    <MetaPill className="border-sky-500/40 bg-sky-500/15 text-xs text-sky-200">
                      {slot.sourceTitle}
                    </MetaPill>
                  ) : null}
                  {slot.isMember ? (
                    <MetaPill className="border-[#9b8cff]/60 bg-[#9b8cff]/20 text-xs font-semibold text-[#dcd6ff] uppercase">
                      Member
                    </MetaPill>
                  ) : null}
                  {collab ? (
                    <MetaPill className="border-[#d4a574]/60 bg-[#d4a574]/20 text-xs font-semibold text-[#f0d3b6] uppercase">
                      Collab
                    </MetaPill>
                  ) : null}
                </div>

                {/* ⏰ Schedule Timing Grid */}
                {hasScheduleBlock ? (
                  <div className="overflow-hidden rounded-xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1c0c14]/80 to-[#14080e]/90 shadow-md sm:rounded-2xl">
                    <div className="border-b border-[#f3b8c4]/12 px-2.5 py-1 sm:px-3.5 sm:py-2">
                      <p className="text-[0.58rem] font-semibold tracking-wider text-[#e85a7a] uppercase sm:text-[0.62rem]">
                        ตารางเวลาสตรีม
                      </p>
                    </div>

                    <TimeCell
                      label="Scheduled"
                      icon={<Clock className="size-3.5" />}
                    >
                      {scheduledDisplay || slot.scheduledPrevious ? (
                        <LiveSlotTime
                          time={scheduledDisplay ?? slot.time}
                          timePrevious={slot.scheduledPrevious}
                          timeUpdated={slot.scheduledUpdated}
                          accentClassName="text-[#fff5f7]"
                        />
                      ) : (
                        <span className="text-[#f3b8c4]/45">—</span>
                      )}
                    </TimeCell>

                    <div className="grid grid-cols-2 border-t border-[#f3b8c4]/10">
                      <div className="border-r border-[#f3b8c4]/10">
                        <TimeCell
                          label="Start Live"
                          icon={<Radio className="size-3.5" />}
                          accent={slot.status === "live"}
                        >
                          {startValue}
                        </TimeCell>
                      </div>
                      <TimeCell
                        label="End Live"
                        icon={<Clock className="size-3.5" />}
                      >
                        {endValue}
                      </TimeCell>
                    </div>

                    <div className="border-t border-[#f3b8c4]/10">
                      <TimeCell
                        label="เวลาไลฟ์"
                        icon={<Timer className="size-3.5" />}
                      >
                        {slot.durationLabel ?? (
                          <span className="text-[#f3b8c4]/45">—</span>
                        )}
                      </TimeCell>
                    </div>
                  </div>
                ) : null}
              </div>

              {isGhostNewLiveRound(slot, onSelectSlot) ? (
                <div className="block md:hidden">
                  <NewLiveRoundCta
                    link={slot.rescheduleLink!}
                    onSelectSlot={onSelectSlot!}
                  />
                </div>
              ) : slot.url && !cancelled ? (
                <div className="block md:hidden">
                  <WatchLink slot={slot} external={external} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
