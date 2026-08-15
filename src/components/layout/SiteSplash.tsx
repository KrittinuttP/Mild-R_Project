"use client";

import { useEffect, useState } from "react";

import {
  isReloadNavigation,
  wasSoftNavigation,
} from "@/components/layout/SoftNavMarker";
import { cn } from "@/lib/utils";

const VISITED_KEY = "mild-r-has-visited";

const ECG_PATH =
  "M0 28 H28 L36 28 L42 18 L48 38 L56 28 H92 L100 28 L106 8 L114 48 L122 28 H168 L176 28 L182 16 L188 40 L196 28 H320";

type SiteSplashProps = {
  name: string;
  oshiMark: string;
  /** Called when splash finishes or is skipped (safe to restore scroll). */
  onFinished?: () => void;
};

type EcgFill = "idle" | "short" | "long" | "static";

function SplashEcg({ fill }: { fill: EcgFill }) {
  const animate = fill === "short" || fill === "long";

  return (
    <svg
      viewBox="0 0 320 56"
      preserveAspectRatio="none"
      aria-hidden
      className="h-10 w-44 text-[#e85a7a] sm:h-11 sm:w-52"
    >
      <path
        d={ECG_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.32"
      />
      <path
        d={ECG_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1000}
        className={
          fill === "long"
            ? "animate-splash-ecg-long"
            : fill === "short"
              ? "animate-splash-ecg"
              : undefined
        }
        style={{
          strokeDasharray: 1000,
          strokeDashoffset: fill === "static" ? 0 : animate || fill === "idle" ? 1000 : 0,
          filter: "drop-shadow(0 0 5px rgba(232, 90, 122, 0.75))",
        }}
      />
    </svg>
  );
}

export function SiteSplash({ name, oshiMark, onFinished }: SiteSplashProps) {
  // Start covered — avoid one-frame flash of page content before mount effect.
  const [phase, setPhase] = useState<"hold" | "exit" | "done">("hold");
  const [ecgFill, setEcgFill] = useState<EcgFill>("idle");
  const [pulseHeart, setPulseHeart] = useState(false);

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
    setPhase("hold");

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setPulseHeart(first && !reduced);
    setEcgFill(reduced ? "static" : first ? "long" : "short");

    const holdMs = reduced ? 400 : first ? 1800 : 900;
    const exitMs = reduced ? 200 : 700;

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
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
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

      <div className="relative flex flex-col items-center px-6 text-center">
        <span
          className={cn(
            "text-4xl sm:text-5xl",
            pulseHeart && phase !== "exit" && "animate-splash-heartbeat"
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

        <div className="mt-8" aria-hidden>
          <SplashEcg key={ecgFill} fill={ecgFill} />
        </div>
      </div>
    </div>
  );
}
