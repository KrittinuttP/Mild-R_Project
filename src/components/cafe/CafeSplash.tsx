"use client";

import { useEffect, useState } from "react";

import {
  isReloadNavigation,
  wasSoftNavigation,
} from "@/components/layout/SoftNavMarker";
import { cn } from "@/lib/utils";

const CAFE_VISITED_KEY = "mild-r-cafe-splash-seen";

type CafeSplashProps = {
  masthead: string;
  kicker?: string;
  caseNo?: string;
  /** Preload hero art while splash is up */
  heroImage?: string;
  onFinished?: () => void;
};

export function CafeSplash({
  masthead,
  kicker = "SPECIAL EDITION",
  caseNo,
  heroImage,
  onFinished,
}: CafeSplashProps) {
  const [phase, setPhase] = useState<"boot" | "hold" | "exit" | "done" | null>(
    null
  );
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    if (wasSoftNavigation() && !isReloadNavigation()) {
      setPhase("done");
      onFinished?.();
      return;
    }

    let visited = false;
    try {
      visited = sessionStorage.getItem(CAFE_VISITED_KEY) === "1";
    } catch {
      /* ignore */
    }
    const first = !visited;
    setIsFirstVisit(first);
    setPhase("boot");

    if (heroImage) {
      const img = new Image();
      img.src = heroImage;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const holdMs = reduced ? 350 : first ? 1200 : 800;
    const exitMs = reduced ? 180 : 500;

    const holdTimer = window.setTimeout(() => setPhase("hold"), 30);
    const exitTimer = window.setTimeout(() => setPhase("exit"), holdMs);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(CAFE_VISITED_KEY, "1");
      } catch {
        /* ignore */
      }
      onFinished?.();
    }, holdMs + exitMs);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (phase === null || phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  if (phase === null || phase === "done") return null;

  const revealed = phase === "hold" || phase === "exit";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0c0e]",
        "transition-opacity duration-500 ease-out",
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "exit"}
      aria-label="กำลังเปิดแฟ้มเคสคาเฟ่"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(168,77,95,0.16),transparent_55%)]"
        aria-hidden
      />

      <div
        className={cn(
          "relative flex max-w-md flex-col items-center px-6 text-center",
          "transition-all duration-500 ease-out",
          revealed
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-95 opacity-0"
        )}
      >
        <div className="w-full max-w-xs space-y-1" aria-hidden>
          <div className="border-t-2 border-[#9a7b5a]/45" />
          <div className="border-t border-[#9a7b5a]/30" />
        </div>

        <p className="mt-5 text-[0.62rem] tracking-[0.32em] text-[#c46a7a] uppercase">
          {kicker}
        </p>

        <p className="mt-3 font-[family-name:var(--font-cafe-serif)] text-2xl tracking-[0.04em] text-[#f4ebe3] italic sm:text-3xl">
          {masthead}
        </p>

        {caseNo ? (
          <p className="mt-2 text-[0.62rem] tracking-[0.22em] text-[#9a7b5a] uppercase">
            {caseNo}
          </p>
        ) : null}

        <span
          className={cn(
            "mt-6 block text-[#a84d5f]/80",
            isFirstVisit &&
              revealed &&
              phase !== "exit" &&
              "animate-heart-pulse-soft"
          )}
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="mx-auto size-8 fill-current sm:size-9"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>

        <p className="mt-4 font-[family-name:var(--font-cafe-serif)] text-sm tracking-wide text-[#c4b8a8] sm:text-base">
          Opening case file…
        </p>

        <div
          className="mt-7 h-px w-32 overflow-hidden bg-[#9a7b5a]/25"
          aria-hidden
        >
          <div
            className={cn(
              "h-full bg-[#a84d5f]",
              revealed &&
                (isFirstVisit
                  ? "animate-splash-bar-long"
                  : "animate-splash-bar")
            )}
          />
        </div>
      </div>
    </div>
  );
}
