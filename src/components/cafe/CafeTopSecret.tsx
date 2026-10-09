"use client";

import { cn } from "@/lib/utils";

const TYPE = "font-[family-name:var(--font-cafe-type)]";
const HAND = "font-[family-name:var(--font-cafe-hand)]";

type CafeTopSecretProps = {
  title?: string;
  titleLocal?: string;
  className?: string;
  compact?: boolean;
};

/** Classified dossier panel when a cafe section is hidden. */
export function CafeTopSecret({
  title = "TOP SECRET",
  titleLocal = "หลักฐาน · ยังไม่เปิดเผย",
  className,
  compact = false,
}: CafeTopSecretProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-dashed border-[#e85a7a]/80 bg-[#14100c]",
        compact ? "min-h-[10rem] px-5 py-8" : "min-h-[14rem] px-6 py-12 sm:px-10",
        className
      )}
      role="status"
      aria-label="Top secret — section classified"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent 0 10px, rgba(168,77,95,0.35) 10px 11px)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full border border-[#a84d5f]/35 opacity-60 sm:size-36"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-4 left-4 text-[0.58rem] tracking-[0.28em] text-[#9a7b5a]/70 uppercase"
        aria-hidden
      >
        CASE FILE · REDACTED
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <span
          className={cn(
            TYPE,
            "rotate-[-6deg] border-[3px] border-[#e85a7a] px-4 py-2 text-sm font-bold tracking-[0.18em] text-[#e85a7a] uppercase"
          )}
        >
          {title}
        </span>
        <p className={cn(HAND, "mt-6 text-[22px] text-[#f3b8c4]")}>
          {titleLocal}
        </p>
      </div>
    </div>
  );
}
