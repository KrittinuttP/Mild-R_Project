import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export {
  BrassPin,
  GOLD_BUTTON,
  KeyholePlate,
  KeyholeSlot,
  WaxSeal,
} from "@/components/cafe/board/brass";

export const THAI = "font-[family-name:var(--font-cafe-thai)]";

/** Text link on the green wall, tall enough to tap. */
export const WALL_LINK =
  "inline-flex min-h-11 items-center text-[15px] font-semibold text-cafe-gold-soft underline underline-offset-4 transition hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold";

/** Notice on the wall: dark panel with a gold edge. */
export const WALL_NOTE =
  "border-l-[3px] border-cafe-gold bg-cafe-deep/85 px-3.5 py-3 text-sm leading-[1.6] text-cafe-text";

/**
 * Green wall + lamp glow, as on /cafe. `phone` = one phone-width column
 * (player pages); `wide` = full board width for screens (QR sheet). The cafe
 * header is fixed, hence the top padding.
 */
export function HuntFrame({
  children,
  width = "phone",
}: {
  children: ReactNode;
  width?: "phone" | "wide";
}) {
  return (
    <div
      className={cn(THAI, "relative overflow-x-clip bg-cafe-ground text-cafe-text")}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 140% 560px at 50% 0, var(--color-cafe-glow), transparent 70%)",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className={cn(
          "mx-auto w-full px-5 pt-24 pb-20 sm:px-8 sm:pt-28",
          width === "wide" ? "max-w-[1280px]" : "max-w-[560px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
