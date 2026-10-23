"use client";

import { GOLD_BUTTON } from "@/components/cafe/board/brass";
import { SERIF, THAI } from "@/components/cafe/board/pieces";
import { useNow } from "@/hooks/useNow";
import { splitRemaining, type CountdownParts } from "@/lib/cafe-countdown-view";
import { cn } from "@/lib/utils";

type Phase = "pending" | "counting" | "reached";

/**
 * Time left to `targetMs`, from the visitor's clock but against a fixed
 * instant. `pending` until the page is mounted, so server and client markup
 * match.
 */
function useCountdown(targetMs: number): {
  phase: Phase;
  parts: CountdownParts | null;
} {
  const now = useNow(1000);
  if (now === null || !Number.isFinite(targetMs)) {
    return { phase: "pending", parts: null };
  }
  const seconds = Math.floor((targetMs - now) / 1000);
  if (seconds <= 0) return { phase: "reached", parts: null };
  return { phase: "counting", parts: splitRemaining(seconds) };
}

/**
 * Where the button goes once the time is up: always `/cafe`, and the server
 * decides which page that is now (lib/cafe-gate.ts). So CD1's source never
 * names the next page.
 */
const NEXT_PAGE = "/cafe";

const UNITS = [
  { key: "days", en: "DAYS", th: "วัน" },
  { key: "hours", en: "HOURS", th: "ชั่วโมง" },
  { key: "minutes", en: "MINUTES", th: "นาที" },
  { key: "seconds", en: "SECONDS", th: "วินาที" },
] as const;

/** Class names are written out in full so Tailwind can see them. */
const SIZES = {
  large: {
    gap: "gap-[clamp(8px,1.4vw,20px)]",
    box: "w-[clamp(72px,10.5vw,156px)] pt-[clamp(12px,1.4vw,22px)] pb-[clamp(10px,1.2vw,18px)]",
    digit: "text-[length:clamp(32px,5.4vw,80px)]",
    timerMt: "mt-[clamp(14px,1.8vw,24px)]",
    dateMt: "mt-[clamp(22px,2.4vw,32px)]",
  },
  regular: {
    gap: "gap-[clamp(8px,1.3vw,18px)]",
    box: "w-[clamp(72px,9.4vw,140px)] pt-[clamp(12px,1.3vw,20px)] pb-[clamp(10px,1.1vw,16px)]",
    digit: "text-[length:clamp(30px,min(4.8vw,6svh),72px)]",
    // CD2 also shrinks with screen height so the logo keeps the first view.
    timerMt: "mt-[clamp(12px,min(1.8vw,2svh),24px)]",
    dateMt: "mt-[clamp(16px,min(2.4vw,2.6svh),32px)]",
  },
} as const;

type CountdownBoardProps = {
  /**
   * Epoch ms to count to (from the page lock, see `lib/cafe-gate`).
   * A number rather than ISO text, so the clock time is not spelled out in
   * the page source.
   */
  targetMs: number;
  /** Line above the timer, with a rule on each side. */
  eyebrow: string;
  eyebrowTh?: string;
  /** Plain date under the timer. Never put the clock time here. */
  dateLine?: string;
  size: keyof typeof SIZES;
  /** What replaces the timer when the time is up. */
  open: { label: string; labelTh: string; cta: string };
  className?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function CountdownBoard({
  targetMs,
  eyebrow,
  eyebrowTh,
  dateLine,
  size,
  open,
  className,
}: CountdownBoardProps) {
  const { phase, parts } = useCountdown(targetMs);
  const s = SIZES[size];

  if (phase === "reached") {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <p
          className={cn(
            SERIF,
            "pl-[0.36em] text-[length:clamp(14px,1.4vw,20px)] font-bold tracking-[0.36em] text-cafe-gold"
          )}
        >
          {open.label}
        </p>
        <p
          className={cn(
            THAI,
            "mt-1.5 text-[length:clamp(15px,1.4vw,19px)] leading-[1.6] text-cafe-cream"
          )}
        >
          {open.labelTh}
        </p>
        {/* A full page load, not a client-side move: the cafe layout only
            decides on the server whether to show the site menu, so the next
            page needs a fresh request to get it right. */}
        <a
          href={NEXT_PAGE}
          className={cn(
            GOLD_BUTTON,
            SERIF,
            "mt-6 inline-flex min-h-12 w-auto px-8 text-sm font-bold tracking-[0.2em] whitespace-nowrap"
          )}
        >
          {open.cta}
        </a>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <p
        className={cn(
          SERIF,
          "flex items-center gap-3.5 text-[length:clamp(10px,0.95vw,13px)] font-bold tracking-[0.32em] text-cafe-gold"
        )}
      >
        <span className="h-px w-[clamp(28px,4vw,64px)] bg-cafe-gold" aria-hidden />
        {eyebrow}
        <span className="h-px w-[clamp(28px,4vw,64px)] bg-cafe-gold" aria-hidden />
      </p>
      {eyebrowTh ? (
        <p
          className={cn(
            THAI,
            "mt-1 text-[length:clamp(13px,1.1vw,16px)] leading-[1.6] text-cafe-cream/85"
          )}
        >
          {eyebrowTh}
        </p>
      ) : null}
      <div
        role="timer"
        aria-label={eyebrow}
        className={cn(
          "flex",
          s.timerMt,
          s.gap
        )}
      >
        {UNITS.map((unit) => (
          <div
            key={unit.key}
            className={cn(
              "flex flex-col items-center border border-cafe-gold bg-black/20 outline-1 outline-offset-[-7px] outline-cafe-gold/35",
              s.box
            )}
          >
            <span
              className={cn(
                SERIF,
                "leading-none font-bold text-cafe-cream tabular-nums",
                s.digit
              )}
            >
              {parts ? pad(parts[unit.key]) : "--"}
            </span>
            <span
              className={cn(
                SERIF,
                "mt-[clamp(8px,0.9vw,12px)] pl-[0.22em] text-[length:clamp(9px,0.8vw,12px)] font-bold tracking-[0.22em] text-cafe-gold"
              )}
            >
              {unit.en}
            </span>
            <span
              className={cn(
                THAI,
                "text-[length:clamp(11px,0.95vw,14px)] leading-[1.5] text-cafe-cream/80"
              )}
            >
              {unit.th}
            </span>
          </div>
        ))}
      </div>
      {dateLine ? (
        <p
          className={cn(
            SERIF,
            s.dateMt,
            "text-[length:clamp(12px,1.15vw,16px)] font-bold tracking-[0.22em] whitespace-nowrap text-cafe-cream"
          )}
        >
          {dateLine}
        </p>
      ) : null}
    </div>
  );
}

type CountdownStatusTagProps = {
  targetMs: number;
  sealed: string;
  open: string;
};

/** Corner tag that flips from SEALED to OPEN when the time is up. */
export function CountdownStatusTag({
  targetMs,
  sealed,
  open,
}: CountdownStatusTagProps) {
  const { phase } = useCountdown(targetMs);
  return <>{phase === "reached" ? open : sealed}</>;
}
