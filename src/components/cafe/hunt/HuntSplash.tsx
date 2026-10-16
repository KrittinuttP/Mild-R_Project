"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { KEYHOLE } from "@/components/cafe/board/brass";
import { KeyholeCurtain } from "@/components/cafe/KeyholeCurtain";
import { KeyholeSlot, WaxSeal } from "@/components/cafe/hunt/HuntFrame";
import { cn } from "@/lib/utils";

type HuntSplashProps = {
  title: string;
  cafeTitle: string;
  caseNo?: string;
  count: number;
  onFinished: () => void;
};

/**
 * Preload for the evidence hunt — same lamp-lit green room as the cafe
 * splash; one wax seal per piece of evidence presses in while it loads. The caller shows it only on
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
  /** Leaving through the keyhole (not with reduced motion: that keeps the fade). */
  const [opening, setOpening] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const holdMs = reduced ? 400 : 2000;
    const exitMs = reduced ? 160 : 450;

    const frame = window.requestAnimationFrame(() => setStarted(true));
    const leave = window.setTimeout(
      () => (reduced ? setLeaving(true) : setOpening(true)),
      holdMs
    );
    // With motion, `KeyholeCurtain` calls `onFinished` when the page is in view.
    const done = reduced
      ? window.setTimeout(onFinished, holdMs + exitMs)
      : undefined;

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
      ref={rootRef}
      className={cn(
        "fixed inset-0 z-[100] overflow-hidden text-cafe-cream",
        opening ? "bg-transparent" : "bg-cafe-ground",
        "transition-opacity duration-500 ease-out motion-reduce:duration-150",
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={
        {
          "--drop": "clamp(64px, 16vh, 150px)",
          backgroundImage: opening
            ? "none"
            : "radial-gradient(ellipse at 50% 45%, var(--color-cafe-glow) 0%, var(--color-cafe-ground) 72%)",
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
      aria-label={`กำลังเปิด${title}`}
    >
      <KeyholeCurtain open={opening} sourceRef={rootRef} onDone={onFinished} />

      <div
        data-splash-content
        className="animate-cafe-splash-swing absolute top-0 left-1/2 size-0 origin-top-left"
        aria-hidden
      >
        <div
          className="absolute left-[max(-470px,-80vw)] h-[90vh] w-[min(940px,160vw)] [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]"
          style={{
            top: "calc(var(--drop) + 32px)",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(227,199,126,0.32), rgba(227,199,126,0.08) 45%, transparent 72%)",
          }}
        />
        <div
          className="absolute top-0 -left-px w-0.5 bg-cafe-gold/50"
          style={{ height: "var(--drop)" }}
        />
        <svg
          viewBox="0 0 120 64"
          className="absolute -left-[60px] h-16 w-[120px] overflow-visible"
          style={{ top: "calc(var(--drop) - 10px)" }}
        >
          <path
            d="M8 52 Q60 -22 112 52 Z"
            className="fill-cafe-void stroke-cafe-gold/70"
            strokeWidth="2"
          />
          <rect
            x="52"
            y="2"
            width="16"
            height="10"
            className="fill-cafe-void stroke-cafe-gold/70"
            strokeWidth="1.5"
          />
          <ellipse
            cx="60"
            cy="52"
            rx="24"
            ry="8"
            className="fill-cafe-gold-pale"
            style={{ filter: "drop-shadow(0 0 14px rgba(227,199,126,0.95))" }}
          />
        </svg>
      </div>

      <div
        data-splash-content
        className="relative flex h-full flex-col items-center px-6 text-center"
        style={{ paddingTop: "calc(var(--drop) + clamp(70px, 16vh, 160px))" }}
      >
        {/* The brass keyhole the book opens through. */}
        <svg
          data-keyhole
          viewBox="0 0 64 148"
          className="mb-4 h-10 w-auto fill-cafe-gold"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d={`${KEYHOLE} M28 52.17 A10 10 0 1 1 36 52.17 L40 92 H24 Z`}
          />
        </svg>
        <p className="font-[family-name:var(--font-cafe-serif)] text-[11px] font-bold tracking-[0.22em] text-cafe-gold uppercase sm:text-xs">
          Evidence Hunt{caseNo ? ` · ${caseNo}` : ""}
        </p>
        <p className="mt-2.5 text-[40px] leading-[1.2] font-bold text-cafe-cream sm:text-5xl">
          {title}
        </p>
        <p className="mt-1.5 font-[family-name:var(--font-cafe-serif)] text-[15px] font-bold tracking-[0.04em] text-cafe-gold-soft">
          {cafeTitle}
        </p>

        <div className="mt-11 flex justify-center gap-3" aria-hidden>
          {Array.from({ length: count }, (_, index) => (
            <span key={index} className="relative size-10">
              <KeyholeSlot className="absolute inset-0 border-cafe-gold/45" />
              <span
                className={cn(
                  "absolute inset-0 transition duration-300 ease-out motion-reduce:transition-none",
                  started ? "scale-100 opacity-100" : "scale-125 opacity-0"
                )}
                style={{ transitionDelay: `${300 + index * 280}ms` }}
              >
                <WaxSeal
                  label={String(index + 1).padStart(2, "0")}
                  top=""
                  turn={[-10, 7, -4, 11, -7][index % 5]}
                  className="size-full"
                />
              </span>
            </span>
          ))}
        </div>

        <p className="mt-6 text-[15px] text-cafe-muted">
          กำลังเปิด{title}…
        </p>
      </div>
    </div>
  );
}
