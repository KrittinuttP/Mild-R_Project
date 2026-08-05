"use client";

import { useEffect, useState } from "react";

import {
  isReloadNavigation,
  wasSoftNavigation,
} from "@/components/layout/SoftNavMarker";
import { cn } from "@/lib/utils";

const VISITED_KEY = "mild-r-has-visited";

type SiteSplashProps = {
  name: string;
  oshiMark: string;
  /** Called when splash finishes or is skipped (safe to restore scroll). */
  onFinished?: () => void;
};

export function SiteSplash({ name, oshiMark, onFinished }: SiteSplashProps) {
  const [phase, setPhase] = useState<"boot" | "hold" | "exit" | "done" | null>(
    null
  );
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    // Skip splash on in-app back / Link navigation — only show on fresh tab open or reload
    if (wasSoftNavigation() && !isReloadNavigation()) {
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
    const first = !visited;
    setIsFirstVisit(first);
    setPhase("boot");

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const holdMs = reduced ? 400 : first ? 1800 : 900;
    const exitMs = reduced ? 200 : 700;

    const holdTimer = window.setTimeout(() => setPhase("hold"), 30);
    const exitTimer = window.setTimeout(() => setPhase("exit"), holdMs);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      try {
        localStorage.setItem(VISITED_KEY, "1");
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
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#140a0d]",
        "transition-opacity duration-700 ease-out",
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "exit"}
      aria-label="กำลังโหลด"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60",
          "bg-[radial-gradient(ellipse_at_50%_40%,rgba(232,90,122,0.22),transparent_55%)]"
        )}
      />

      <div
        className={cn(
          "relative flex flex-col items-center px-6 text-center",
          "transition-all duration-700 ease-out",
          revealed
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-95 opacity-0"
        )}
      >
        <span
          className={cn(
            "text-4xl sm:text-5xl",
            isFirstVisit && revealed && phase !== "exit" && "animate-splash-heartbeat"
          )}
          aria-hidden
        >
          {oshiMark}
        </span>

        <p className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[#fff5f7] sm:text-4xl">
          {name}
        </p>

        <p className="mt-3 max-w-xs text-sm tracking-wide text-[#f3b8c4]/80 sm:text-base">
          กำลังรักษาหัวใจคุณ…
        </p>

        <div
          className="mt-8 h-0.5 w-28 overflow-hidden rounded-full bg-[#f3b8c4]/15"
          aria-hidden
        >
          <div
            className={cn(
              "h-full rounded-full bg-[#e85a7a]",
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
