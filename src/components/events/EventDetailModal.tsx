"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { eventStatusLabel, formatThaiDate } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/vtuber";

type EventDetailModalProps = {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EventDetailModal({
  event,
  open,
  onOpenChange,
}: EventDetailModalProps) {
  const external = Boolean(event?.url?.startsWith("http"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-lg overflow-hidden rounded-2xl border-[#f3b8c4]/25 bg-[#140a0d] p-0 text-[#fff5f7] sm:max-w-lg"
        showCloseButton
      >
        {event ? (
          <div className="max-h-[92dvh] overflow-y-auto">
            <div className="relative aspect-[16/10] overflow-hidden bg-[#10070b]">
              <ProtectedImage
                src={event.cover}
                alt={event.coverAlt ?? event.title}
                wrapClassName="absolute inset-0 block"
                className="h-full w-full object-cover object-top"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#140a0d] to-transparent" />
              <span
                className={cn(
                  "absolute top-3 left-3 rounded-lg border px-2 py-0.5 text-[0.58rem] tracking-[0.16em] uppercase backdrop-blur-sm",
                  event.status === "ended"
                    ? "border-[#f3b8c4]/30 bg-[#140a0d]/75 text-[#f3b8c4]/80"
                    : "border-[#e85a7a]/45 bg-[#140a0d]/75 text-[#e85a7a]"
                )}
              >
                {eventStatusLabel(event.status)}
              </span>
            </div>

            <div className="space-y-4 px-5 pt-1 pb-5 sm:px-6 sm:pb-6">
              <DialogHeader className="gap-2 pr-8 text-left">
                <DialogTitle className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[#fff5f7]">
                  {event.titleLocal ?? event.title}
                </DialogTitle>
                {event.titleLocal ? (
                  <DialogDescription className="text-sm text-[#f3b8c4]/70">
                    {event.title}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">
                    รายละเอียดอีเวนต์ {event.title}
                  </DialogDescription>
                )}
              </DialogHeader>

              <p className="text-sm tabular-nums text-[#f3b8c4]/75">
                {formatThaiDate(event.date)}
                {event.endDate ? ` – ${formatThaiDate(event.endDate)}` : null}
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

              {event.url ? (
                <Link
                  href={event.url}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-2 w-full rounded-xl border-transparent bg-[#e85a7a] text-white hover:bg-[#f06b88]"
                  )}
                >
                  ไปยังลิงก์อีเวนต์
                  {external ? <ExternalLink className="size-4" /> : null}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
