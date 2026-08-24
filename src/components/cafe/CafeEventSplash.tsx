"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CafeEventSplashProps = {
  title: string;
  titleLocal?: string;
  /** Panel art to prefetch before the comic starts */
  images?: string[];
  onFinished?: () => void;
};

function preloadImages(urls: string[]) {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        })
    )
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Overlay shown on every visit to `/cafe/event` while panel art preloads. */
export function CafeEventSplash({
  title,
  titleLocal,
  images = [],
  onFinished,
}: CafeEventSplashProps) {
  const [phase, setPhase] = useState<"hold" | "exit" | "done">("hold");

  useEffect(() => {
    let cancelled = false;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const minHoldMs = reduced ? 280 : 700;
    const maxWaitMs = reduced ? 450 : 2400;
    const exitMs = reduced ? 160 : 450;
    const started = Date.now();

    const finish = async () => {
      const elapsed = Date.now() - started;
      if (elapsed < minHoldMs) await sleep(minHoldMs - elapsed);
      if (cancelled) return;
      setPhase("exit");
      await sleep(exitMs);
      if (cancelled) return;
      setPhase("done");
      onFinished?.();
    };

    const urls = images.filter(Boolean);
    Promise.race([preloadImages(urls), sleep(maxWaitMs)]).then(finish);

    return () => {
      cancelled = true;
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
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0c0e]",
        "transition-opacity duration-500 ease-out",
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "exit"}
      aria-label="กำลังเปิดแฟ้มคดี"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(168,77,95,0.16),transparent_55%)]"
        aria-hidden
      />

      <div className="relative flex max-w-md flex-col items-center px-6 text-center">
        <div className="w-full max-w-xs space-y-1" aria-hidden>
          <div className="border-t-2 border-[#9a7b5a]/45" />
          <div className="border-t border-[#9a7b5a]/30" />
        </div>

        <p className="mt-5 text-[0.62rem] tracking-[0.32em] text-[#c46a7a] uppercase">
          Case File
        </p>

        <p className="mt-3 font-[family-name:var(--font-cafe-serif)] text-2xl tracking-[0.04em] text-[#f4ebe3] italic sm:text-3xl">
          {title}
        </p>

        {titleLocal ? (
          <p className="mt-2 text-sm text-[#c4b8a8]">{titleLocal}</p>
        ) : null}

        <span
          className={cn(
            "mt-6 block text-[#a84d5f]/80",
            phase !== "exit" && "animate-heart-pulse-soft"
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
          <div className="h-full w-0 animate-splash-bar-long bg-[#a84d5f]" />
        </div>
      </div>
    </div>
  );
}
