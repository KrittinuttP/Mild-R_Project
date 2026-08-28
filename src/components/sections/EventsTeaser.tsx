"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Radio } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import {
  LiveScheduleError,
  LiveScheduleSkeleton,
} from "@/components/events/LiveScheduleSkeleton";
import { LiveWeekTable } from "@/components/events/LiveWeekTable";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import {
  eventStatusLabel,
  formatThaiDate,
  recentEvents,
  thisAndNextWeekRangeYmd,
} from "@/lib/events";
import {
  BADGE_ACCENT_CLASS,
  BADGE_SOFT_CLASS,
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { CalendarEvent, VtuberProfile } from "@/types/vtuber";

type EventsTeaserProps = {
  data: VtuberProfile;
};

function EventCard({
  event,
  onOpen,
}: {
  event: CalendarEvent;
  onOpen: () => void;
}) {
  const ended = event.status === "ended";
  const meta = [event.venue, event.platform].filter(Boolean).join(" · ");

  return (
    <li className="h-full">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-[#1a0c12]/60 text-left transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60",
          ended
            ? "border-[#f3b8c4]/10 opacity-90 hover:border-[#f3b8c4]/25 hover:bg-[#1a0c12] hover:opacity-100"
            : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
        )}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[#12080c]">
          <ProtectedImage
            src={event.cover}
            alt={event.coverAlt ?? event.title}
            wrapClassName="absolute inset-0 block"
            className={cn(
              "h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.04]",
              ended && "opacity-85"
            )}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a0c12] via-[#1a0c12]/40 to-transparent" />
          <span
            className={cn(
              ended ? BADGE_SOFT_CLASS : BADGE_ACCENT_CLASS,
              "absolute top-3 left-3 uppercase backdrop-blur-sm"
            )}
          >
            {eventStatusLabel(event.status)}
          </span>
        </div>

        <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-xs tabular-nums text-[#f3b8c4]/70 sm:text-sm">
            {formatThaiDate(event.date)}
            {event.endDate ? ` – ${formatThaiDate(event.endDate)}` : null}
            {event.timeLabel ? ` · ${event.timeLabel}` : null}
          </p>

          <h3 className={cn("mt-2 transition group-hover:text-white", DISPLAY_H3_CLASS)}>
            {event.titleLocal ?? event.title}
          </h3>
          {event.titleLocal ? (
            <p className="mt-1 text-sm text-[#f3b8c4]/65">{event.title}</p>
          ) : null}

          {event.summary ? (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#f7d7de]/80">
              {event.summary}
            </p>
          ) : null}

          {meta ? (
            <p className="mt-2 text-xs text-[#f3b8c4]/55">{meta}</p>
          ) : null}

          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm tracking-wide text-[#e85a7a] transition group-hover:gap-2.5">
            ดูรายละเอียด
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </button>
    </li>
  );
}

export function EventsTeaser({ data }: EventsTeaserProps) {
  const board = data.events;
  const events = recentEvents(board, 3);
  const teaserRange = useMemo(() => thisAndNextWeekRangeYmd(), []);
  const { weeks: teaserWeeks, status, error, retry } =
    useLiveSchedule(teaserRange);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = events.find((event) => event.id === activeId) ?? null;

  const showEvents = events.length > 0;
  const showLive =
    status === "loading" || status === "error" || teaserWeeks.length > 0;

  if (!showEvents && !showLive && status === "ready") return null;

  return (
    <>
      {events.length > 0 ? (
        <section
          id="events"
          className="relative scroll-mt-20 bg-[#12080c] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-24 lg:px-16"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.12),transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[#e85a7a]" aria-hidden />
                <p className={META_CLASS}>Events</p>
              </div>
              <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
                อีเวนต์
              </h2>
              <p className="mt-4 max-w-xl text-sm text-[#f7d7de]/85 sm:text-base">
                กิจกรรมและอีเวนต์ล่าสุด
              </p>
            </ScrollReveal>

            <ScrollReveal className="mt-8 sm:mt-10">
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onOpen={() => setActiveId(event.id)}
                  />
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal delay={0.08} className="mt-8 sm:mt-10">
              <Link
                href="/events"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  CTA_PRIMARY_CLASS
                )}
              >
                ดูอีเวนต์ทั้งหมด
                <ArrowUpRight className="size-4" />
              </Link>
            </ScrollReveal>
          </div>
        </section>
      ) : null}

      {showLive ? (
        <section
          id="live"
          className="relative scroll-mt-20 bg-[#140a0d] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-24 lg:px-16"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_80%_0%,rgba(232,90,122,0.12),transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-[#e85a7a]" aria-hidden />
                <p className={META_CLASS}>Live</p>
              </div>
              <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
                ตารางไลฟ์
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.06} className="mt-8 sm:mt-10">
              {status === "loading" ? (
                <LiveScheduleSkeleton variant="compact" />
              ) : status === "error" ? (
                <LiveScheduleError message={error} onRetry={retry} />
              ) : teaserWeeks.length > 0 ? (
                <div className="transition-opacity duration-500 ease-out">
                  <LiveWeekTable weeks={teaserWeeks} compact />
                </div>
              ) : (
                <p className="text-sm text-[#f3b8c4]/65">
                  ยังไม่มีตารางไลฟ์ในช่วงนี้
                </p>
              )}
            </ScrollReveal>

            <ScrollReveal delay={0.1} className="mt-8 sm:mt-10">
              <Link
                href="/live"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  CTA_OUTLINE_CLASS
                )}
              >
                ดูตารางไลฟ์ทั้งหมด
                <ArrowUpRight className="size-4" />
              </Link>
            </ScrollReveal>
          </div>
        </section>
      ) : null}

      <EventDetailModal
        event={active}
        open={activeId !== null}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      />
    </>
  );
}
