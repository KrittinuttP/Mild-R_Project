"use client";

import { cn } from "@/lib/utils";

const SERIF = "font-[family-name:var(--font-cafe-serif),var(--font-cafe-thai),serif]";
const THAI = "font-[family-name:var(--font-cafe-thai),serif]";

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
        "relative overflow-hidden border border-dashed border-cafe-gold/80 bg-cafe-void",
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
            "repeating-linear-gradient(-18deg, transparent 0 10px, rgba(201,161,74,0.35) 10px 11px)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full border border-cafe-gold/35 opacity-60 sm:size-36"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-4 left-4 text-[0.58rem] tracking-[0.28em] text-cafe-gold/70 uppercase"
        aria-hidden
      >
        CASE FILE · REDACTED
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <span
          className={cn(
            SERIF,
            "rotate-[-6deg] border-2 border-cafe-gold px-4 py-2 text-sm font-bold tracking-[0.18em] text-cafe-gold uppercase"
          )}
        >
          {title}
        </span>
        <p className={cn(THAI, "mt-6 text-lg text-cafe-gold-soft")}>
          {titleLocal}
        </p>
      </div>
    </div>
  );
}
