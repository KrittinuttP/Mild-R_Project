import { Radio, RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";

export const LIVE_COVER_PLACEHOLDER_LABEL = "Mild-R Live";
export const LIVE_COVER_OFFLINE_LABEL = "ออฟไลน์";

const SIZE_CLASS = {
  sm: {
    root: "p-1.5",
    iconWrap: "mb-0.5 size-5",
    icon: "size-2.5",
    label: "text-[0.58rem]",
  },
  md: {
    root: "p-2",
    iconWrap: "mb-0.5 size-6 sm:size-7",
    icon: "size-3 sm:size-3.5",
    label: "text-[0.62rem] sm:text-[0.68rem]",
  },
  lg: {
    root: "p-3",
    iconWrap: "mb-1 size-8 sm:size-9",
    icon: "size-3.5 sm:size-4",
    label: "text-[0.68rem] sm:text-xs",
  },
} as const;

type LiveCoverPlaceholderProps = {
  className?: string;
  size?: keyof typeof SIZE_CLASS;
  /** default = no cover · offline = green offline state */
  variant?: "default" | "offline";
};

export function LiveCoverPlaceholder({
  className,
  size = "md",
  variant = "default",
}: LiveCoverPlaceholderProps) {
  const s = SIZE_CLASS[size];
  const offline = variant === "offline";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br",
        offline
          ? "from-[#0f1f1a] via-[#0c1612] to-[#08100d]"
          : "from-[#260f1c] via-[#1a0c13] to-[#12070c]",
        s.root,
        className
      )}
      aria-hidden
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          offline
            ? "bg-[#6ec9b0]/10 text-[#a8e6d4]"
            : "bg-[#f3b8c4]/10 text-[#f3b8c4]/70",
          s.iconWrap
        )}
      >
        {offline ? (
          <RadioTower className={s.icon} />
        ) : (
          <Radio className={s.icon} />
        )}
      </div>
      <span
        className={cn(
          "max-w-full truncate px-1 font-medium tracking-wider uppercase",
          offline ? "text-[#6ec9b0]/70" : "text-[#f3b8c4]/50",
          s.label
        )}
      >
        {offline ? LIVE_COVER_OFFLINE_LABEL : LIVE_COVER_PLACEHOLDER_LABEL}
      </span>
    </div>
  );
}
