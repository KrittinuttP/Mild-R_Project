"use client";

import type { RefObject } from "react";

import { gsap, registerGsapPlugins, ScrollTrigger, useGSAP } from "@/lib/gsap";

registerGsapPlugins();

/** Set by `CafeEntry` once the splash is gone, so the board opens on a visible page. */
export const CAFE_ENTRY_READY_EVENT = "cafe:entry-ready";

/** Replays the opening without a reload — for checking the motion by hand or in a test. */
export const CAFE_REPLAY_EVENT = "cafe:replay-opening";

/** Hand the element back to its CSS (tilt, hover, transition) once a tween ends. */
const CLEAR = "transform,opacity,visibility,transition";

/** Cards keep their resting tilt in `--tilt`; tweens must land on it. */
function tiltOf(el: Element) {
  const value = parseFloat(getComputedStyle(el).getPropertyValue("--tilt"));
  return Number.isFinite(value) ? value : 0;
}

/** Pins the hero's gold thread is tied to (see `THREAD_ROUTES` in CafeOverview). */
const THREAD_ANCHORS = new Set(["heart", "lock", "lock-m", "venue"]);

function dropPin(card: Element, at: number, timeline?: gsap.core.Timeline) {
  const pin = card.querySelector<HTMLElement>("[data-pin]");
  if (!pin) return;
  // A pin holding the thread must not move on its own: the thread follows it
  // every frame, so any drop shows as a jolt. It rides its card and fades in.
  const anchor = THREAD_ANCHORS.has(pin.dataset.pin ?? "");
  // Other brass is set into the paper: a soft fade and short drop, no overshoot.
  const from = anchor ? { autoAlpha: 0 } : { autoAlpha: 0, y: -12, scale: 1.12 };
  const to = {
    autoAlpha: 1,
    ...(anchor ? {} : { y: 0, scale: 1 }),
    duration: anchor ? 0.3 : 0.4,
    ease: anchor ? "power1.out" : "power3.out",
    clearProps: "transform,opacity,visibility",
  };
  if (timeline) timeline.fromTo(pin, from, to, at);
  else gsap.fromTo(pin, from, { ...to, delay: at });
}

/**
 * `requestAnimationFrame` stops in a hidden document (background tab, embedded
 * preview pane), which would freeze GSAP with the board still hidden. While
 * hidden, keep time moving with a slow timer so every tween still finishes.
 */
function keepTimeWhileHidden() {
  let timer: number | undefined;

  const stop = () => {
    if (timer === undefined) return;
    window.clearInterval(timer);
    timer = undefined;
    gsap.ticker.lagSmoothing(500, 33);
  };

  const sync = () => {
    if (!document.hidden) {
      stop();
      return;
    }
    if (timer !== undefined) return;
    // No lag smoothing: each tick must cover the real time that passed.
    gsap.ticker.lagSmoothing(0);
    timer = window.setInterval(() => {
      gsap.ticker.tick();
      ScrollTrigger.update();
    }, 200);
  };

  sync();
  document.addEventListener("visibilitychange", sync);
  return () => {
    document.removeEventListener("visibilitychange", sync);
    stop();
  };
}

/**
 * A lens travels along the wordmark ahead of its reveal, then shrinks into the
 * O of SHERLOCK (the logo's own lens, `data-lens`). The travelling copy is a
 * clone placed beside the title, so the title's clip-path does not cut it.
 */
function lensSweep(
  title: HTMLElement,
  timeline: gsap.core.Timeline,
  at: number
) {
  const lens = title.querySelector<SVGElement>("[data-lens]");
  const host = title.parentElement;
  if (!lens || !host) return;

  host.querySelector("[data-lens-rover]")?.remove();
  const rover = lens.cloneNode(true) as SVGElement;
  rover.removeAttribute("data-lens");
  rover.setAttribute("data-lens-rover", "");
  rover.setAttribute("aria-hidden", "true");
  Object.assign(rover.style, {
    position: "absolute",
    left: "0",
    top: "0",
    margin: "0",
    pointerEvents: "none",
    visibility: "hidden",
    zIndex: "5",
  });
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.appendChild(rover);

  // Measured when the sweep starts: the board is laid out by then.
  const geometry = () => {
    const box = host.getBoundingClientRect();
    const word = title.getBoundingClientRect();
    const o = lens.getBoundingClientRect();
    const size = o.height * 1.3;
    return {
      size,
      startX: word.left - box.left - size * 0.6,
      // Stops just short of the right edge so it never hangs off the board.
      endX: word.right - box.left - size * 0.75,
      y: o.top - box.top + o.height / 2 - size / 2,
      oX: o.left - box.left + o.width / 2 - size / 2,
      scale: o.height / size,
    };
  };
  let g = geometry();
  timeline
    .call(
      () => {
        g = geometry();
        gsap.set(rover, {
          width: g.size * (124 / 148),
          height: g.size,
          x: g.startX,
          y: g.y,
          scale: 1,
          autoAlpha: 1,
        });
        gsap.set(lens, { autoAlpha: 0 });
      },
      undefined,
      at
    )
    .to(rover, { x: () => g.endX, duration: 1.0, ease: "power2.inOut" }, at)
    .to(
      rover,
      {
        x: () => g.oX + (g.size - g.size * (124 / 148)) / 2,
        scale: () => g.scale,
        transformOrigin: "50% 50%",
        duration: 0.28,
        ease: "power2.out",
      },
      at + 1.0
    )
    .set(rover, { autoAlpha: 0 }, at + 1.3)
    .set(lens, { clearProps: "opacity,visibility" }, at + 1.3)
    // Found it: the lens (heart inside) gives one beat in its place.
    .fromTo(
      lens,
      { scale: 1 },
      {
        keyframes: [
          { scale: 1.18, duration: 0.14 },
          { scale: 1, duration: 0.3 },
        ],
        transformOrigin: "50% 50%",
        clearProps: "transform",
      },
      at + 1.32
    );
}

/**
 * Board motion for `/cafe`: one opening timeline for the felt board, then
 * play-once reveals as each lower section scrolls in. Idle loops are CSS
 * (`animate-cafe-*`); hover is plain transitions.
 *
 * Targets are marked with `data-motion` in the section components.
 */
export function useBoardMotion(rootRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const markReady = () => root.setAttribute("data-hero-ready", "");
      const one = (selector: string) =>
        root.querySelector<HTMLElement>(selector);
      const all = (selector: string) =>
        gsap.utils.toArray<HTMLElement>(selector, root);

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) {
        markReady();
        return;
      }

      // The board is hidden by CSS until `markReady`. If anything below throws,
      // show the page as it is rather than leave it dark.
      try {
        return build();
      } catch (error) {
        console.error("[cafe] board motion failed", error);
        markReady();
        return;
      }

      function build() {
      const stopHiddenClock = keepTimeWhileHidden();

      // ── Opening timeline (felt board: wordmark, cards, thread) ─────
      const lamp = one('[data-motion="lamp"]');
      const meta = all('[data-motion="hero-meta"]');
      const board = one('[data-motion="hero-board"]');
      const character = one('[data-motion="hero-char"]');
      const heart = one('[data-motion="hero-heart"]');
      const cards = all('[data-motion="hero-card"]');
      const title = one('[data-motion="hero-title"]');
      const yarn = one('[data-motion="hero-yarn"]');
      const redacts = all("[data-redact]");
      // Phone and desktop each have their own copy; only the one on screen plays.
      const shown = (el: HTMLElement) => el.getClientRects().length > 0;
      const stamps = all('[data-motion="hero-stamp"]').filter(shown);
      const tape = one('[data-motion="hero-tape"]');
      const develops = all('[data-motion="develop"]').filter(shown);
      const glints = all("[data-lock-glint]").filter(shown);
      const waxes = all("[data-lock-wax]").filter(shown);

      // About 3.3 s from the splash to a finished board (was 4.8 s).
      const opening = gsap.timeline({ paused: true });

      if (lamp) {
        gsap.set(lamp, { opacity: 0 });
        opening.to(
          lamp,
          {
            keyframes: [
              { opacity: 0.9, duration: 0.11 },
              { opacity: 0.1, duration: 0.06 },
              { opacity: 1, duration: 0.11 },
              { opacity: 0.3, duration: 0.08 },
              { opacity: 1, duration: 0.12 },
            ],
            ease: "none",
          },
          0
        );
      }

      if (board) {
        // Opacity only: a filter on the whole board repaints it every frame.
        opening.fromTo(
          board,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.8,
            ease: "power2.out",
            clearProps: "opacity,visibility",
          },
          0.2
        );
      }

      // The wordmark is uncovered left → right behind a travelling lens, which
      // then settles into the O of SHERLOCK.
      if (title) {
        opening.fromTo(
          title,
          { clipPath: "inset(-10% 100% -10% 0)" },
          {
            clipPath: "inset(-10% 0% -10% 0)",
            duration: 1.0,
            ease: "power2.inOut",
            clearProps: "clipPath",
          },
          0.5
        );
        lensSweep(title, opening, 0.5);
      }

      if (character) {
        opening.fromTo(
          character,
          { autoAlpha: 0, y: 140, scaleY: 0.92, transformOrigin: "50% 100%" },
          {
            autoAlpha: 1,
            y: 0,
            scaleY: 1,
            duration: 0.8,
            ease: "back.out(1.5)",
            clearProps: "transform,opacity,visibility",
          },
          0.75
        );
      }

      if (meta.length > 0) {
        opening.fromTo(
          meta,
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.12,
            clearProps: "transform,opacity,visibility",
          },
          1.1
        );
      }

      if (heart) {
        opening.fromTo(
          heart,
          { autoAlpha: 0, scale: 0 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.35,
            ease: "back.out(2.4)",
            clearProps: "transform,opacity,visibility",
          },
          1.3
        );
      }

      cards.forEach((card, index) => {
        const tilt = tiltOf(card);
        const at = 1.0 + index * 0.15;
        gsap.set(card, { transition: "none" });
        opening.fromTo(
          card,
          { autoAlpha: 0, scale: 0.3, rotation: tilt - 14 },
          {
            autoAlpha: 1,
            scale: 1,
            rotation: tilt,
            duration: 0.5,
            ease: "back.out(1.5)",
            clearProps: CLEAR,
          },
          at
        );
        // After the card has landed, so the pin does not ride the card's spin.
        dropPin(card, at + 0.5, opening);
      });

      // The venue photo develops out of a sepia haze (an overlay fading out).
      if (develops.length > 0) {
        opening.fromTo(
          develops,
          { opacity: 1 },
          { opacity: 0, duration: 1.2, ease: "power1.in" },
          1.5
        );
      }

      // The pin the thread starts from: light runs over the brass, or the wax
      // seal is pressed (sealed file). Only the inner art moves; the pin's box
      // stays put because the thread is measured from it.
      if (glints.length > 0) {
        opening.fromTo(
          glints,
          { xPercent: -260 },
          { xPercent: 360, duration: 0.4, ease: "power1.inOut" },
          1.75
        );
      }
      if (waxes.length > 0) {
        opening.fromTo(
          waxes,
          { scale: 1.6, autoAlpha: 0, transformOrigin: "50% 50%" },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.26,
            ease: "power3.in",
            clearProps: "transform,opacity,visibility",
          },
          1.7
        );
      }

      if (yarn) {
        gsap.set(yarn, { strokeDashoffset: 1 });
        // Cards have settled by now: let the thread re-read the pin positions.
        opening.call(
          () => window.dispatchEvent(new Event("resize")),
          undefined,
          1.8
        );
        // Drawn from the pin towards the heart, ending at her edge.
        opening.to(
          yarn,
          {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: "power1.inOut",
            // The dash runs 1 → 0; whole-pixel rounding would make it jump.
            autoRound: false,
          },
          1.85
        );
      }

      // The thread reaches the heart: one beat to say it arrived.
      if (yarn && heart) {
        opening.to(
          heart,
          {
            keyframes: [
              { scale: 1.35, duration: 0.14, ease: "power2.out" },
              { scale: 1, duration: 0.32, ease: "power2.inOut" },
            ],
            clearProps: "transform",
          },
          2.95
        );
      }

      if (redacts.length > 0) {
        gsap.set(redacts, { scaleX: 1 });
        opening.to(
          redacts,
          { scaleX: 0, duration: 0.6, stagger: 0.15, ease: "power3.inOut" },
          2.0
        );
      }

      if (stamps.length > 0) {
        opening.fromTo(
          stamps,
          { autoAlpha: 0, scale: 3 },
          {
            autoAlpha: 0.9,
            scale: 1,
            duration: 0.4,
            ease: "back.out(2)",
            clearProps: "transform,opacity,visibility",
          },
          2.4
        );
      }

      if (tape) {
        opening.fromTo(
          tape,
          { xPercent: -110 },
          {
            xPercent: 0,
            duration: 0.8,
            ease: "power3.out",
            clearProps: "transform",
          },
          2.5
        );
      }

      // Initial states are in place — lift the CSS guard that hid the board.
      markReady();

      let fallback: number | undefined;
      let started = false;
      // The splash signal and the fallback timer both call this; whichever
      // comes second must not restart a board that is already open.
      const play = () => {
        if (started) return;
        started = true;
        window.clearTimeout(fallback);
        window.removeEventListener(CAFE_ENTRY_READY_EVENT, play);
        opening.play(0);
      };
      const replay = () => {
        window.scrollTo(0, 0);
        opening.restart();
      };
      window.addEventListener(CAFE_REPLAY_EVENT, replay);
      const entryReady = document.documentElement.dataset.cafeEntry === "ready";
      if (entryReady) {
        play();
      } else {
        window.addEventListener(CAFE_ENTRY_READY_EVENT, play, { once: true });
        // Never leave the board dark if the splash signal is missed.
        fallback = window.setTimeout(play, 4000);
      }

      // ── Scroll reveals (play once) ─────────────────────────────────
      const batch = (
        selector: string,
        enter: (el: HTMLElement, delay: number) => void,
        step = 0.08
      ) => {
        const targets = all(selector);
        if (targets.length === 0) return;
        gsap.set(targets, { autoAlpha: 0 });
        ScrollTrigger.batch(targets, {
          start: "top 85%",
          once: true,
          onEnter: (els) =>
            els.forEach((el, index) => enter(el as HTMLElement, index * step)),
        });
      };

      // Pinned cards and polaroids drop onto the wall, then the pin lands.
      batch('[data-motion="drop"]', (el, delay) => {
        const tilt = tiltOf(el);
        gsap.set(el, { transition: "none" });
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: -16, scale: 1.03, rotation: tilt * 2.5 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotation: tilt,
            duration: 0.5,
            delay,
            ease: "power3.out",
            clearProps: CLEAR,
          }
        );
        dropPin(el, delay + 0.3);
      });

      // Exhibit and set cards are hung from their pin: one settle, then still.
      batch('[data-motion="swing"]', (el, delay) => {
        const tilt = tiltOf(el);
        gsap.set(el, { transition: "none", transformOrigin: "50% 0%" });
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: -14, rotation: tilt - 4 },
          {
            autoAlpha: 1,
            y: 0,
            rotation: tilt,
            duration: 0.55,
            delay,
            ease: "back.out(1.6)",
            clearProps: CLEAR,
          }
        );
        dropPin(el, delay + 0.18);
      });

      batch('[data-motion="rise"]', (el, delay) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            delay,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
          }
        );
      });

      batch('[data-motion="stamp"]', (el, delay) => {
        gsap
          .timeline({ delay: delay + 0.35 })
          .fromTo(
            el,
            { autoAlpha: 0, scale: 1.45, filter: "blur(1.5px)" },
            {
              autoAlpha: 0.9,
              scale: 0.96,
              filter: "blur(0px)",
              duration: 0.2,
              ease: "power3.in",
            }
          )
          .to(el, {
            scale: 1,
            duration: 0.18,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility,filter",
          });
      });

      // Section titles are swept in left → right, like the wordmark in the opening.
      const lenses = all('[data-motion="lens"]');
      if (lenses.length > 0) {
        gsap.set(lenses, { clipPath: "inset(-20% 100% -20% 0)" });
        ScrollTrigger.batch(lenses, {
          start: "top 88%",
          once: true,
          onEnter: (els) =>
            gsap.to(els, {
              clipPath: "inset(-20% 0% -20% 0)",
              duration: 0.85,
              ease: "power2.inOut",
              stagger: 0.08,
              clearProps: "clipPath",
            }),
        });
      }

      // Mission board: the gold thread is drawn pin to pin after the cards hang.
      const threads = all('[data-motion="thread"]');
      const threadBoard = threads[0]?.closest("ul");
      if (threads.length > 0 && threadBoard) {
        // Each segment is unveiled left → right (a dash offset would not
        // survive the stretched, non-scaling stroke of these small SVGs).
        gsap.set(threads, { clipPath: "inset(-20% 100% -20% 0)" });
        ScrollTrigger.create({
          trigger: threadBoard,
          start: "top 80%",
          once: true,
          onEnter: () =>
            gsap.to(threads, {
              clipPath: "inset(-20% 0% -20% 0)",
              duration: 0.35,
              ease: "none",
              stagger: 0.35,
              delay: 0.5,
              clearProps: "clipPath",
            }),
        });
      }

      // ── Timeline: the thread follows the scroll, entries land as it passes ──
      const line = one('[data-motion="tl-line"]');
      const list = line?.parentElement;
      if (line && list) {
        gsap.fromTo(
          line,
          { scaleY: 0, transformOrigin: "50% 0%" },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: list,
              start: "top 78%",
              end: "bottom 62%",
              scrub: 0.4,
            },
          }
        );
      }

      all('[data-motion="tl-item"]').forEach((item) => {
        const node = item.querySelector<HTMLElement>("[data-tl-node]");
        const note = item.querySelector<HTMLElement>("[data-tl-note]");
        const fromLeft = item.dataset.side === "left";
        if (node) gsap.set(node, { autoAlpha: 0, scale: 0 });
        if (note) gsap.set(note, { autoAlpha: 0 });
        const sealMark = note?.querySelector<HTMLElement>("[data-tl-seal]");
        if (sealMark) gsap.set(sealMark, { autoAlpha: 0 });

        ScrollTrigger.create({
          trigger: item,
          start: "top 80%",
          once: true,
          onEnter: () => {
            if (node) {
              gsap
                .timeline()
                .to(node, {
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.3,
                  ease: "back.out(2.4)",
                })
                .fromTo(
                  node,
                  { boxShadow: "0 0 0 0 rgba(233,207,134,0.9)" },
                  {
                    boxShadow: "0 0 0 10px rgba(233,207,134,0)",
                    duration: 0.6,
                    ease: "power2.out",
                    clearProps: "transform,opacity,visibility,boxShadow",
                  }
                );
            }
            const seal = note?.querySelector<HTMLElement>("[data-tl-seal]");
            if (seal) {
              gsap.fromTo(
                seal,
                { autoAlpha: 0, scale: 1.6 },
                {
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.24,
                  delay: 0.7,
                  ease: "power3.in",
                  clearProps: "transform,opacity,visibility",
                }
              );
            }
            if (note) {
              const tilt = tiltOf(note);
              gsap.set(note, { transition: "none" });
              gsap.fromTo(
                note,
                { autoAlpha: 0, x: fromLeft ? -28 : 28, rotation: tilt * 3 },
                {
                  autoAlpha: 1,
                  x: 0,
                  rotation: tilt,
                  duration: 0.6,
                  delay: 0.12,
                  ease: "power2.out",
                  clearProps: CLEAR,
                }
              );
            }
          },
        });
      });

      // Web fonts and images shift the layout after first paint.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      void document.fonts?.ready.then(refresh);

      return () => {
        window.removeEventListener(CAFE_ENTRY_READY_EVENT, play);
        window.removeEventListener(CAFE_REPLAY_EVENT, replay);
        window.removeEventListener("load", refresh);
        if (fallback !== undefined) window.clearTimeout(fallback);
        stopHiddenClock();
      };
      }
    },
    { scope: rootRef }
  );
}
