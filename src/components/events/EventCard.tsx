import { CoverCard } from "@/components/cards/CoverCard";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EventTags } from "@/components/events/EventTags";
import { formatEventDateRange } from "@/lib/events";
import type { CalendarEvent } from "@/types/vtuber";

type EventCardProps = {
  event: CalendarEvent;
  onOpen: () => void;
  headingAs?: "h2" | "h3" | "h4";
};

export function EventCard({ event, onOpen, headingAs = "h3" }: EventCardProps) {
  const ended = event.status === "ended";
  const footnote = [event.venue, event.platform].filter(Boolean).join(" · ");

  return (
    <CoverCard
      onClick={onOpen}
      cover={event.cover}
      coverAlt={event.coverAlt ?? event.title}
      media="square-contain"
      badge={<EventStatusBadge event={event} />}
      tone={
        event.status === "ongoing" ? "featured" : ended ? "muted" : "default"
      }
      eyebrow={
        <div>
          <EventTags event={event} className="mb-3" />
          <p className="text-xs tabular-nums text-[#f3b8c4]/70 sm:text-sm">
            {formatEventDateRange(event)}
            {event.timeLabel ? ` · ${event.timeLabel}` : null}
          </p>
        </div>
      }
      title={event.titleLocal ?? event.title}
      subtitle={event.titleLocal ? event.title : undefined}
      summary={event.summary}
      footnote={footnote || undefined}
      headingAs={headingAs}
      uniform
    />
  );
}
