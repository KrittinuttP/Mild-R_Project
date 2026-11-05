import type { ReactNode } from "react";

import { R_BADGE_M, R_BADGE_S, R_BADGE_TONE, type RBadgeTone } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

/**
 * Site-wide status / tag badge (UI round 2 · 5 Nov).
 * size S = in cards and rows · M = card headers / hero.
 * `dot` adds the pulse-free dot used by "now" badges (LIVE · กำลังจัด).
 */
export function RBadge({
  tone = "meta",
  size = "s",
  dot = false,
  className,
  children,
}: {
  tone?: RBadgeTone;
  size?: "s" | "m";
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn(size === "m" ? R_BADGE_M : R_BADGE_S, R_BADGE_TONE[tone], className)}>
      {dot ? <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
