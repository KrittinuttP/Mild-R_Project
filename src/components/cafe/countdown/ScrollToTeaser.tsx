"use client";

import { useEffect, useState } from "react";

import { THAI } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

type ScrollToTeaserProps = {
  /** id of the teaser section to watch and scroll to. */
  targetId: string;
};

/**
 * CD2 hint pinned to the bottom centre of the screen. On most laptop screens the
 * logo and timer fill the first view, so nothing says a video waits below.
 * Shown only while the teaser is still under the fold; fades out once it
 * scrolls into view, and stays hidden on screens that already show it.
 */
export function ScrollToTeaser({ targetId }: ScrollToTeaserProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    // Watch the section heading, not the section box: the box starts a few
    // pixels above the heading. The bottom margin keeps out the strip the
    // hint itself sits in, so a heading hidden behind the hint still counts
    // as not seen yet.
    const heading = target.querySelector("h2") ?? target;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
      },
      { rootMargin: "0px 0px -72px 0px" }
    );
    observer.observe(heading);
    return () => observer.disconnect();
  }, [targetId]);

  function scrollToTeaser() {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById(targetId)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToTeaser}
      inert={!show}
      className={cn(
        "fixed bottom-[clamp(10px,1.2svh,24px)] left-1/2 z-20 -translate-x-1/2 px-4 py-1 text-cafe-gold transition-[opacity,color] duration-500 hover:text-cafe-gold-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-gold",
        show ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {/* Text and arrow bob together; kept off the button, whose centring uses `translate` too. */}
      <span className="flex animate-cafe-nudge flex-col items-center gap-0.5">
        <span
          className={cn(
            THAI,
            "text-[length:clamp(13px,1vw,15px)] whitespace-nowrap text-cafe-cream/90",
          )}
        >
          เลื่อนลงไปดูทีเซอร์แรก
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="size-[clamp(18px,1.5vw,22px)] fill-none stroke-current stroke-[1.5]"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>
  );
}
