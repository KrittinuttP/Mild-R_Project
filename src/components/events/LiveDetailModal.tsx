"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Images,
  Play,
  Radio,
  Timer,
} from "lucide-react";

import {
  LiveSlotTime,
} from "@/components/events/LiveSlotMeta";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatThaiDate } from "@/lib/events";
import { CTA_PRIMARY_CLASS, MODAL_CLOSE_BUTTON_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import {
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
} from "@/lib/youtube";
import type { LivePlatform, LiveSlot } from "@/types/vtuber";

type LiveDetailModalProps = {
  slot: LiveSlot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  if (status === "ended") return "จบไลฟ์แล้ว";
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
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs leading-none tracking-wide",
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
        "min-w-0 px-3 py-2.5 sm:px-3.5",
        accent && "bg-[#e85a7a]/06"
      )}
    >
      <p className="flex items-center gap-1.5 text-xs tracking-[0.14em] text-[#f3b8c4]/60 uppercase">
        <span className="opacity-80" aria-hidden>
          {icon}
        </span>
        {label}
      </p>
      <div className="mt-1 font-[family-name:var(--font-display)] text-sm tabular-nums text-[#fff5f7] sm:text-[0.95rem]">
        {children}
      </div>
    </div>
  );
}

export function LiveDetailModal({
  slot,
  open,
  onOpenChange,
}: LiveDetailModalProps) {
  const external = Boolean(slot?.url?.startsWith("http"));
  const own = Boolean(slot?.isOwnChannel);
  const collab = slot?.kind === "collab";
  const cancelled = slot?.status === "cancelled";
  const platform = platformLabel(slot?.platform);
  const videoId = getYoutubeVideoId(slot?.url);
  const fallbackThumb = videoId ? getYoutubeThumbnailUrl(videoId) : null;
  const coverCandidates = [
    slot?.coverUrl,
    ...(slot?.coverHistory?.map((h) => h.url) ?? []),
    fallbackThumb,
  ].filter((u): u is string => Boolean(u));
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
      {cancelled ? "ไม่ได้เริ่ม (ยกเลิก)" : "ยังไม่เริ่ม"}
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
          <div className="relative max-h-[92dvh] overflow-y-auto md:grid md:grid-cols-12 md:overflow-visible">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#e85a7a]/80 to-transparent" />

            {/* 🖼️ Left Column: Media & Primary Action (md:col-span-5) */}
            <div className="flex flex-col justify-between gap-4 border-b border-[#f3b8c4]/12 bg-[#10070b]/70 p-4 sm:p-5 md:col-span-5 md:border-b-0 md:border-r">
              <div className="space-y-3.5">
                {/* Main Thumbnail Container */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#12070c] shadow-md">
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
                    <div
                      className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(232,90,122,0.28),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(243,184,196,0.12),transparent_50%),linear-gradient(160deg,#1c0d12,#10070b)]"
                      aria-hidden
                    />
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
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium tracking-wider text-[#f3b8c4]/65 uppercase">
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
                              "relative h-11 w-16 shrink-0 overflow-hidden rounded-xl border transition",
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

              {/* 🎬 Desktop Watch Live Button */}
              {slot.url && !cancelled ? (
                <div className="hidden md:block">
                  <Link
                    href={slot.url}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      CTA_PRIMARY_CLASS,
                      "group flex w-full items-center justify-center gap-2 font-semibold"
                    )}
                  >
                    <Play className="size-4 fill-current" aria-hidden />
                    <span>ไปดูไลฟ์</span>
                    {external ? (
                      <ExternalLink className="size-3.5 opacity-75" />
                    ) : null}
                  </Link>
                </div>
              ) : null}
            </div>

            {/* 📝 Right Column: Details & Schedule (md:col-span-7) */}
            <div className="flex flex-col justify-between gap-5 p-5 sm:p-6 md:col-span-7">
              <div className="space-y-4">
                {/* Header & Titles (No line-clamp, full width & wrap) */}
                <DialogHeader className="gap-1.5 pr-8 text-left">
                  <DialogTitle
                    className="font-[family-name:var(--font-display)] text-lg font-normal leading-snug break-words text-[#fff5f7] sm:text-xl"
                  >
                    {displayTitle}
                  </DialogTitle>
                  {slot.titleLocal ? (
                    <DialogDescription
                      className="text-xs leading-relaxed break-words text-[#f3b8c4]/75 sm:text-sm"
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
                <div className="flex flex-wrap items-center gap-1.5">
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
                  <div className="overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1c0c14]/80 to-[#14080e]/90 shadow-md">
                    <div className="border-b border-[#f3b8c4]/12 px-3.5 py-2">
                      <p className="text-[0.62rem] font-semibold tracking-wider text-[#e85a7a] uppercase">
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

              {/* 🎬 Mobile Watch Live Button */}
              {slot.url && !cancelled ? (
                <div className="block pt-2 md:hidden">
                  <Link
                    href={slot.url}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      CTA_PRIMARY_CLASS,
                      "group flex w-full items-center justify-center gap-2 font-semibold"
                    )}
                  >
                    <Play className="size-4 fill-current" aria-hidden />
                    <span>ไปดูไลฟ์</span>
                    {external ? (
                      <ExternalLink className="size-3.5 opacity-75" />
                    ) : null}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
