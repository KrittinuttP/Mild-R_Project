import { RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";

type OfflineBadgeProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Offline pill — mint accent for empty / offline days */
export function OfflineBadge({ className, size = "sm" }: OfflineBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#6ec9b0]/50 bg-[#6ec9b0]/12 tracking-[0.12em] text-[#a8e6d4] uppercase",
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
