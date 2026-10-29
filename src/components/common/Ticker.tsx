import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** px per second — every ticker moves at the same speed whatever the text length. */
const SPEED = 40;
/** gap + ✦ between the two copies */
const SEP_PX = 44;

type TickerProps = {
  children: ReactNode;
  /** Plain-text length of `children`; sets the loop time. */
  length: number;
  /** Rough px per character for the font in use (mono 17px ≈ 10). */
  charWidth?: number;
  /** Width via classes, e.g. "w-[168px] md:w-[280px]". */
  className?: string;
};

/**
 * One line of running text that loops without a gap: the text twice, separated by ✦,
 * sliding left by exactly one copy. Pauses on hover / keyboard focus; under reduced
 * motion it stands still and cuts off with … (globals.css `.r-ticker*`).
 */
export function Ticker({ children, length, charWidth = 10, className }: TickerProps) {
  const seconds = Math.max(6, Math.round(((length * charWidth + SEP_PX) / SPEED) * 10) / 10);

  return (
    <span className={cn("r-ticker-mask block overflow-hidden whitespace-nowrap", className)}>
      <span className="r-ticker inline-flex" style={{ "--r-ticker-dur": `${seconds}s` } as CSSProperties}>
        <span>{children}</span>
        <span aria-hidden className="r-ticker-sep px-4 text-r-text-2/55">
          ✦
        </span>
        {/* second copy is decoration only — not read out, not focusable */}
        <span aria-hidden inert className="r-ticker-copy">
          {children}
        </span>
        <span aria-hidden className="r-ticker-sep px-4 text-r-text-2/55">
          ✦
        </span>
      </span>
    </span>
  );
}
