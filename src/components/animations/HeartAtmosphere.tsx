"use client";

import { useId, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function SoftHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d={HEART_PATH} />
    </svg>
  );
}

function PulseHearts({ reduced, soft }: { reduced: boolean; soft?: boolean }) {
  const a = soft
    ? "absolute top-[14%] left-[10%] size-[16vw] max-w-36 text-[#c46a7a]/70 md:left-[14%] md:size-[11vw]"
    : "absolute top-[18%] left-[12%] size-[18vw] max-w-40 text-[#e85a7a]/25 md:left-[18%] md:size-[12vw]";
  const b = soft
    ? "absolute top-[28%] right-[4%] size-[24vw] max-w-52 text-[#a84d5f]/65 md:right-[8%] md:size-[14vw]"
    : "absolute top-[34%] right-[8%] size-[28vw] max-w-56 text-[#e85a7a]/18 md:right-[14%] md:size-[16vw]";
  const c = soft
    ? "absolute bottom-[20%] left-[18%] size-[13vw] max-w-28 text-[#c46a7a]/60 md:bottom-[16%] md:left-[28%] md:size-[9vw]"
    : "absolute bottom-[28%] left-[28%] size-[14vw] max-w-28 text-[#f3b8c4]/16 md:bottom-[22%] md:left-[40%] md:size-[9vw]";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SoftHeart className={cn(a, !reduced && (soft ? "animate-heart-pulse-soft" : "animate-heart-pulse"))} />
      <SoftHeart
        className={cn(b, !reduced && (soft ? "animate-heart-pulse-soft-delayed" : "animate-heart-pulse-delayed"))}
      />
      <SoftHeart className={cn(c, !reduced && (soft ? "animate-heart-pulse-soft-slow" : "animate-heart-pulse-slow"))} />
    </div>
  );
}

/** Project R hero hearts · CI A+: two pink, one mint. */
function AplusHearts({ reduced }: { reduced: boolean }) {
  return (
    <div data-hearts className="absolute inset-0 overflow-hidden">
      <SoftHeart
        className={cn(
          "absolute top-[18%] left-[6%] w-[74px] text-r-pri/25 md:left-[16%] md:w-[150px]",
          !reduced && "animate-heart-pulse"
        )}
      />
      <SoftHeart
        className={cn(
          "absolute top-[22%] right-[4%] w-24 text-r-pri/18 md:top-[30%] md:right-[8%] md:w-[200px]",
          !reduced && "animate-heart-pulse-delayed"
        )}
      />
      <SoftHeart
        className={cn(
          "absolute bottom-[40%] left-[30%] w-14 text-r-acc/16 md:bottom-[24%] md:left-[42%] md:w-[110px]",
          !reduced && "animate-heart-pulse-slow"
        )}
      />
    </div>
  );
}

/** The wave from the original hero (640×200). */
const ECG_PATH =
  "M0 100 H50 L62 100 L74 40 L90 168 L106 100 H170 L182 100 L194 52 L210 156 L226 100 H290 L302 100 L314 36 L330 172 L346 100 H410 L422 100 L434 48 L450 160 L466 100 H530 L542 100 L554 42 L570 166 L586 100 H640";
/** Desktop · the first beat runs behind the name → half as tall there. */
const ECG_DESKTOP = ECG_PATH.replace("L74 40 L90 168 L106 100", "L74 70 L90 134 L106 100");
/** Phone · one beat left of the character, one right of it (≈210 units on screen). */
const ECG_PHONE =
  "M0 100 H12 L20 100 L30 44 L42 164 L52 100 H160 L168 100 L178 48 L190 160 L200 100 H290 L302 100 L314 36 L330 172 L346 100 H410 L422 100 L434 48 L450 160 L466 100 H530 L542 100 L554 42 L570 166 L586 100 H640";
/** Tablet · same idea for a ~300-unit wide view. */
const ECG_TABLET =
  "M0 100 H14 L24 100 L36 44 L50 164 L62 100 H226 L236 100 L248 48 L262 160 L274 100 H410 L422 100 L434 48 L450 160 L466 100 H530 L542 100 L554 42 L570 166 L586 100 H640";

type WaveProps = {
  path: string;
  /** Size + visibility classes for this breakpoint. */
  className: string;
  reduced: boolean;
  /** Gradient id (pink → nurse white → mint) or undefined for currentColor. */
  gradient?: { id: string; span: number };
  fast?: boolean;
};

function Wave({ path, className, reduced, gradient, fast }: WaveProps) {
  const stroke = gradient ? `url(#${gradient.id})` : "currentColor";
  const line = {
    d: path,
    fill: "none",
    stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <svg
      className={cn("h-auto max-w-none origin-left", className)}
      viewBox="0 0 640 200"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden
    >
      {gradient ? (
        <defs>
          <linearGradient id={gradient.id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={gradient.span} y2="0">
            <stop offset="0" stopColor="var(--r-pri)" />
            <stop offset="0.5" stopColor="var(--r-nurse)" />
            <stop offset="1" stopColor="var(--r-acc)" />
          </linearGradient>
        </defs>
      ) : null}
      <path {...line} strokeWidth="9" opacity="0.12" />
      <path {...line} strokeWidth="2" opacity="0.32" />
      {!reduced ? (
        <path
          {...line}
          strokeWidth="3.2"
          className="animate-ecg-trace"
          pathLength={1000}
          style={{ strokeDasharray: "110 890", ...(fast ? { animationDuration: "calc(var(--heart-ecg) / 2)" } : {}) }}
        />
      ) : null}
    </svg>
  );
}

function LegacyEcg({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center overflow-hidden opacity-80">
      <Wave
        path={ECG_PATH}
        reduced={reduced}
        className="w-[165%] scale-[1.85] text-[#e85a7a]/75 md:w-[170%] md:scale-[1.55] md:text-[#e85a7a]/65"
      />
    </div>
  );
}

/**
 * Project R hero wave · same strokes / speed as the original, A+ gradient.
 * Height follows the screen HEIGHT on tablet + desktop (svh widths), so wide screens never overflow —
 * but never narrower than the screen (max(… , %)), so short / sideways screens don't cut the line off.
 * `[data-ecg-wrap]` is the hook for the tap spike (HomeHero animates it).
 */
function AplusEcg({ reduced, fast }: { reduced: boolean; fast: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <div data-ecg-wrap className="absolute inset-0 flex items-center overflow-hidden opacity-80">
      <Wave
        path={ECG_PHONE}
        reduced={reduced}
        fast={fast}
        gradient={{ id: `${id}p`, span: 210 }}
        className="w-[165%] scale-[1.85] md:hidden"
      />
      <Wave
        path={ECG_TABLET}
        reduced={reduced}
        fast={fast}
        gradient={{ id: `${id}t`, span: 300 }}
        className="hidden w-[max(81svh,110%)] scale-[1.85] md:block lg:hidden"
      />
      <Wave
        path={ECG_DESKTOP}
        reduced={reduced}
        fast={fast}
        gradient={{ id: `${id}d`, span: 250 }}
        className="hidden w-[max(272svh,70%)] scale-[1.55] lg:block"
      />
    </div>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

/** Soft heart-wave layer behind character / with BG — pulse always; ECG optional */
export function HeartAtmosphere({
  className,
  soft = false,
  variant = "legacy",
  fast = false,
}: {
  className?: string;
  /** Quieter cafe-style: rose tint, no ECG */
  soft?: boolean;
  /** `aplus` = Project R hero (CI A+ colours, responsive wave) */
  variant?: "legacy" | "aplus";
  /** Wave runs twice as fast (ON AIR) — aplus only */
  fast?: boolean;
}) {
  const reduced = usePrefersReducedMotion();

  if (variant === "aplus") {
    return (
      <div className={cn("pointer-events-none absolute inset-0 z-[1] overflow-hidden", className)} aria-hidden>
        <AplusHearts reduced={reduced} />
        <AplusEcg reduced={reduced} fast={fast} />
      </div>
    );
  }

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-[1] overflow-hidden", className)} aria-hidden>
      <PulseHearts reduced={reduced} soft={soft} />
      {!soft ? <LegacyEcg reduced={reduced} /> : null}
      {!soft ? (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#140a0d]/35" />
      ) : null}
    </div>
  );
}
