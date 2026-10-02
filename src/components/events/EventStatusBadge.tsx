import { eventStatusLabel } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventStatus } from "@/types/vtuber";

const STATUS_CLASS: Record<CalendarEventStatus, string> = {
  ongoing: "border-[#e85a7a] bg-[#e85a7a] text-white",
  upcoming: "border-[#f5c46b]/55 bg-[#241a0a]/85 text-[#ffd98a]",
  ended: "border-white/15 bg-[#140a0d]/80 text-white/60",
};

type EventStatusBadgeProps = {
  event: Pick<CalendarEvent, "status" | "statusDays">;
  className?: string;
};

/** Pink = ongoing, gold = upcoming, grey = ended. */
export function EventStatusBadge({ event, className }: EventStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-sm sm:text-sm",
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
