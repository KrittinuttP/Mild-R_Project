"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Images, PlayCircle } from "lucide-react";

import { CoverImage } from "@/components/cards/CoverCard";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EventTags } from "@/components/events/EventTags";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { eventVideosLabel, formatEventDateRange } from "@/lib/events";
import { MODAL_CLOSE_BUTTON_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/vtuber";

type EventDetailModalProps = {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Quick summary; the full write-up lives on /events/[id]. */
export function EventDetailModal({
  event,
  open,
  onOpenChange,
}: EventDetailModalProps) {
  const external = Boolean(event?.url?.startsWith("http"));
  const imageCount = event
    ? (event.galleryCount ?? 0) || (event.images?.length ?? 0)
    : 0;
  const liveCount = event?.lives?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-lg overflow-hidden rounded-2xl border-[#f3b8c4]/25 bg-[#140a0d] p-0 text-[#fff5f7] sm:max-w-lg"
        showCloseButton
        closeButtonClassName={MODAL_CLOSE_BUTTON_CLASS}
      >
        {event ? (
          <div className="max-h-[92dvh] overflow-y-auto">
            <CoverImage
              src={event.cover}
              alt={event.coverAlt ?? event.title}
              media="square-contain"
              className="aspect-[4/3]"
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#140a0d] to-transparent" />
              <EventStatusBadge event={event} className="absolute top-3 left-3" />
            </CoverImage>

            <div className="space-y-4 px-5 pt-1 pb-5 sm:px-6 sm:pb-6">
              <div className="flex items-start gap-3">
                <DialogHeader className="min-w-0 flex-1 gap-2 text-left">
                  <DialogTitle className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-normal text-[#fff5f7]">
                    {event.titleLocal ?? event.title}
                  </DialogTitle>
                  {event.titleLocal ? (
                    <DialogDescription className="text-sm text-[#f3b8c4]/70">
                      {event.title}
                    </DialogDescription>
                  ) : (
                    <DialogDescription className="sr-only">
                      สรุปอีเวนต์ {event.title}
                    </DialogDescription>
                  )}
                </DialogHeader>
                {event.url ? (
                  <Link
                    href={event.url}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    aria-label="ประกาศต้นทาง"
                    title="ประกาศต้นทาง"
                    className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#f3b8c4]/25 text-[#f3b8c4] transition hover:border-[#e85a7a]/60 hover:bg-[#e85a7a]/15 hover:text-white"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </Link>
                ) : null}
              </div>

              <EventTags event={event} />

              <p className="text-sm tabular-nums text-[#f3b8c4]/75">
                {formatEventDateRange(event)}
                {event.timeLabel ? ` · ${event.timeLabel}` : null}
              </p>

              {(event.venue || event.platform) && (
                <p className="text-sm text-[#f7d7de]/80">
                  {[event.venue, event.platform].filter(Boolean).join(" · ")}
                </p>
              )}

              {event.summary ? (
                <p className="text-sm leading-relaxed text-[#f7d7de]/90 sm:text-base">
                  {event.summary}
                </p>
              ) : null}

              {imageCount > 0 || liveCount > 0 ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#f3b8c4]/65">
                  {liveCount > 0 ? (
                    <p className="inline-flex items-center gap-1.5">
                      <PlayCircle className="size-3.5" aria-hidden />
                      มี{eventVideosLabel(event.lives ?? [])} {liveCount} รายการ
                    </p>
                  ) : null}
                  {imageCount > 0 ? (
                    <p className="inline-flex items-center gap-1.5">
                      <Images className="size-3.5" aria-hidden />
                      มีภาพ {imageCount} ภาพ
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Link
                href={`/events/${event.id}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-1 w-full rounded-xl border-transparent bg-[#e85a7a] text-white hover:bg-[#f06b88]"
                )}
              >
                ดูรายละเอียด
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
