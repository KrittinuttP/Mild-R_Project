import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type RChipTone = "soft" | "pri" | "live";

const TONE: Record<RChipTone, string> = {
  soft: "bg-white/[0.04] text-r-text-2 ring-r-text-2/15",
  pri: "bg-r-pri/14 text-r-text ring-r-pri/40",
  live: "bg-r-pri text-r-on-pri ring-r-pri",
};

/**
 * Small status / meta chip from the project R boards (11.5px, pill, 1px ring).
 * soft = channel, MEMBER, "จบแล้ว" · pri = "ไลฟ์วันนี้", MEMBER on covers · live = on air.
 */
export function RChip({ tone = "soft", className, children }: { tone?: RChipTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[0.71875rem] leading-[1.45] whitespace-nowrap ring-1 ring-inset",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
