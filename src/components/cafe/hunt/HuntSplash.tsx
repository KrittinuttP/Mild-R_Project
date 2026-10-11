"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/** Length of the thread path below, in SVG units (a little over). */
const THREAD_LENGTH = 380;

const PIN =
  "absolute top-[4%] size-4 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd0db,#e85a7a_55%,#a8323f)] shadow-[0_0_12px_rgba(232,90,122,0.8)]";

type HuntSplashProps = {
  title: string;
  cafeTitle: string;
  caseNo?: string;
  count: number;
  onFinished: () => void;
};

/**
 * Preload for the evidence hunt — same dark room and thread as the cafe
 * splash, plus one stamp per piece of evidence. The caller shows it only on
 * the first visit: every QR scan opens a new tab, so replaying it per tab
 * would mean five preloads in one hunt.
 */
export function HuntSplash({
  title,
  cafeTitle,
  caseNo,
  count,
  onFinished,
}: HuntSplashProps) {
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const holdMs = reduced ? 400 : 2000;
    const exitMs = reduced ? 160 : 450;

    const frame = window.requestAnimationFrame(() => setStarted(true));
    const leave = window.setTimeout(() => setLeaving(true), holdMs);
    const done = window.setTimeout(onFinished, holdMs + exitMs);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(leave);
      window.clearTimeout(done);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] overflow-hidden bg-[#0a0c0e] text-[#f4ebe3]",
        "transition-opacity duration-500 ease-out motion-reduce:duration-150",
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
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
      aria-label="กำลังเปิดสมุดสะสมหลักฐาน"
    >
      <div
        className="animate-cafe-splash-swing absolute top-0 left-1/2 size-0 origin-top-left"
        aria-hidden
      >
        <div
          className="absolute left-[max(-470px,-80vw)] h-[90vh] w-[min(940px,160vw)] [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]"
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
        <p className="font-[family-name:var(--font-cafe-type)] text-[13px] tracking-[0.2em] text-[#c4a882] uppercase">
          Evidence Hunt
        </p>
        <p className="mt-2.5 font-[family-name:var(--font-cafe-hand)] text-[40px] leading-[1.2] text-[#f4ebe3] sm:text-5xl">
          {title}
        </p>
        <p className="mt-2 font-[family-name:var(--font-cafe-serif-italic)] text-[17px] font-semibold text-[#f3b8c4]">
          {cafeTitle}
        </p>
        {caseNo ? (
          <p className="mt-3.5 font-[family-name:var(--font-cafe-type)] text-xs tracking-[0.14em] text-[#c4a882]">
            {caseNo}
          </p>
        ) : null}

        <div className="mt-9 flex justify-center gap-3" aria-hidden>
          {Array.from({ length: count }, (_, index) => (
            <span
              key={index}
              className={cn(
                "flex size-[38px] items-center justify-center rounded-full border-2 border-[#e85a7a] font-[family-name:var(--font-cafe-type)] text-[13px] font-bold text-[#f3b8c4]",
                "transition-opacity duration-300 ease-out motion-reduce:transition-none",
                started ? "opacity-100" : "opacity-20"
              )}
              style={{ transitionDelay: `${200 + index * 250}ms` }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          ))}
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
                strokeDashoffset={started ? 0 : THREAD_LENGTH}
                className="transition-[stroke-dashoffset] duration-[1800ms] ease-out motion-reduce:transition-none"
                style={{ filter: "drop-shadow(0 0 4px rgba(232,90,122,0.85))" }}
              />
            </svg>
            <span className={cn(PIN, "left-0")} />
            <span className={cn(PIN, "right-0")} />
          </div>
          <p className="font-[family-name:var(--font-cafe-thai)] text-[15px] text-[#c4b8a8]">
            กำลังเปิดสมุดสะสมหลักฐาน…
          </p>
        </div>
      </div>
    </div>
  );
}
