"use client";

import { cn } from "@/lib/utils";

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";

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
        "relative overflow-hidden border border-[#a84d5f]/45 bg-[#100c0a]",
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
            DISPLAY,
            "rotate-[-6deg] border-[3px] border-[#c46a7a] px-4 py-2 text-sm tracking-[0.28em] text-[#c46a7a] uppercase shadow-[4px_6px_0_rgba(0,0,0,0.35)] sm:text-base"
          )}
        >
          Top Secret
        </span>
        <p
          className={cn(
            SERIF,
            "mt-6 text-xl font-normal text-[#f4ebe3] sm:text-2xl"
          )}
        >
          {title}
        </p>
        <p className={cn(DISPLAY, "mt-2 text-sm text-[#c4b8a8]")}>
          {titleLocal}
        </p>
        <p className="mt-4 max-w-md text-[0.7rem] leading-relaxed tracking-[0.06em] text-[#9a7b5a]">
          ข้อมูลส่วนนี้ · ยังไม่เปิดเผย — รอประกาศจากทีม Honeycomb
        </p>
      </div>
    </div>
  );
}
