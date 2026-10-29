"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import {
  isReloadNavigation,
  wasSoftNavigation,
} from "@/components/layout/SoftNavMarker";
import { heroNameFont } from "@/lib/hero-fonts";
import { markSplashExit, markSplashShowing } from "@/lib/splash-signal";
import { cn } from "@/lib/utils";

const VISITED_KEY = "mild-r-has-visited";

/** Heart outline + the ECG line that runs through it (viewBox 0 0 100 92). */
const HEART_PATH =
  "M50 86 C20 64 6 46 6 30 C6 16 17 6 30 6 C39 6 46 11 50 18 C54 11 61 6 70 6 C83 6 94 16 94 30 C94 46 80 64 50 86 Z";
const HEART_ECG_PATH = "M-14 46 H24 L32 46 L38 32 L46 62 L54 22 L62 52 L68 46 H114";

/**
 * One run = the ECG line inside the heart drawn once (the loading line runs on the same beat).
 * The splash always shows at least one full run and only fades at the end of a run.
 * First visit: one more run while the hero font + art are still loading (max 2 runs).
 */
const RUN_MS = 900;
/** After the last run the heart bounces once more (`animate-splash-final-beat`), then the fade starts. */
const BEAT_MS = 400;
const TIMING = {
  first: { run: RUN_MS, maxRuns: 2, beat: BEAT_MS, exit: 450 },
  again: { run: RUN_MS, maxRuns: 1, beat: BEAT_MS, exit: 350 },
  /** no motion: nothing to finish, keep it brief */
  reduced: { run: 300, maxRuns: 1, beat: 0, exit: 150 },
} as const;

type HeartMode = "loop" | "beat" | "still";

type SiteSplashProps = {
  name: string;
  /** Kept for callers; the splash now draws its own heart mark. */
  oshiMark?: string;
  /** Called when splash finishes or is skipped (safe to restore scroll). */
  onFinished?: () => void;
  /** Called once the overlay covers the page — a `/#section` link can scroll there underneath it. */
  onCovered?: () => void;
};

/** Hero name font + main art ready (first visit only). */
function heroReady(): Promise<void> {
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  const img = document.querySelector<HTMLImageElement>("[data-hero-tilt] img");
  const art = !img || img.complete ? Promise.resolve() : img.decode().catch(() => undefined);
  return Promise.all([fonts, art]).then(() => undefined);
}

/** loop: beating while the ECG draws · beat: one last bounce, line full · still: line full, no motion */
function SplashHeart({ mode }: { mode: HeartMode }) {
  const drawing = mode === "loop";
  return (
    <svg
      viewBox="0 0 100 92"
      aria-hidden
      className={cn(
        "h-[77px] w-[84px] overflow-visible sm:h-[99px] sm:w-[108px]",
        mode === "loop" && "animate-splash-heartbeat",
        mode === "beat" && "animate-splash-final-beat"
      )}
      style={mode === "beat" ? { animationDuration: `${BEAT_MS}ms` } : undefined}
    >
      <path
        d={HEART_PATH}
        fill="color-mix(in srgb, var(--r-pri) 14%, transparent)"
        stroke="var(--r-pri)"
        strokeWidth="3"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--r-pri) 60%, transparent))" }}
      />
      <path
        d={HEART_ECG_PATH}
        fill="none"
        stroke="var(--r-nurse)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1000}
        className={drawing ? "animate-splash-ecg-loop" : undefined}
        style={{ strokeDasharray: 1000, strokeDashoffset: drawing ? 1000 : 0, animationDuration: `${RUN_MS}ms` }}
      />
    </svg>
  );
}

export function SiteSplash({ name, onFinished, onCovered }: SiteSplashProps) {
  // Start covered — avoid one-frame flash of page content before mount effect.
  const [phase, setPhase] = useState<"hold" | "beat" | "exit" | "done">("hold");
  const [animate, setAnimate] = useState(false);
  const [exitMs, setExitMs] = useState<number>(TIMING.first.exit);

  // Layout effect: the skip must land before first paint or the "hold" overlay flashes on in-app returns.
  useLayoutEffect(() => {
    // Skip splash on in-app back / Link navigation — only show on fresh tab open or reload
    if (wasSoftNavigation() && !isReloadNavigation()) {
      // sessionStorage/navigation timing are client-only, so this can't be initial state without a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("done");
      onFinished?.();
      return;
    }

    let visited = false;
    try {
      visited = localStorage.getItem(VISITED_KEY) === "1";
    } catch {
      /* ignore */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // `/#live` etc.: they came for a section, not the hero — short splash, and the
    // full one is kept for their first plain visit.
    const deepLink = window.location.hash.length > 1;
    const first = !visited && !deepLink;
    const t = reduced ? TIMING.reduced : first ? TIMING.first : TIMING.again;

    markSplashShowing();
    setPhase("hold");
    setAnimate(!reduced);
    setExitMs(t.exit);
    onCovered?.();

    let cancelled = false;
    const timers: number[] = [];

    let ready = !(first && !reduced);
    if (!ready) void heroReady().then(() => (ready = true));

    // end of each run: fade if the hero is ready (or out of runs), else run once more
    let runs = 0;
    const endOfRun = () => {
      if (cancelled) return;
      runs += 1;
      if (!ready && runs < t.maxRuns) {
        timers.push(window.setTimeout(endOfRun, t.run));
        return;
      }
      // line done → one more bounce → fade
      if (t.beat > 0) {
        setPhase("beat");
        timers.push(window.setTimeout(fade, t.beat));
      } else {
        fade();
      }
    };
    const fade = () => {
      if (cancelled) return;
      setPhase("exit");
      markSplashExit(); // hero intro starts with the fade
      timers.push(
        window.setTimeout(() => {
          setPhase("done");
          if (!deepLink) {
            try {
              localStorage.setItem(VISITED_KEY, "1");
            } catch {
              /* ignore */
            }
          }
          onFinished?.();
        }, t.exit)
      );
    };
    timers.push(window.setTimeout(endOfRun, t.run));

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      markSplashExit(); // never leave the hero waiting
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={cn(
        heroNameFont.variable,
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-r-bg",
        "transition-opacity ease-out",
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${exitMs}ms` }}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "exit"}
      aria-label="กำลังโหลด"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          "bg-[radial-gradient(circle_at_50%_44%,color-mix(in_srgb,var(--r-pri)_20%,transparent),transparent_45%),radial-gradient(circle_at_50%_100%,color-mix(in_srgb,var(--r-acc)_10%,transparent),transparent_50%)]",
          "sm:bg-[radial-gradient(circle_at_50%_44%,color-mix(in_srgb,var(--r-pri)_20%,transparent),transparent_38%),radial-gradient(circle_at_50%_100%,color-mix(in_srgb,var(--r-acc)_10%,transparent),transparent_50%)]"
        )}
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <SplashHeart mode={!animate ? "still" : phase === "hold" ? "loop" : phase === "beat" ? "beat" : "still"} />

        <p className="mt-5 font-r-name text-[44px] leading-none font-bold text-r-text sm:mt-6 sm:text-[56px]">
          {name}
        </p>

        <p className="mt-3 max-w-xs text-[13px] text-r-text-2/85 sm:text-[15px]">
          กำลังรักษาหัวใจคุณ…
        </p>

        <span
          aria-hidden
          className="relative mt-[22px] h-0.5 w-[140px] overflow-hidden rounded-full bg-r-text/10 sm:mt-7 sm:w-[180px]"
        >
          {animate ? (
            <span
              className="animate-splash-shimmer absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,var(--r-pri),transparent)]"
              style={{ animationDuration: `${RUN_MS}ms` }}
            />
          ) : null}
        </span>
      </div>
    </div>
  );
}
