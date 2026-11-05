import { eventStatusLabel } from "@/lib/events";
import { R_BADGE_M, R_BADGE_TONE } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventStatus } from "@/types/vtuber";

// RBadge size M (5 Nov): pink = ongoing · mint = upcoming · grey = ended (sits on covers → dark backing).
const STATUS_CLASS: Record<CalendarEventStatus, string> = {
  ongoing: R_BADGE_TONE.now,
  upcoming: R_BADGE_TONE.soon,
  ended: cn(R_BADGE_TONE.done, "bg-r-bg/80"),
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
        R_BADGE_M,
        "backdrop-blur-sm",
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
