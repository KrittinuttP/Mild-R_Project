"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";

import { KEYHOLE } from "@/components/cafe/board/brass";
import { gsap } from "@/lib/gsap";

type Geometry = { x: number; y: number; w: number; h: number; reach: number };

type KeyholeCurtainProps = {
  /** Start the exit. Until then nothing is drawn (the splash paints its own room). */
  open: boolean;
  /**
   * The splash. Its `[data-keyhole]` (the I of the wordmark) is where the
   * room opens, and its `[data-splash-content]` parts fade away first.
   */
  sourceRef: RefObject<HTMLElement | null>;
  /** The keyhole starts letting the page through: start the page's own opening now. */
  onReveal?: () => void;
  /** The room is gone. */
  onDone: () => void;
};

/**
 * Splash exit through the keyhole of the Sherlock Sweetie mark: the room goes
 * dark except that keyhole, which glows, becomes a hole onto the page behind
 * and opens until the page fills the screen.
 *
 * Cheap on phones: one SVG whose mask holds the keyhole; only that keyhole's
 * scale changes (written straight into its transform), the room never moves.
 * Callers keep their old fade for reduced motion and never mount this then.
 */
export function KeyholeCurtain({ open, sourceRef, onReveal, onDone }: KeyholeCurtainProps) {
  const ids = useId();
  const maskId = `${ids}-mask`;
  const glowId = `${ids}-glow`;
  const [geo, setGeo] = useState<Geometry | null>(null);
  const dimRef = useRef<SVGRectElement>(null);
  const holeRef = useRef<SVGGElement>(null);
  const rimRef = useRef<SVGGElement>(null);
  const glyphRef = useRef<SVGSVGElement>(null);
  const reveal = useRef(onReveal);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    reveal.current = onReveal;
    done.current = onDone;
  }, [onReveal, onDone]);

  // Measure the keyhole letter the moment the exit starts.
  useLayoutEffect(() => {
    if (!open) return;
    const keyhole = sourceRef.current?.querySelector<SVGElement>("[data-keyhole]");
    const box = keyhole?.getBoundingClientRect();
    if (!box || box.height < 1) {
      reveal.current?.();
      done.current();
      return;
    }
    // Scale at which the keyhole covers the whole screen from where it sits.
    const far = Math.hypot(
      Math.max(box.left, window.innerWidth - box.left),
      Math.max(box.top, window.innerHeight - box.top)
    );
    setGeo({
      x: box.left,
      y: box.top,
      w: box.width,
      h: box.height,
      // Keyhole units: the stem is ~11 wide either side of its axis, so at
      // 0.12 px per unit times the farthest corner it clears the screen.
      reach: (far * 0.12) / (box.height / 148),
    });
  }, [open, sourceRef]);

  useEffect(() => {
    if (!geo) return;
    const content = sourceRef.current
      ? gsap.utils.toArray<HTMLElement>("[data-splash-content]", sourceRef.current)
      : [];
    const k0 = geo.h / 148;
    const state = { k: 0 };
    const apply = () => {
      const value = `scale(${state.k.toFixed(4)})`;
      holeRef.current?.setAttribute("transform", value);
      rimRef.current?.setAttribute("transform", value);
    };

    const timeline = gsap
      .timeline({ onComplete: () => done.current() })
      // Lights down: everything but the keyhole goes.
      .to(content, { opacity: 0, duration: 0.25, ease: "power1.in" }, 0)
      .to(dimRef.current, { opacity: 0.72, duration: 0.3, ease: "power1.in" }, 0)
      .to(
        glyphRef.current,
        {
          scale: 1.18,
          duration: 0.22,
          ease: "power2.out",
          filter: "drop-shadow(0 0 10px rgba(233,217,166,.9))",
          transformOrigin: "50% 55%",
        },
        0.08
      )
      // The letter turns into a hole onto the page.
      .call(
        () => {
          state.k = k0 * 1.18;
          apply();
          reveal.current?.();
        },
        undefined,
        0.35
      )
      .to(glyphRef.current, { opacity: 0, duration: 0.12 }, 0.35)
      .to(state, { k: k0 * 1.45, duration: 0.25, ease: "power2.out", onUpdate: apply }, 0.36)
      .to(state, { k: k0 * geo.reach, duration: 0.65, ease: "power3.in", onUpdate: apply }, 0.66);

    return () => {
      timeline.kill();
    };
  }, [geo, sourceRef]);

  if (!open || !geo) return null;

  const cx = geo.x + geo.w / 2;
  const cy = geo.y + geo.h * (80 / 148);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="45%" r="72%">
            <stop offset="0" stopColor="var(--color-cafe-glow)" />
            <stop offset="1" stopColor="var(--color-cafe-ground)" />
          </radialGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-20000" y="-20000" width="40000" height="40000">
            <rect x="-20000" y="-20000" width="40000" height="40000" fill="#fff" />
            <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
              <g ref={holeRef} transform="scale(0)">
                <path d={KEYHOLE} transform="translate(-32 -80)" fill="#000" />
              </g>
            </g>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${glowId})`} mask={`url(#${maskId})`} />
        <rect
          ref={dimRef}
          width="100%"
          height="100%"
          fill="#050e0b"
          opacity={0}
          mask={`url(#${maskId})`}
        />
        <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
          <g ref={rimRef} transform="scale(0)">
            <path
              d={KEYHOLE}
              transform="translate(-32 -80)"
              fill="none"
              className="stroke-cafe-gold"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>
      </svg>
      {/* The I of the wordmark, left lit while the rest of the room goes dark. */}
      <svg
        ref={glyphRef}
        viewBox="0 0 64 148"
        className="absolute fill-cafe-gold"
        style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h }}
      >
        <path
          fillRule="evenodd"
          d={`${KEYHOLE} M28 52.17 A10 10 0 1 1 36 52.17 L40 92 H24 Z`}
        />
      </svg>
    </div>
  );
}
