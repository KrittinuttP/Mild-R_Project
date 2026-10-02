import { eventTags, eventYear } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/vtuber";

type EventTagsProps = {
  event: Pick<CalendarEvent, "format" | "themes" | "date">;
  className?: string;
};

const TAG_CLASS =
  "rounded-full border px-2.5 py-0.5 text-[0.7rem] leading-5 tracking-wide sm:text-xs";

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
              ? "border-[#e85a7a]/35 bg-[#e85a7a]/10 text-[#f3b8c4]"
              : "border-[#f3b8c4]/18 bg-white/[0.04] text-[#f7d7de]/80"
          )}
        >
          {tag.label}
        </li>
      ))}
      <li className={cn(TAG_CLASS, "border-white/10 tabular-nums text-white/55")}>
        {eventYear(event)}
      </li>
    </ul>
  );
}
