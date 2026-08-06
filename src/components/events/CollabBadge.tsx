import { Users } from "lucide-react";

import { cn } from "@/lib/utils";

type CollabBadgeProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Round collab pill — amber/copper vs rose solo / muted offline */
export function CollabBadge({ className, size = "sm" }: CollabBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#d4a574]/55 bg-[#d4a574]/12 tracking-[0.12em] text-[#e8c49a] uppercase",
        size === "sm" && "px-2.5 py-1 text-[0.55rem]",
        size === "md" && "px-3 py-1.5 text-[0.6rem]",
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
