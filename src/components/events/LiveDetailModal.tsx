"use client";

import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, Play } from "lucide-react";

import { CollabBadge } from "@/components/events/CollabBadge";
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

export function LiveDetailModal({
  slot,
  open,
  onOpenChange,
}: LiveDetailModalProps) {
  const external = Boolean(slot?.url?.startsWith("http"));
  const collab = slot?.kind === "collab";
  const platform = platformLabel(slot?.platform);
  const videoId = getYoutubeVideoId(slot?.url);
  const thumbnail = videoId ? getYoutubeThumbnailUrl(videoId) : null;
  const displayTitle = slot?.titleLocal ?? slot?.title ?? "";

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
              {thumbnail ? (
                <ProtectedImage
                  src={thumbnail}
                  alt={displayTitle}
                  wrapClassName="absolute inset-0 block"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(232,90,122,0.28),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(243,184,196,0.12),transparent_50%),linear-gradient(160deg,#1c0d12,#10070b)]"
                  aria-hidden
                />
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d] via-[#140a0d]/45 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,90,122,0.18),transparent_45%)]" />

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pr-12 sm:p-3.5 sm:pr-12">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[0.58rem] tracking-[0.16em] uppercase backdrop-blur-sm",
                    collab
                      ? "border-[#d4a574]/45 bg-[#140a0d]/75 text-[#e8c49a]"
                      : "border-[#e85a7a]/45 bg-[#140a0d]/75 text-[#e85a7a]"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      collab ? "bg-[#d4a574]" : "animate-pulse bg-[#e85a7a]"
                    )}
                  />
                  Live
                </span>
                {collab ? <CollabBadge /> : null}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border bg-[#140a0d]/80 px-2.5 py-1 font-[family-name:var(--font-display)] text-sm tabular-nums tracking-wide backdrop-blur-sm",
                    collab
                      ? "border-[#d4a574]/40 text-[#e8c49a]"
                      : "border-[#e85a7a]/40 text-[#fff5f7]"
                  )}
                >
                  <Clock className="size-3.5 opacity-80" aria-hidden />
                  {slot.time}
                </span>
              </div>
            </div>

            <div className="relative space-y-5 px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
              <div className="pointer-events-none absolute -top-10 right-0 size-36 bg-[radial-gradient(circle,rgba(232,90,122,0.14),transparent_65%)]" />

              <DialogHeader className="gap-2.5 pr-6 text-left">
                <DialogTitle className="font-[family-name:var(--font-display)] text-[1.45rem] leading-snug font-bold tracking-tight text-[#fff5f7] sm:text-2xl">
                  {displayTitle}
                </DialogTitle>
                {slot.titleLocal ? (
                  <DialogDescription className="text-sm text-[#f3b8c4]/70">
                    {slot.title}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">
                    รายละเอียดไลฟ์ {slot.title}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#f3b8c4]/18 bg-[#1a0d12]/70 px-2.5 py-1.5 text-xs text-[#f7d7de]/90">
                  <CalendarDays
                    className="size-3.5 text-[#e85a7a]/90"
                    aria-hidden
                  />
                  {formatThaiDate(slot.date)}
                </span>
                {platform ? (
                  <span className="inline-flex items-center rounded-lg border border-[#f3b8c4]/18 bg-[#1a0d12]/70 px-2.5 py-1.5 text-[0.65rem] tracking-[0.16em] text-[#f3b8c4]/75 uppercase">
                    {platform}
                  </span>
                ) : null}
                {!collab ? (
                  <span className="inline-flex items-center rounded-lg border border-[#e85a7a]/25 bg-[#e85a7a]/10 px-2.5 py-1.5 text-[0.65rem] tracking-[0.16em] text-[#e85a7a] uppercase">
                    Solo
                  </span>
                ) : null}
              </div>

              {slot.note ? (
                <p
                  className={cn(
                    "border-l-2 pl-3 text-sm leading-relaxed",
                    slot.note.startsWith("ช่อง ")
                      ? "border-[#d4a574]/55 text-[#e8c49a]"
                      : "border-[#e85a7a]/40 text-[#f7d7de]/80"
                  )}
                >
                  {slot.note}
                </p>
              ) : null}

              {slot.url ? (
                <Link
                  href={slot.url}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group relative mt-1 w-full overflow-hidden rounded-xl border-transparent bg-[#e85a7a] text-white shadow-[0_0_28px_rgba(232,90,122,0.22)] transition hover:bg-[#f06b88] hover:shadow-[0_0_36px_rgba(232,90,122,0.32)]"
                  )}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition group-hover:opacity-100" />
                  <Play className="size-4 fill-current" aria-hidden />
                  ไปดูไลฟ์
                  {external ? <ExternalLink className="size-4 opacity-80" /> : null}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
