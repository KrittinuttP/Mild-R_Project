import { R_CARD_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

/** Rough height of each step card, so the page does not jump when the form shows. */
type CardSize = "sm" | "md" | "lg";

const CARD_HEIGHT: Record<CardSize, string> = {
  sm: "min-h-[200px]",
  md: "min-h-[260px]",
  lg: "min-h-[320px]",
};

/**
 * Stand-in for the upload form while the browser reads localStorage
 * ("seen ก่อนเริ่ม?" / saved draft). Before that we can't tell whether to show
 * "ก่อนเริ่ม" or the form, so this keeps the space instead of a blank column (4 Nov).
 * Static on purpose: no pulse.
 */
export function UploadFormSkeleton({ cards }: { cards: readonly CardSize[] }) {
  return (
    <div aria-hidden className="space-y-3.5 lg:space-y-4">
      <div className="h-8 lg:hidden" />
      {cards.map((size, index) => (
        <div key={index} className={cn(R_CARD_CLASS, "p-5 opacity-60 sm:p-[22px]", CARD_HEIGHT[size])}>
          <div className="flex items-center gap-3">
            <span className="size-7 rounded-full ring-[1.5px] ring-r-text-2/25 ring-inset" />
            <span className="h-3.5 w-32 rounded-full bg-white/[0.06]" />
          </div>
          <div className="mt-6 h-11 rounded-[14px] bg-white/[0.035]" />
          <div className="mt-3 h-3 w-2/5 rounded-full bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
