"use client";

import { useState } from "react";
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
  findDefaultWeekIndex,
  formatThaiDate,
  sortLiveWeeks,
  upcomingEvents,
} from "@/lib/events";
import {
  BADGE_ACCENT_CLASS,
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { CalendarEvent, LiveWeek, VtuberProfile } from "@/types/vtuber";

type EventsTeaserProps = {
  data: VtuberProfile;
};

function EventRow({
  event,
  onOpen,
}: {
  event: CalendarEvent;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-start gap-4 rounded-3xl border border-[#f3b8c4]/12 bg-[#1a0c12]/60 p-4 text-left transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12] sm:gap-5 sm:p-5"
      >
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#10070b] sm:size-24">
          <ProtectedImage
            src={event.cover}
            alt={event.coverAlt ?? event.title}
            wrapClassName="absolute inset-0 block"
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(BADGE_ACCENT_CLASS, "uppercase")}>
              {eventStatusLabel(event.status)}
            </span>
            <span className="text-xs tabular-nums text-[#f3b8c4]/70 sm:text-sm">
              {formatThaiDate(event.date)}
              {event.endDate ? ` – ${formatThaiDate(event.endDate)}` : null}
            </span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[#fff5f7] sm:text-xl">
            {event.titleLocal ?? event.title}
          </p>
          {event.titleLocal ? (
            <p className="mt-0.5 text-sm text-[#f3b8c4]/65">{event.title}</p>
          ) : null}
          {event.summary ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#f7d7de]/75">
              {event.summary}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[#f3b8c4]/55 sm:text-sm">
            {[event.timeLabel, event.venue ?? event.platform]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <span className="mt-2 inline-block text-sm text-[#e85a7a]">
            ดูรายละเอียด
          </span>
        </div>
        <ArrowUpRight className="size-4 shrink-0 opacity-45 transition group-hover:opacity-100" />
      </button>
    </li>
  );
}

function buildTeaserWeeks(weeks: LiveWeek[]): LiveWeek[] {
  if (weeks.length === 0) return [];
  const defaultIndex = findDefaultWeekIndex(weeks);
  return [
    weeks[defaultIndex - 1],
    weeks[defaultIndex],
    weeks[defaultIndex + 1],
  ].filter((week): week is LiveWeek => Boolean(week));
}

export function EventsTeaser({ data }: EventsTeaserProps) {
  const board = data.events;
  const upcoming = upcomingEvents(board, 3);
  const { weeks: liveWeeks, status, error, retry } = useLiveSchedule();
  const weeks = sortLiveWeeks(liveWeeks);
  const teaserWeeks = buildTeaserWeeks(weeks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = upcoming.find((event) => event.id === activeId) ?? null;

  const showEvents = upcoming.length > 0;
  const showLive =
    status === "loading" || status === "error" || weeks.length > 0;

  if (!showEvents && !showLive && status === "ready") return null;

  return (
    <>
      {upcoming.length > 0 ? (
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
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                อีเวนต์
              </h2>
              <p className="mt-4 max-w-xl text-sm text-[#f7d7de]/85 sm:text-base">
                กิจกรรมพิเศษ คาเฟ่ และอีเวนต์อื่นๆ ที่กำลังมา
              </p>
            </ScrollReveal>

            <ScrollReveal className="mt-8 sm:mt-10">
              <ul className="space-y-3 sm:space-y-4">
                {upcoming.map((event) => (
                  <EventRow
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
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                ตารางไลฟ์
              </h2>
              <p className="mt-4 max-w-xl text-sm text-[#f7d7de]/85 sm:text-base">
                สรุปไลฟ์สัปดาห์นี้ — ย้อนตารางเก่าได้ที่หน้าตารางเต็ม
              </p>
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
