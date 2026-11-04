import { LensGlyph } from "@/components/cafe/SherlockSweetieLogo";
import { cn } from "@/lib/utils";

/** The green of the cafe's logo banner (`banner_cafe.png`): lighter in the middle, darker at the edges. */
export const CAFE_GREEN_BG =
  "bg-[#0f2b24] bg-[radial-gradient(ellipse_at_50%_45%,#1d4034,transparent_75%)]";

/**
 * Small square for the Projects menu: the gold heart lens on the cafe's green.
 * Kept apart from `CafeProjectCover` so the header doesn't pull in the cafe fonts.
 */
export function CafeLensMark({ className }: { className?: string }) {
  return (
    <span className={cn("absolute inset-0 flex items-center justify-center", CAFE_GREEN_BG, className)} aria-hidden>
      <LensGlyph className="h-[56%] w-auto translate-x-[4%]" />
    </span>
  );
}
