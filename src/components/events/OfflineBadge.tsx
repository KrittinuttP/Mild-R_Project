import { RadioTower } from "lucide-react";

import { R_BADGE_M, R_BADGE_S, R_BADGE_TONE } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

type OfflineBadgeProps = {
  className?: string;
  size?: "sm" | "md";
  /** Homepage table uses `--r-acc`. /live keeps the original mint. */
  tone?: "legacy" | "aplus";
};

/** Offline pill — mint accent for empty / offline days */
export function OfflineBadge({ className, size = "sm", tone = "legacy" }: OfflineBadgeProps) {
  return (
    <span
      className={cn(
        // RBadge (5 Nov): S / M sizes, mint tint (Offline stays mint; Collab moved to sky blue).
        size === "md" ? R_BADGE_M : R_BADGE_S,
        tone === "aplus"
          ? R_BADGE_TONE.offline
          : "bg-[#6ec9b0]/12 text-[#a8e6d4] uppercase tracking-[0.06em] ring-1 ring-[#6ec9b0]/50 ring-inset",
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
