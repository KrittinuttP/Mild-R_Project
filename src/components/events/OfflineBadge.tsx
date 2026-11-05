import { RadioTower } from "lucide-react";

import { R_BADGE_M, R_BADGE_S, R_BADGE_TONE } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

type OfflineBadgeProps = {
  className?: string;
  size?: "sm" | "md";
  /** Kept for callers; every page uses the A+ mint since the legacy table skin was removed. */
  tone?: "legacy" | "aplus";
};

/** Offline pill — mint accent for empty / offline days */
export function OfflineBadge({ className, size = "sm" }: OfflineBadgeProps) {
  return (
    <span
      className={cn(
        // RBadge (5 Nov): S / M sizes, mint tint (Offline stays mint; Collab moved to sky blue).
        size === "md" ? R_BADGE_M : R_BADGE_S,
        R_BADGE_TONE.offline,
        className
      )}
    >
      <RadioTower
        className={cn(size === "md" ? "size-3" : "size-2.5")}
        aria-hidden
      />
      Offline
    </span>
  );
}
