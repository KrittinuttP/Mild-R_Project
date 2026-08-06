import { RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";

type OfflineBadgeProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Round offline pill — muted, no detail text */
export function OfflineBadge({ className, size = "sm" }: OfflineBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#8a7f88]/45 bg-[#8a7f88]/12 tracking-[0.12em] text-[#c9bfc6] uppercase",
        size === "sm" && "px-2.5 py-1 text-[0.55rem]",
        size === "md" && "px-3 py-1.5 text-[0.6rem]",
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
