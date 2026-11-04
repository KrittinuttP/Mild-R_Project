import { eventTags, eventYear } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/vtuber";

type EventTagsProps = {
  event: Pick<CalendarEvent, "format" | "themes" | "date">;
  className?: string;
};

const TAG_CLASS =
  "rounded-full px-2.5 py-0.5 text-[0.7rem] leading-5 tracking-wide sm:text-xs";

/** Thai pills matching the /events filters: category tags, then the year. */
export function EventTags({ event, className }: EventTagsProps) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="ประเภทอีเวนต์">
      {eventTags(event).map((tag) => (
        <li
          key={tag.id}
          className={cn(
            TAG_CLASS,
            tag.kind === "format"
              ? "bg-r-pri/12 text-r-text-2 ring-1 ring-r-pri/35 ring-inset"
              : "bg-white/[0.04] text-r-text-2 ring-1 ring-r-line ring-inset"
          )}
        >
          {tag.label}
        </li>
      ))}
      <li className={cn(TAG_CLASS, "tabular-nums text-r-text-3 ring-1 ring-r-line ring-inset")}>
        {eventYear(event)}
      </li>
    </ul>
  );
}
