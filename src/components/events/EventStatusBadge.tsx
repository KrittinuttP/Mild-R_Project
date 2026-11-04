import { eventStatusLabel } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventStatus } from "@/types/vtuber";

const STATUS_CLASS: Record<CalendarEventStatus, string> = {
  ongoing: "bg-r-pri text-r-on-pri",
  upcoming: "bg-r-acc text-r-on-acc",
  ended: "bg-r-bg/80 text-r-text-2/80 ring-1 ring-r-line ring-inset",
};

type EventStatusBadgeProps = {
  event: Pick<CalendarEvent, "status" | "statusDays">;
  className?: string;
};

/** Pink = ongoing, mint = upcoming, dark = ended (CI A+ solid chips). */
export function EventStatusBadge({ event, className }: EventStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-sm sm:text-sm",
        STATUS_CLASS[event.status],
        className
      )}
    >
      {event.status === "ended" ? null : (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      )}
      {eventStatusLabel(event)}
    </span>
  );
}
