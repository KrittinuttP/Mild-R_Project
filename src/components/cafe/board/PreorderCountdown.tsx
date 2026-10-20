"use client";

import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";

const pad = (value: number) => String(value).padStart(2, "0");

/** Time left to book, e.g. `13 วัน 08:42:15`. Blank until the client clock is known. */
export function PreorderCountdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const end = Date.parse(endsAt);
  const valid = Number.isFinite(end);
  const now = useNow(1000, valid);
  if (!valid) return null;

  const total = now === null ? null : Math.max(0, Math.floor((end - now) / 1000));
  const text =
    total === null
      ? " "
      : `${Math.floor(total / 86400)} วัน ${pad(Math.floor((total % 86400) / 3600))}:${pad(
          Math.floor((total % 3600) / 60)
        )}:${pad(total % 60)}`;

  return (
    <span
      role="timer"
      aria-live="off"
      className={cn(
        "inline-block min-w-[13ch] font-[family-name:var(--font-cafe-type)] text-xl font-bold tabular-nums",
        className
      )}
    >
      {text}
    </span>
  );
}
