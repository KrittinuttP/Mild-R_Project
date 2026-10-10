"use client";

import { useEffect, useState, type CSSProperties } from "react";

import {
  isReloadNavigation,
  wasSoftNavigation,
} from "@/components/layout/SoftNavMarker";
import { cn } from "@/lib/utils";

const CAFE_VISITED_KEY = "mild-r-cafe-splash-seen";

/** Length of the thread path below, in SVG units (a little over, so it starts fully hidden). */
const THREAD_LENGTH = 380;

type CafeSplashProps = {
  title: string;
  titleLocal?: string;
  kicker?: string;
  caseNo?: string;
  /** Art the page shows first; the splash stays up until it has loaded (or times out). */
  preloadImage?: string;
  onFinished?: () => void;
};

type Phase = "hold" | "lit" | "exit" | "done";

/** How far the thread has been pulled (0–1) and how long the move to that point takes. */
type Thread = { value: number; ms: number };

function loadImage(src?: string) {
  return new Promise<void>((resolve) => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const PIN =
  "absolute top-[4%] size-4 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd0db,#e85a7a_55%,#a8323f)] shadow-[0_0_12px_rgba(232,90,122,0.8)]";

/**
 * Cafe entry overlay: a pendant lamp in a dark room. A thread is pulled from
 * pin to pin while the first art loads; when it arrives the lamp flickers on
 * and the overlay fades into the cork board.
 */
export function CafeSplash({
  title,
  titleLocal,
  kicker = "Unsolved Mystery Cafe",
  caseNo,
  preloadImage,
  onFinished,
}: CafeSplashProps) {
  // Start covered — avoid one-frame flash of cafe content before mount effect.
  const [phase, setPhase] = useState<Phase>("hold");
  const [thread, setThread] = useState<Thread>({ value: 0, ms: 0 });

  useEffect(() => {
    if (wasSoftNavigation() && !isReloadNavigation()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation / sessionStorage state only exists on the client
      setPhase("done");
      onFinished?.();
      return;
    }

    let cancelled = false;
    let visited = false;
    try {
      visited = sessionStorage.getItem(CAFE_VISITED_KEY) === "1";
    } catch {
      /* ignore */
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const minHoldMs = reduced ? 280 : visited ? 450 : 700;
    const maxWaitMs = reduced ? 450 : 2400;
    const arriveMs = reduced ? 0 : 250;
    const litMs = reduced ? 0 : 450;
    const exitMs = reduced ? 160 : 500;
    const started = Date.now();

    // While loading, the thread creeps most of the way and slows down; it only
    // reaches the far pin once the art is in (or the wait runs out).
    const creep = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setThread(
        reduced ? { value: 1, ms: 0 } : { value: 0.85, ms: maxWaitMs }
      );
    });

    const run = async () => {
      await Promise.race([loadImage(preloadImage), sleep(maxWaitMs)]);
      const elapsed = Date.now() - started;
      if (elapsed < minHoldMs) await sleep(minHoldMs - elapsed);
      if (cancelled) return;

      setThread({ value: 1, ms: arriveMs });
      await sleep(arriveMs);
      if (cancelled) return;

      setPhase("lit");
      await sleep(litMs);
      if (cancelled) return;

      setPhase("exit");
      await sleep(exitMs);
      if (cancelled) return;

      setPhase("done");
      try {
        sessionStorage.setItem(CAFE_VISITED_KEY, "1");
      } catch {
        /* ignore */
      }
      onFinished?.();
    };
    void run();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(creep);
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

  const lit = phase !== "hold";
  const arrived = thread.value >= 1;
  const ease = `${thread.ms}ms cubic-bezier(0.2, 0.7, 0.3, 1)`;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] overflow-hidden bg-[#0a0c0e] text-[#f4ebe3]",
        "transition-opacity duration-500 ease-out motion-reduce:duration-150",
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={
        {
          "--drop": "clamp(64px, 16vh, 150px)",
          backgroundImage:
            "linear-gradient(rgba(244,235,227,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(244,235,227,0.022) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
      aria-busy={phase === "hold"}
      aria-label="กำลังเปิดไฟห้องสืบสวน"
    >
      {/* Pendant lamp — swings from the ceiling; the cone of light swings with it. */}
      <div
        className="animate-cafe-splash-swing absolute top-0 left-1/2 size-0 origin-top-left"
        aria-hidden
      >
        <div
          className={cn(
            "absolute left-[max(-470px,-80vw)] h-[90vh] w-[min(940px,160vw)] [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]",
            lit ? "animate-cafe-splash-flicker opacity-100" : "opacity-50"
          )}
          style={{
            top: "calc(var(--drop) + 32px)",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(255,206,140,0.34), rgba(255,206,140,0.1) 45%, transparent 72%)",
          }}
        />
        <div
          className="absolute top-0 -left-px w-0.5 bg-[#5c4636]"
          style={{ height: "var(--drop)" }}
        />
        <svg
          viewBox="0 0 120 64"
          className="absolute -left-[60px] h-16 w-[120px] overflow-visible"
          style={{ top: "calc(var(--drop) - 10px)" }}
        >
          <path
            d="M8 52 Q60 -22 112 52 Z"
            fill="#1a1410"
            stroke="#5c4636"
            strokeWidth="2"
          />
          <rect
            x="52"
            y="2"
            width="16"
            height="10"
            fill="#2a1c12"
            stroke="#5c4636"
            strokeWidth="1.5"
          />
          <ellipse
            cx="60"
            cy="52"
            rx="24"
            ry="8"
            fill="#ffe2b0"
            style={{ filter: "drop-shadow(0 0 14px rgba(255,206,140,0.95))" }}
          />
        </svg>
      </div>

      <div
        className="relative flex h-full flex-col items-center px-6 text-center"
        style={{ paddingTop: "calc(var(--drop) + clamp(90px, 20vh, 190px))" }}
      >
        {/* The room brightens as the thread is pulled, then fully when the lamp comes on. */}
        <div
          className="flex flex-col items-center gap-3 sm:gap-3.5"
          style={{
            opacity: lit ? 1 : 0.45 + thread.value * 0.35,
            transition: `opacity ${lit ? "300ms ease-out" : ease}`,
          }}
        >
          <p className="flex flex-wrap items-center justify-center gap-x-3 font-[family-name:var(--font-cafe-type)] text-xs tracking-[0.14em] text-[#c4a882] uppercase sm:text-[13px]">
            <span>{kicker}</span>
            {caseNo ? (
              <>
                <span aria-hidden>/</span>
                <span>{caseNo}</span>
              </>
            ) : null}
          </p>
          <p className="font-[family-name:var(--font-cafe-type)] text-[27px] leading-[1.1] font-bold text-[#f4ebe3] sm:text-4xl lg:text-[46px] lg:leading-[1.05]">
            {title}
          </p>
          {titleLocal ? (
            <p className="font-[family-name:var(--font-cafe-hand)] text-[21px] leading-snug text-[#f3b8c4] sm:text-[26px]">
              {titleLocal}
            </p>
          ) : null}
        </div>

        <div className="mt-[clamp(24px,7vh,64px)] flex flex-col items-center gap-3">
          <div
            className="relative aspect-[360/48] w-[min(360px,70vw)]"
            aria-hidden
          >
            <svg
              viewBox="0 0 360 48"
              className="absolute inset-0 size-full overflow-visible"
            >
              <path
                d="M8 10 Q180 52 352 10"
                fill="none"
                stroke="rgba(154,123,90,0.4)"
                strokeWidth="1.5"
                strokeDasharray="3 7"
                strokeLinecap="round"
              />
              <path
                d="M8 10 Q180 52 352 10"
                fill="none"
                stroke="#e85a7a"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray={THREAD_LENGTH}
                strokeDashoffset={THREAD_LENGTH * (1 - thread.value)}
                style={{
                  filter: "drop-shadow(0 0 4px rgba(232,90,122,0.85))",
                  transition: `stroke-dashoffset ${ease}`,
                }}
              />
            </svg>
            <span className={cn(PIN, "left-0")} />
            <span
              className={cn(
                PIN,
                "right-0 transition duration-200 ease-out",
                arrived ? "scale-100 opacity-100" : "scale-75 opacity-25"
              )}
            />
          </div>
          <p className="font-[family-name:var(--font-cafe-thai)] text-[15px] text-[#c4b8a8]">
            กำลังเปิดไฟห้องสืบสวน…
          </p>
        </div>
      </div>
    </div>
  );
}
