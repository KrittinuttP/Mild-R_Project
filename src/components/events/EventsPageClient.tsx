"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { EventDetailModal } from "@/components/events/EventDetailModal";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import {
  eventStatusLabel,
  formatThaiDate,
  pastEvents,
  upcomingEvents,
} from "@/lib/events";
import {
  BADGE_ACCENT_CLASS,
  BADGE_SOFT_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { CalendarEvent, EventsBoard } from "@/types/vtuber";

type EventsPageClientProps = {
  board: EventsBoard;
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

function EventSection({
  title,
  events,
  onOpen,
}: {
  title: string;
  events: CalendarEvent[];
  onOpen: (id: string) => void;
}) {
  if (events.length === 0) return null;

  return (
    <section>
      <h2 className={DISPLAY_H2_CLASS}>{title}</h2>
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onOpen={() => onOpen(event.id)}
          />
        ))}
      </ul>
    </section>
  );
}

export function EventsPageClient({ board }: EventsPageClientProps) {
  const upcoming = useMemo(() => upcomingEvents(board), [board]);
  const past = useMemo(() => pastEvents(board), [board]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active =
    [...upcoming, ...past].find((event) => event.id === activeId) ?? null;

  if (upcoming.length === 0 && past.length === 0) {
    return <p className="text-sm text-[#f3b8c4]/65">ยังไม่มีอีเวนต์</p>;
  }

  return (
    <div className="space-y-14 sm:space-y-16">
      <EventSection title="กำลังมา" events={upcoming} onOpen={setActiveId} />
      <EventSection title="ที่ผ่านมา" events={past} onOpen={setActiveId} />

      <EventDetailModal
        event={active}
        open={activeId !== null}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      />
    </div>
  );
}
