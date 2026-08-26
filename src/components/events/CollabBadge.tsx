import { Users } from "lucide-react";

import {
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_PILL_MD,
  LIVE_BADGE_PILL_SM,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

type CollabBadgeProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Round collab pill — same size as Mild-R / Member */
export function CollabBadge({ className, size = "sm" }: CollabBadgeProps) {
  return (
    <span
      className={cn(
        size === "md" ? LIVE_BADGE_PILL_MD : LIVE_BADGE_PILL_SM,
        LIVE_BADGE_COLLAB,
        "gap-1",
        className
      )}
    >
      <Users
        className={cn(size === "md" ? "size-3" : "size-2.5")}
        aria-hidden
      />
      Collab
    </span>
  );
}
