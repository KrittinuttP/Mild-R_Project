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

function dropPin(card: Element, at: number, timeline?: gsap.core.Timeline) {
  const pin = card.querySelector<HTMLElement>("[data-pin]");
  if (!pin) return;
  const from = { autoAlpha: 0, y: -40, scale: 2.2 };
  const to = {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.32,
    ease: "back.out(2.2)",
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
 * Board motion for `/cafe`: one opening timeline for the cork board, then
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

      // ── Opening timeline (cork board) ──────────────────────────────
      const lamp = one('[data-motion="lamp"]');
      const board = one('[data-motion="hero-board"]');
      const character = one('[data-motion="hero-char"]');
      const heart = one('[data-motion="hero-heart"]');
      const cards = all('[data-motion="hero-card"]');
      const title = one('[data-motion="hero-title"]');
      const yarn = one('[data-motion="hero-yarn"]');
      const redacts = all("[data-redact]");
      const stamp = one('[data-motion="hero-stamp"]');
      const tape = one('[data-motion="hero-tape"]');

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
        opening.fromTo(
          board,
          { autoAlpha: 0, filter: "brightness(0.1)" },
          {
            autoAlpha: 1,
            filter: "brightness(1)",
            duration: 1.2,
            ease: "power2.out",
            clearProps: "filter,opacity,visibility",
          },
          0.5
        );
      }

      if (character) {
        opening.fromTo(
          character,
          { autoAlpha: 0, y: 160, scaleY: 0.9, transformOrigin: "50% 100%" },
          {
            autoAlpha: 1,
            y: 0,
            scaleY: 1,
            duration: 0.9,
            ease: "back.out(1.5)",
            clearProps: "transform,opacity,visibility",
          },
          1.3
        );
      }

      if (heart) {
        opening.fromTo(
          heart,
          { autoAlpha: 0, scale: 0 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.4,
            ease: "back.out(2.4)",
            clearProps: "transform,opacity,visibility",
          },
          2.1
        );
      }

      cards.forEach((card, index) => {
        const tilt = tiltOf(card);
        const at = 1.6 + index * 0.17;
        gsap.set(card, { transition: "none" });
        opening.fromTo(
          card,
          { autoAlpha: 0, scale: 0.3, rotation: tilt - 14 },
          {
            autoAlpha: 1,
            scale: 1,
            rotation: tilt,
            duration: 0.55,
            ease: "back.out(1.5)",
            clearProps: CLEAR,
          },
          at
        );
        dropPin(card, at + 0.4, opening);
      });

      if (title) {
        opening.fromTo(
          title,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.5,
            ease: "steps(34)",
            clearProps: "clipPath",
          },
          2.2
        );
      }

      if (yarn) {
        gsap.set(yarn, { strokeDashoffset: 1 });
        // Cards have settled by now: let the thread re-read the pin positions.
        opening.call(
          () => window.dispatchEvent(new Event("resize")),
          undefined,
          2.75
        );
        opening.to(
          yarn,
          {
            strokeDashoffset: 0,
            duration: 1.8,
            ease: "power1.inOut",
            // The dash runs 1 → 0; whole-pixel rounding would make it jump.
            autoRound: false,
          },
          2.8
        );
      }

      if (redacts.length > 0) {
        gsap.set(redacts, { scaleX: 1 });
        opening.to(
          redacts,
          { scaleX: 0, duration: 0.7, stagger: 0.2, ease: "power3.inOut" },
          3.4
        );
      }

      if (stamp) {
        opening.fromTo(
          stamp,
          { autoAlpha: 0, scale: 3 },
          {
            autoAlpha: 0.9,
            scale: 1,
            duration: 0.45,
            ease: "back.out(2)",
            clearProps: "transform,opacity,visibility",
          },
          3.9
        );
      }

      if (tape) {
        opening.fromTo(
          tape,
          { xPercent: -110 },
          {
            xPercent: 0,
            duration: 1,
            ease: "power3.out",
            clearProps: "transform",
          },
          4.2
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
        step = 0.12
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
          { autoAlpha: 0, y: -22, scale: 1.07, rotation: tilt * 4 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotation: tilt,
            duration: 0.6,
            delay,
            ease: "back.out(1.4)",
            clearProps: CLEAR,
          }
        );
        dropPin(el, delay + 0.38);
      });

      // Evidence bags and set cards swing in from their pin.
      batch(
        '[data-motion="swing"]',
        (el, delay) => {
          const tilt = tiltOf(el);
          gsap.set(el, { transition: "none" });
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: -20, rotation: tilt - 9 },
            {
              autoAlpha: 1,
              y: 0,
              rotation: tilt,
              duration: 0.9,
              delay,
              ease: "elastic.out(1, 0.5)",
              clearProps: CLEAR,
            }
          );
          dropPin(el, delay + 0.2);
        },
        0.15
      );

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
        gsap.fromTo(
          el,
          { autoAlpha: 0, scale: 3 },
          {
            autoAlpha: 0.9,
            scale: 1,
            duration: 0.45,
            delay: delay + 0.3,
            ease: "back.out(2)",
            clearProps: "transform,opacity,visibility",
          }
        );
      });

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

        ScrollTrigger.create({
          trigger: item,
          start: "top 80%",
          once: true,
          onEnter: () => {
            if (node) {
              gsap.to(node, {
                autoAlpha: 1,
                scale: 1,
                duration: 0.3,
                ease: "back.out(2.4)",
                clearProps: "transform,opacity,visibility",
              });
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
