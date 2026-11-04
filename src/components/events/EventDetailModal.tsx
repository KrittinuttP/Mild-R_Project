"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Images, PlayCircle } from "lucide-react";

import { CoverImage } from "@/components/cards/CoverCard";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EventTags } from "@/components/events/EventTags";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { eventVideosLabel, formatEventDateRange } from "@/lib/events";
import { MODAL_CLOSE_BUTTON_CLASS, R_CTA_PRIMARY_CLASS } from "@/lib/site-ui";
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
        className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-lg overflow-hidden rounded-3xl border border-r-text-2/20 bg-r-bg bg-[linear-gradient(160deg,rgba(242,67,125,0.08),transparent_45%),linear-gradient(340deg,rgba(34,214,191,0.08),transparent_45%)] p-0 text-r-text shadow-[0_24px_60px_rgba(0,0,0,0.7)] sm:max-w-lg"
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-r-bg to-transparent" />
              <EventStatusBadge event={event} className="absolute top-3 left-3" />
            </CoverImage>

            <div className="space-y-4 px-5 pt-1 pb-5 sm:px-6 sm:pb-6">
              <div className="flex items-start gap-3">
                <DialogHeader className="min-w-0 flex-1 gap-2 text-left">
                  <DialogTitle className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-normal text-r-text">
                    {event.titleLocal ?? event.title}
                  </DialogTitle>
                  {event.titleLocal ? (
                    <DialogDescription className="text-sm text-r-text-3">
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
                    className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-r-text-2 ring-1 ring-r-text-2/30 ring-inset transition-colors hover:bg-r-pri/10 hover:text-r-text hover:ring-r-pri/60 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </Link>
                ) : null}
              </div>

              <EventTags event={event} />

              <p className="text-sm tabular-nums text-r-text-2">
                {formatEventDateRange(event)}
                {event.timeLabel ? ` · ${event.timeLabel}` : null}
              </p>

              {(event.venue || event.platform) && (
                <p className="text-sm text-r-text-2">
                  {[event.venue, event.platform].filter(Boolean).join(" · ")}
                </p>
              )}

              {event.summary ? (
                <p className="text-sm leading-relaxed text-r-text-2 sm:text-base">
                  {event.summary}
                </p>
              ) : null}

              {imageCount > 0 || liveCount > 0 ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-r-text-3">
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
                className={cn(R_CTA_PRIMARY_CLASS, "mt-1 w-full")}
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
