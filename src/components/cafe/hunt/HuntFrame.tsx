import type { ReactNode } from "react";

import { TYPE } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

export const THAI = "font-[family-name:var(--font-cafe-thai)]";

/** Text link on the dark wall, tall enough to tap. */
export const WALL_LINK =
  "inline-flex min-h-11 items-center text-[15px] font-semibold text-[#f3b8c4] underline underline-offset-4 transition hover:text-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]";

/** Dark wall + lamp glow, one phone-width column. The cafe header is fixed, hence the top padding. */
export function HuntFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(THAI, "relative overflow-x-clip text-[#d8d0c4]")}
      style={{
        backgroundColor: "#0a0c0e",
        backgroundImage:
          "radial-gradient(circle at 50% -6%, rgba(255,206,140,0.2), transparent 55%), linear-gradient(rgba(244,235,227,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(244,235,227,0.022) 1px, transparent 1px)",
        backgroundSize: "auto, 44px 44px, 44px 44px",
      }}
    >
      <div className="mx-auto w-full max-w-[560px] px-5 pt-24 pb-20 sm:px-8 sm:pt-28">
        {children}
      </div>
    </div>
  );
}

type StampMarkProps = {
  /** 1-based evidence number. */
  number: number;
  found: boolean;
  /** Small turn so a row of stamps does not look printed. */
  turn?: number;
  className?: string;
};

/** Round ink stamp for a found piece, dashed "?" for a missing one. */
export function StampMark({ number, found, turn = 0, className }: StampMarkProps) {
  if (!found) {
    return (
      <span
        className={cn(
          "flex size-[58px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#5c4636] font-[family-name:var(--font-cafe-serif)] text-[26px] text-[#5c4636]",
          className
        )}
        aria-hidden
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={cn(
        TYPE,
        "flex size-[58px] shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-[#a8323f] font-bold text-[#a8323f] shadow-[inset_0_0_0_3px_#f4ebe3,inset_0_0_0_4px_#a8323f]",
        className
      )}
      style={{ transform: `rotate(${turn}deg)` }}
      aria-hidden
    >
      <span className="text-[10px] leading-none tracking-[0.1em]">FOUND</span>
      <span className="mt-0.5 text-lg leading-none">
        {String(number).padStart(2, "0")}
      </span>
    </span>
  );
}
