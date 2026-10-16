import { useId } from "react";

import { cn } from "@/lib/utils";

/*
 * Brass, wax and keyhole pieces of the Sherlock Sweetie look, shared by the
 * /cafe board and the evidence hunt.
 */

/** Main action: the gold button of the cafe pages. */
export const GOLD_BUTTON =
  "flex w-full items-center justify-center gap-3 bg-[linear-gradient(180deg,#d6b25e,var(--color-cafe-gold)_55%,#b88f3a)] px-4 font-semibold text-cafe-ink shadow-[0_12px_26px_rgba(0,0,0,0.4),0_0_0_4px_rgba(201,161,74,0.16),inset_0_1px_0_rgba(255,240,200,0.5)] transition hover:brightness-110 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-cream";

/** Keyhole of the Sherlock Sweetie mark (viewbox 64 × 148). */
export const KEYHOLE = "M21 68.75 A28 28 0 1 1 43 68.75 L56 119 H8 Z";

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
export function KeyholePlate({ id, className }: { id?: string; className?: string }) {
  return (
    <span
      data-pin={id}
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
export function BrassPin({ id, className }: { id?: string; className?: string }) {
  return (
    <span
      data-pin={id}
      className={cn(
        "absolute z-10 block rounded-full bg-[radial-gradient(circle_at_35%_32%,#f6e4a8,var(--color-cafe-gold)_55%,#6e5218)] shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
        className
      )}
      aria-hidden
    />
  );
}
