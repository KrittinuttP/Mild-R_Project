"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EventDetailModal } from "@/components/events/EventDetailModal";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import {
  eventStatusLabel,
  formatThaiDate,
  pastEvents,
  upcomingEvents,
} from "@/lib/events";
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
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full flex-col overflow-hidden border border-[#f3b8c4]/15 bg-[#1a0d12]/50 text-left transition",
        "hover:border-[#e85a7a]/40 hover:bg-[#e85a7a]/05"
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#10070b]">
        <ProtectedImage
          src={event.cover}
          alt={event.coverAlt ?? event.title}
          wrapClassName="absolute inset-0 block"
          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0e0609]/90 to-transparent" />
        <span
          className={cn(
            "absolute top-3 left-3 border px-2 py-0.5 text-[0.58rem] tracking-[0.16em] uppercase backdrop-blur-sm",
            event.status === "ended"
              ? "border-[#f3b8c4]/30 bg-[#140a0d]/70 text-[#f3b8c4]/80"
              : "border-[#e85a7a]/45 bg-[#140a0d]/70 text-[#e85a7a]"
          )}
        >
          {eventStatusLabel(event.status)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs tabular-nums text-[#f3b8c4]/70">
          {formatThaiDate(event.date)}
          {event.endDate ? ` – ${formatThaiDate(event.endDate)}` : null}
          {event.timeLabel ? ` · ${event.timeLabel}` : null}
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[#fff5f7] sm:text-2xl">
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
        <p className="mt-3 text-xs text-[#f3b8c4]/55">
          {[event.venue, event.platform].filter(Boolean).join(" · ")}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm text-[#e85a7a]">
          ดูรายละเอียด
        </span>
      </div>
    </button>
  );
}

export function EventsPageClient({ board }: EventsPageClientProps) {
  const list = useMemo(() => {
    const upcoming = upcomingEvents(board);
    const past = pastEvents(board);
    return [...upcoming, ...past];
  }, [board]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = list.find((event) => event.id === activeId) ?? null;

  return (
    <div className="space-y-10 sm:space-y-12">
      {list.length > 0 ? (
        <div className="mx-auto grid max-w-xl gap-5 sm:max-w-none sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {list.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onOpen={() => setActiveId(event.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#f3b8c4]/65">ยังไม่มีอีเวนต์</p>
      )}

      <Link
        href="/#events"
        className="inline-flex items-center gap-2 text-sm text-[#f3b8c4]/75 transition hover:text-[#fff5f7]"
      >
        <ArrowLeft className="size-4" />
        กลับหน้าแรก
      </Link>

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
