import { RadioTower } from "lucide-react";

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
        "inline-flex items-center gap-1 rounded-full border tracking-[0.12em] uppercase",
        tone === "aplus"
          ? "border-r-acc/50 bg-r-acc/12 text-r-acc"
          : "border-[#6ec9b0]/50 bg-[#6ec9b0]/12 text-[#a8e6d4]",
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
