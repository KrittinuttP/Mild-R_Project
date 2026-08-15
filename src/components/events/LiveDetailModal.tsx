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
  if (status === "ended") return "จบแล้ว";
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
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[0.65rem] leading-none tracking-[0.12em]",
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
      <p className="flex items-center gap-1.5 text-[0.62rem] tracking-[0.14em] text-[#f3b8c4]/60 uppercase">
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
        className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-md overflow-hidden rounded-2xl border-[#e85a7a]/25 bg-[#140a0d] p-0 text-[#fff5f7] shadow-[0_0_0_1px_rgba(232,90,122,0.08),0_24px_64px_rgba(8,2,4,0.65)] sm:max-w-md"
        showCloseButton
      >
        {slot ? (
          <div className="relative max-h-[92dvh] overflow-y-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#e85a7a]/80 to-transparent" />

            <div className="relative aspect-video overflow-hidden bg-[#10070b]">
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

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d] via-[#140a0d]/45 to-transparent" />

              <div className="absolute inset-x-0 top-0 p-3 pr-12 sm:p-3.5 sm:pr-12">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[0.58rem] tracking-[0.16em] uppercase backdrop-blur-sm",
                    cancelled
                      ? "border-[#8a7f88]/50 bg-[#140a0d]/75 text-[#d8d0d4]"
                      : slot.status === "live"
                        ? "border-[#e85a7a]/55 bg-[#140a0d]/75 text-[#e85a7a]"
                        : "border-[#f3b8c4]/30 bg-[#140a0d]/75 text-[#f3b8c4]"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      cancelled
                        ? "bg-[#8a7f88]"
                        : slot.status === "live"
                          ? "animate-pulse bg-[#e85a7a]"
                          : "bg-[#f3b8c4]/70"
                    )}
                  />
                  {statusText ?? "Live"}
                </span>
              </div>
            </div>

            <div className="relative space-y-4 px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
              <DialogHeader className="gap-1.5 pr-6 text-left">
                <DialogTitle
                  className="line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] leading-snug font-bold tracking-tight break-words text-[#fff5f7] sm:text-xl"
                  title={displayTitle}
                >
                  {displayTitle}
                </DialogTitle>
                {slot.titleLocal ? (
                  <DialogDescription
                    className="line-clamp-2 text-sm break-words text-[#f3b8c4]/70"
                    title={slot.title}
                  >
                    {slot.title}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">
                    รายละเอียดไลฟ์ {slot.title}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-1.5">
                <MetaPill className="normal-case tracking-normal border-[#f3b8c4]/30 bg-[#f3b8c4]/08 text-[#f7d7de]">
                  <CalendarDays
                    className="size-3.5 shrink-0 text-[#e85a7a]"
                    aria-hidden
                  />
                  {formatThaiDate(slot.date)}
                </MetaPill>
                {platform && !slot.isPreview ? (
                  <MetaPill className="border-[#ff6b7a]/45 bg-[#ff4d5e]/12 text-[#ffb3bc] uppercase">
                    {platform}
                  </MetaPill>
                ) : null}
                {slot.isPreview ? (
                  <MetaPill className="border-[#a8e6d4]/45 bg-[#a8e6d4]/10 text-[#a8e6d4] uppercase">
                    ตัวอย่าง
                  </MetaPill>
                ) : null}
                {own ? (
                  <MetaPill className="border-[#e85a7a]/50 bg-[#e85a7a]/15 text-[#f3b8c4] uppercase">
                    Mild-R
                  </MetaPill>
                ) : null}
                {!own && slot.sourceTitle ? (
                  <MetaPill className="normal-case tracking-[0.08em] border-[#7eb6d4]/50 bg-[#7eb6d4]/14 text-[#b8d9ec]">
                    ไปช่อง {slot.sourceTitle}
                  </MetaPill>
                ) : null}
                {slot.isMember ? (
                  <MetaPill className="border-[#9b8cff]/55 bg-[#9b8cff]/14 text-[#cfc6ff] uppercase">
                    Member
                  </MetaPill>
                ) : null}
                {collab ? (
                  <MetaPill className="border-[#d4a574]/55 bg-[#d4a574]/14 text-[#e8c49a] uppercase">
                    Collab
                  </MetaPill>
                ) : null}
              </div>

              {hasScheduleBlock ? (
                <div className="overflow-hidden rounded-xl border border-[#f3b8c4]/15 bg-[#1a0d12]/55">
                  <div className="border-b border-[#f3b8c4]/12 px-3 py-2 sm:px-3.5">
                    <p className="text-[0.62rem] tracking-[0.18em] text-[#f3b8c4]/55 uppercase">
                      ตารางเวลา
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

              {history.length > 1 ? (
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-1.5 text-[0.62rem] tracking-[0.16em] text-[#f3b8c4]/55 uppercase">
                    <Images className="size-3.5" aria-hidden />
                    ประวัติปก ({history.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {history.map((item, index) => {
                      const selected = activeCover === item.url;
                      return (
                        <button
                          key={`${item.url}-${item.capturedAt}`}
                          type="button"
                          onClick={() => setActiveCover(item.url)}
                          className={cn(
                            "relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border transition",
                            selected
                              ? "border-[#e85a7a] ring-1 ring-[#e85a7a]/45"
                              : "border-[#f3b8c4]/18 hover:border-[#e85a7a]/35"
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

              {slot.url && !cancelled ? (
                <Link
                  href={slot.url}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group relative w-full overflow-hidden rounded-xl border-transparent bg-[#e85a7a] text-white shadow-[0_0_24px_rgba(232,90,122,0.2)] transition hover:bg-[#f06b88]"
                  )}
                >
                  <Play className="size-4 fill-current" aria-hidden />
                  ไปดูไลฟ์
                  {external ? (
                    <ExternalLink className="size-4 opacity-80" />
                  ) : null}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
