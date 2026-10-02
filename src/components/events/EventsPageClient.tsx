"use client";

import { useMemo, useState, type ReactNode } from "react";

import { EventCard } from "@/components/events/EventCard";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import {
  EVENT_CATEGORIES,
  eventYear,
  eventYears,
  featuredEvents,
  matchesEventCategory,
  type EventCategoryId,
} from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CalendarEvent, EventsBoard } from "@/types/vtuber";

const eventFilters = [
  { id: "all", label: "ทั้งหมด" },
  ...EVENT_CATEGORIES,
] as const;

type EventFilter = "all" | EventCategoryId;

function matchesFilter(event: CalendarEvent, filter: EventFilter): boolean {
  return filter === "all" || matchesEventCategory(event, filter);
}

type EventsPageClientProps = {
  /** Board with date-derived status, resolved on the server. */
  board: EventsBoard;
};

function FilterChip({
  active,
  size = "md",
  onClick,
  children,
}: {
  active: boolean;
  size?: "md" | "sm";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60",
        size === "md" ? "px-4 py-2 text-sm" : "px-3.5 py-1.5 text-xs tabular-nums sm:text-sm",
        active
          ? "border-[#e85a7a] bg-[#e85a7a] text-white"
          : "border-[#f3b8c4]/20 text-[#f7d7de]/80 hover:border-[#e85a7a]/60 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

export function EventsPageClient({ board }: EventsPageClientProps) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const [year, setYear] = useState<string>("all");
  const ordered = useMemo(() => featuredEvents(board), [board]);
  const years = useMemo(() => eventYears(board.events), [board]);
  const events = useMemo(
    () =>
      ordered.filter(
        (event) =>
          matchesFilter(event, filter) && (year === "all" || eventYear(event) === year)
      ),
    [ordered, filter, year]
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = board.events.find((event) => event.id === activeId) ?? null;

  if (board.events.length === 0) {
    return <p className="text-sm text-[#f3b8c4]/65">ยังไม่มีอีเวนต์</p>;
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" aria-label="กรองประเภทอีเวนต์">
          {eventFilters.map((item) => (
            <FilterChip
              key={item.id}
              active={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="กรองตามปี">
          {["all", ...years].map((item) => (
            <FilterChip
              key={item}
              size="sm"
              active={year === item}
              onClick={() => setYear(item)}
            >
              {item === "all" ? "ทุกปี" : item}
            </FilterChip>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-[#f3b8c4]/65">ยังไม่มีรายการในหมวดนี้</p>
      ) : (
        <ul className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id} className="h-full">
              <EventCard
                event={event}
                headingAs="h2"
                onOpen={() => setActiveId(event.id)}
              />
            </li>
          ))}
        </ul>
      )}

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
