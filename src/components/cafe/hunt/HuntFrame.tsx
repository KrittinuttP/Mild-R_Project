import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const THAI = "font-[family-name:var(--font-cafe-thai)]";

/** Text link on the green wall, tall enough to tap. */
export const WALL_LINK =
  "inline-flex min-h-11 items-center text-[15px] font-semibold text-cafe-gold-soft underline underline-offset-4 transition hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold";

/** Main action: the gold button of the cafe pages. */
export const GOLD_BUTTON =
  "flex w-full items-center justify-center gap-3 bg-[linear-gradient(180deg,#d6b25e,var(--color-cafe-gold)_55%,#b88f3a)] px-4 font-semibold text-cafe-ink shadow-[0_12px_26px_rgba(0,0,0,0.4),0_0_0_4px_rgba(201,161,74,0.16),inset_0_1px_0_rgba(255,240,200,0.5)] transition hover:brightness-110 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-cream";

/** Notice on the wall: dark panel with a gold edge. */
export const WALL_NOTE =
  "border-l-[3px] border-cafe-gold bg-cafe-deep/85 px-3.5 py-3 text-sm leading-[1.6] text-cafe-text";

/**
 * Green wall + lamp glow, as on /cafe. `phone` = one phone-width column
 * (player pages); `wide` = full board width for screens (QR sheet). The cafe
 * header is fixed, hence the top padding.
 */
export function HuntFrame({
  children,
  width = "phone",
}: {
  children: ReactNode;
  width?: "phone" | "wide";
}) {
  return (
    <div
      className={cn(THAI, "relative overflow-x-clip bg-cafe-ground text-cafe-text")}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 140% 560px at 50% 0, var(--color-cafe-glow), transparent 70%)",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className={cn(
          "mx-auto w-full px-5 pt-24 pb-20 sm:px-8 sm:pt-28",
          width === "wide" ? "max-w-[1280px]" : "max-w-[560px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Keyhole of the Sherlock Sweetie mark (viewbox 64 × 148). */
const KEYHOLE = "M21 68.75 A28 28 0 1 1 43 68.75 L56 119 H8 Z";

/** Lobed outline of a wax seal on a 100 × 100 box, worked out once. */
const SEAL_PATH = (() => {
  const steps = 60;
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + 0.045 * Math.sin(a * 15) + 0.02 * Math.sin(a * 3 + 1);
    const x = 50 + 48 * k * Math.cos(a);
    const y = 50 + 48 * k * Math.sin(a);
    points.push(`${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${points.join("")}Z`;
})();

type WaxSealProps = {
  /** Big line in the middle, e.g. "03" or "✓". */
  label: string;
  /** Small line above it. */
  top?: string;
  /** Size comes from the class (`size-12` …). */
  className?: string;
  turn?: number;
};

/** Red sealing-wax stamp: what a found piece of evidence looks like. */
export function WaxSeal({ label, top = "FOUND", className, turn = 0 }: WaxSealProps) {
  const gradient = useId();
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(
        "shrink-0 overflow-visible [filter:drop-shadow(0_3px_3px_rgba(40,8,10,0.45))]",
        className
      )}
      style={{ transform: `rotate(${turn}deg)` }}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradient} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#d35d65" />
          <stop offset="0.45" stopColor="var(--color-cafe-wax)" />
          <stop offset="1" stopColor="var(--color-cafe-wax-dark)" />
        </radialGradient>
      </defs>
      <path d={SEAL_PATH} fill={`url(#${gradient})`} />
      <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-cafe-wax-dark)" strokeWidth="3" opacity=".55" />
      <circle cx="49.2" cy="49.2" r="35" fill="none" stroke="#e48a90" strokeWidth="1" opacity=".35" />
      {top ? (
        <text
          x="50"
          y="40"
          textAnchor="middle"
          fontFamily="var(--font-cafe-serif), serif"
          fontWeight="700"
          fontSize="10"
          letterSpacing="1.6"
          fill="#f3c9cc"
        >
          {top}
        </text>
      ) : null}
      <text
        x="50"
        y={top ? 66 : 60}
        textAnchor="middle"
        fontFamily="var(--font-cafe-serif), serif"
        fontWeight="700"
        fontSize={top ? 26 : 30}
        fill="#fbe6e7"
        stroke="var(--color-cafe-wax-dark)"
        strokeWidth=".6"
      >
        {label}
      </text>
    </svg>
  );
}

/** Empty place for a piece not found yet: dashed ring with a faint keyhole. */
export function KeyholeSlot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-cafe-gold-deep/55",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 148" className="h-auto w-[22%] fill-cafe-gold-deep/45">
        <path d={KEYHOLE} />
      </svg>
    </span>
  );
}

/** Brass keyhole plate pinning a paper, as on the overview board. */
export function KeyholePlate({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute z-10 block h-[30px] w-[22px] rounded-[5px] bg-[linear-gradient(160deg,#e9cf86,#b8913c_45%,var(--color-cafe-gold-deep))] shadow-[0_3px_6px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,240,200,0.4)]",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 148" className="absolute top-[5px] left-1/2 h-[19px] w-auto -translate-x-1/2 fill-[#2a2112]">
        <path d={KEYHOLE} />
      </svg>
    </span>
  );
}

/** Gold pushpin. */
export function BrassPin({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute z-10 block rounded-full bg-[radial-gradient(circle_at_35%_32%,#f6e4a8,var(--color-cafe-gold)_55%,#6e5218)] shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
        className
      )}
      aria-hidden
    />
  );
}
