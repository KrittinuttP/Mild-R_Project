"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { HeartAtmosphere, usePrefersReducedMotion } from "@/components/animations/HeartAtmosphere";
import { MonitorReadouts, type Readout } from "@/components/common/MonitorReadouts";
import { Ticker } from "@/components/common/Ticker";
import { HomeHeroBackdrop } from "@/components/sections/HomeHeroBackdrop";
import { buttonVariants } from "@/components/ui/button";
import { useHeroStatus, type HeroPost, type HeroPremiere, type HeroStatus } from "@/hooks/useHeroStatus";
import { useNow } from "@/hooks/useNow";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { heroMonoFont, heroNameFont } from "@/lib/hero-fonts";
import { afterSplash } from "@/lib/splash-signal";
import { formatClock } from "@/lib/live-today";
import { cn } from "@/lib/utils";
import type { LiveSlot, VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

/** SCROLL hint fades out once the page has moved this far, and comes back at the top. */
const SCROLL_HINT_HIDE_PX = 40;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const scrolledPastHint = () => window.scrollY > SCROLL_HINT_HIDE_PX;

/** Visible box of the character inside the 2039×2039 key visual — cropped with CSS, the file is untouched. */
// Mild-R_KV_Art_new.png (29 Oct) · art bounds 456,112 → 1534,1852 + a few px for the white outline;
// same aspect as before (was x 461, y 125, w 1128, h 1717 for Mild-R_Name_Art.png)
const ART = { size: 2039, x: 452, y: 108, w: 1148, h: 1748 };
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

/**
 * Where the tap bubble appears, as % of the character box.
 * Tap 1 → right · tap 2 → left · rapid taps (< 1 s) hop on through the list.
 * Phones sit the side spots further in, so the longest line ("👀 มายด์เห็นนะ!") stays on screen.
 * The "tap me" hint and the secret line use the centred spot above the head instead.
 */
const BUBBLE_SPOTS = [
  { side: "r", cls: "left-[72%] top-[16%] md:left-[86%]" },
  { side: "l", cls: "right-[72%] top-[20%] md:right-[86%]" },
  { side: "tr", cls: "left-[56%] -top-[3%] md:left-[60%] md:top-[4%]" },
  { side: "tl", cls: "right-[56%] -top-[1%] md:right-[60%] md:top-[6%]" },
  { side: "r", cls: "left-[70%] top-[44%] md:left-[84%]" },
] as const;

const TAIL: Record<string, string> = {
  r: "-left-[5px] top-1/2 -mt-[5px] md:-left-1.5 md:-mt-1.5",
  l: "-right-[5px] top-1/2 -mt-[5px] md:-right-1.5 md:-mt-1.5",
  tr: "left-5 -bottom-[5px] md:-bottom-1.5",
  tl: "right-5 -bottom-[5px] md:-bottom-1.5",
};
const ORIGIN: Record<string, string> = { r: "origin-left", l: "origin-right", tr: "origin-bottom-left", tl: "origin-bottom-right", t: "origin-left md:origin-bottom-right" };

/**
 * Hint · "…" · head pat · secret line (spot = -1). The new KV's nurse cap touches the top of the box,
 * so the box no longer sits on it:
 * - md+: floats above the cap and grows to the LEFT (the NEXT LIVE ticker runs top-right), tail
 *   pointing down at the middle of her head.
 * - phones: beside the head on the right, tail pointing at her — the readouts sit right above the cap.
 *   Max 7.5rem wide: the space left to the screen edge on a 360–430 px phone (longer lines wrap).
 */
const TOP_SPOT_CLS =
  "left-[70%] top-[17%] md:left-auto md:right-1/2 md:top-0 md:-mt-2 md:translate-x-6 md:-translate-y-full";
const TOP_SPOT_TEXT_CLS =
  "w-max max-w-[7.5rem] text-left text-[13px] text-balance md:max-w-[min(78vw,20rem)] md:text-center md:text-base";
TAIL.t = "-left-[5px] top-1/2 -mt-[5px] md:left-auto md:right-[18px] md:top-auto md:mt-0 md:-bottom-1.5";

const BUBBLE_MS = 1250;
const RAPID_MS = 1000;
const RIPPLE_MS = 450;

/** "tap me" hint: 1.5 s after the splash fades, then every 20 s while the hero is on screen · stops at the first tap. */
const HINT_DELAY_MS = 1500;
const HINT_EVERY_MS = 20_000;
const HINT_MS = 3000;
/** mouse resting on her (not tapped yet): "…" after 2 s, then the "tap me" line at 4 s · once per hover, at most every 10 s */
const HOVER_DOTS_MS = 2000;
const HOVER_HINT_MS = 4000;
const HOVER_COOLDOWN_MS = 10_000;
/** touch screens: one "…" if nobody has tapped 10 s after the page opens (hero still on screen) */
const IDLE_MS = 10_000;
const DOTS_MS = 2400;
/** mouse tilt: leans toward the pointer, up to this many degrees either way */
const TILT_MAX_DEG = 3;
/** every 12th tap (12 Dec) shows `basic.tapSecret` a little longer, with a bigger heartbeat. */
const SECRET_EVERY = 12;
const SECRET_MS = 2600;
/**
 * Head pat (mouse only): rubbing left–right over the top of her (PAT_HEAD_ZONE of the box)
 * with PAT_TURNS direction changes inside PAT_WINDOW_MS shows `basic.tapPat` above the head.
 * Strokes shorter than PAT_MIN_STROKE_PX don't count, so a shaky hand doesn't trigger it.
 */
const PAT_HEAD_ZONE = 0.4;
const PAT_MIN_STROKE_PX = 16;
const PAT_TURNS = 4;
const PAT_WINDOW_MS = 1000;
const PAT_MS = 2200;
const PAT_COOLDOWN_MS = 6000;


/** "♥ …" lines get the heart in pink, like the original bubble. */
function BubbleText({ text }: { text: string }) {
  if (!text.startsWith("♥")) return <>{text}</>;
  return (
    <>
      <span aria-hidden className="text-r-pri">
        ♥
      </span>
      {text.slice(1)}
    </>
  );
}

/** `nudge` = hint / "…" boxes (negative ids) — a tap clears them. */
type Bubble = { id: number; spot: number; text: string; ms: number; nudge?: boolean };
type Ring = { id: number; x: number; y: number };

type HomeHeroProps = {
  data: VtuberProfile;
  /** Server-rendered live schedule (fills the corner before the first client fetch). */
  initialSlots: LiveSlot[];
  premieres: HeroPremiere[];
  posts: HeroPost[];
};

const DOT_WHITE = "r-blink text-r-nurse [text-shadow:0_0_6px_rgb(255_242_240/0.9)]";

function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("r-blink text-r-pri", className)}>
      ●
    </span>
  );
}

/** Time on air, ticking every second on its own (the rest of the hero re-renders every 30 s). */
function LiveElapsed({ sinceMs }: { sinceMs: number }) {
  const nowMs = useNow(1000);
  if (nowMs === null || nowMs < sinceMs) return null;
  return <span className="ml-1.5 tracking-[0.08em] text-r-text tabular-nums">{formatClock(nowMs - sinceMs)}</span>;
}

/** Four corner readouts from the live / milestone / X status. */
function buildReadouts(status: HeroStatus | null, xHandle: string, xUrl: string) {
  const pending: Readout = { label: "—", value: "—" };
  if (!status) return { tl: { ...pending, label: "SINCE DEBUT" }, tr: pending, bl: pending, br: pending, onAir: null };

  const { day, milestone, live, corner } = status;
  const milestoneToday = milestone.daysLeft === 0;

  const tl: Readout = {
    label: "SINCE DEBUT",
    value: (
      <span className={cn(milestoneToday && milestone.kind === "day" && "r-blink text-r-pri")}>DAY {day}</span>
    ),
  };

  const bl: Readout = {
    label: milestoneToday ? "TODAY" : milestone.label,
    value: milestoneToday ? (
      <span className="r-blink text-r-pri">{milestone.kind === "birthday" ? "HAPPY BIRTHDAY" : milestone.label}</span>
    ) : (
      <>
        IN <span className="text-r-acc">{milestone.daysLeft}</span> {milestone.daysLeft === 1 ? "DAY" : "DAYS"}
      </>
    ),
  };

  let tr: Readout;
  if (live.kind === "onair") {
    tr = {
      label: (
        <>
          <LiveDot /> LIVE
          {live.sinceMs !== null ? <LiveElapsed sinceMs={live.sinceMs} /> : null}
        </>
      ),
      value: (
        <Ticker length={live.title.length} charWidth={10} className="w-[168px] md:w-[280px]">
          {live.title}
        </Ticker>
      ),
      href: live.url ?? "/live#this-week",
      external: Boolean(live.url),
      ariaLabel: `กำลังไลฟ์: ${live.title}`,
    };
  } else if (live.kind === "today") {
    const text = `${live.time ? `${live.time} · ` : ""}${live.title}`;
    tr = {
      label: (
        <>
          <LiveDot /> NEXT LIVE
        </>
      ),
      value: (
        <Ticker length={text.length} className="w-[168px] md:w-[280px]">
          {text}
        </Ticker>
      ),
      href: "/live#this-week",
      ariaLabel: `ไลฟ์วันนี้ ${text}`,
    };
  } else if (live.next) {
    const when = `NEXT · ${live.next.dateLabel}${live.next.time ? ` ${live.next.time}` : ""}`;
    tr = {
      label: live.endedToday ? "OFFLINE" : "TODAY · OFFLINE",
      value: (
        <Ticker length={when.length + live.next.title.length + 3} className="w-[168px] md:w-[280px]">
          {when} · <span className="text-r-acc">{live.next.title} ↗</span>
        </Ticker>
      ),
      href: "/live#this-week",
      ariaLabel: `วันนี้ไม่มีไลฟ์ · ไลฟ์ถัดไป ${when} ${live.next.title}`,
    };
  } else {
    tr = {
      label: live.endedToday ? "OFFLINE" : "TODAY · OFFLINE",
      value: "รอประกาศไลฟ์ถัดไปนะ",
      href: "/live#this-week",
    };
  }

  let br: Readout;
  if (corner.kind === "premiere") {
    const text = `${corner.title} · ${corner.whenLabel}`;
    br = {
      label: "PREMIERE",
      value: (
        <Ticker length={text.length} charWidth={9} className="w-[240px] text-[15px] lg:w-[300px]">
          {text} ↗
        </Ticker>
      ),
      valuePhone: `${corner.dateLabel} ↗`,
      href: corner.url,
      external: true,
      ariaLabel: `พรีเมียร์ ${text}`,
    };
  } else if (corner.kind === "post") {
    const text = corner.text.replace(/\s+/g, " ").trim();
    br = {
      label: corner.today ? "TODAY · X" : `X · ${corner.dateLabel}`,
      value: (
        <Ticker length={text.length} charWidth={9} className="w-[240px] text-[15px] lg:w-[300px]">
          {text} ↗
        </Ticker>
      ),
      valuePhone: "NEW POST ↗",
      href: corner.url,
      external: true,
      ariaLabel: `โพสต์ X: ${text}`,
    };
  } else {
    br = {
      label: "FOLLOW · X",
      value: `${xHandle} ↗`,
      valuePhone: xHandle, // shorter on phones — keeps clear of SCROLL at 360 px
      href: xUrl,
      external: true,
      ariaLabel: `ติดตาม ${xHandle} บน X`,
    };
  }

  return { tl, tr, bl, br, onAir: live.kind === "onair" ? live : null };
}

/**
 * Project R hero · Y1-B (doc/project-r-implementation.md · เฟส 4 · บอร์ด hero HI-12).
 * Fills the screen (100svh): copy left / character right on desktop, centred on phone + tablet.
 * Monitor frame with live / milestone / X readouts · ON AIR mode · tap the character → a line from `basic.tapLines`
 * ("tap me" hint every 20 s until the first tap · secret line every 12th tap · leans toward the mouse · "…" when the mouse rests on her).
 */
export function HomeHero({ data, initialSlots = [], premieres = [], posts = [] }: HomeHeroProps) {
  const scrolledAway = useSyncExternalStore(subscribeScroll, scrolledPastHint, () => false);
  const { basic } = data;
  const youtube = data.socials.find((s) => s.platform === "youtube");
  const x = data.socials.find((s) => s.platform === "x");
  const character = data.parallax_layers.find((layer) => layer.id === "hero-character");
  const artSrc = character?.src ?? "/assets/mild/kv/Mild-R_Name_Art.png";
  const artAlt = character?.alt ?? `${basic.name} key visual`;

  const status = useHeroStatus({ debutDate: basic.debutDate, birthday: basic.birthday, initialSlots, premieres, posts });
  const { tl, tr, bl, br, onAir } = buildReadouts(status, x?.handle ?? "@MildRWorldEnd", x?.url ?? "https://x.com/MildRWorldEnd");

  const rootRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const tiltTo = useRef<((deg: number) => void) | null>(null);

  // ---- intro (once) + gentle float · same timing as the original hero ----
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(rootRef);
      // Built paused and played when the home splash starts to fade (at once when there is no splash).
      const intro = gsap.timeline({ paused: true });
      intro
        .from(q("[data-hero-art]"), { x: 40, scale: 1.06, autoAlpha: 0, duration: 1.15, ease: "power3.out" }, 0)
        .from(q("[data-hero-in]"), { y: 24, autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 }, 0.25)
        .from(q("[data-hero-frame]"), { autoAlpha: 0, duration: 0.9 }, 0.4);
      const cancelIntro = afterSplash(() => intro.play());
      gsap.to(q("[data-hero-float]"), {
        y: -14,
        rotation: 0.8,
        duration: 2.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      // mouse tilt (eased follow) — set up here so it is skipped under reduced motion
      const tilt = q("[data-hero-tilt]")[0];
      if (tilt) tiltTo.current = gsap.quickTo(tilt, "rotation", { duration: 0.6, ease: "power3.out" });
      return cancelIntro;
    },
    { scope: rootRef }
  );

  // ---- tap the character → a line from basic.tapLines ----
  const tapLines = basic.tapLines?.length ? basic.tapLines : ["♥ ใจโยก~"];
  const tapHint = basic.tapHint;
  const tapSecret = basic.tapSecret;
  const tapIdle = basic.tapIdle ?? "…";
  const patLines = Array.isArray(basic.tapPat) ? basic.tapPat : basic.tapPat ? [basic.tapPat] : [];
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const lastTap = useRef({ at: 0, spot: -1, id: 0 });
  const tapState = useRef({ count: 0, line: -1 });
  const timers = useRef<number[]>([]);
  const hoverTimers = useRef<number[]>([]); // emptied in place (splice) — never reassigned
  const nudgeId = useRef(-1);
  const lastHoverNudge = useRef(-HOVER_COOLDOWN_MS);
  // `count`: pats shown this visit — picks the line from basic.tapPat
  const pat = useRef({ lastX: null as number | null, dir: 0, travel: 0, turns: [] as number[], lastShown: -PAT_COOLDOWN_MS, count: 0 });

  useEffect(() => {
    const pending = timers.current;
    const hover = hoverTimers.current;
    return () => [...pending, ...hover].forEach((t) => window.clearTimeout(t));
  }, []);

  /** hint / "…" box above the head · replaces the previous one */
  const showNudge = useCallback((text: string, ms: number) => {
    const id = nudgeId.current--;
    setBubbles((list) => [...list.filter((b) => !b.nudge).slice(-1), { id, spot: -1, text, ms, nudge: true }]);
    timers.current.push(window.setTimeout(() => setBubbles((list) => list.filter((b) => b.id !== id)), ms));
  }, []);

  // mirrors for the hint loop (refs, so the interval reads the latest without restarting)
  const bubblesUp = useRef(0);
  const hovering = useRef(false);
  useEffect(() => {
    bubblesUp.current = bubbles.length;
  }, [bubbles]);

  // "tap me" hint (same white box, above the head): HINT_DELAY_MS after the splash fades / the hero
  // first comes on screen, then every HINT_EVERY_MS — skipped while the hero is off screen, the tab is
  // hidden, another box is up or the mouse rests on her (hover has its own "…" → hint). Stops at the first tap.
  useEffect(() => {
    if (!tapHint) return;
    const root = rootRef.current;
    let inView = false;
    let shownOnce = false;
    let first = 0;
    let every = 0;
    let observer: IntersectionObserver | null = null;
    const stop = () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      observer?.disconnect();
    };
    const tryShow = () => {
      if (tapState.current.count > 0) {
        stop();
        return;
      }
      if (!inView || document.hidden || hovering.current || bubblesUp.current > 0) return;
      shownOnce = true;
      showNudge(tapHint, HINT_MS);
    };
    const cancel = afterSplash(() => {
      every = window.setInterval(tryShow, HINT_EVERY_MS);
      if (!root || !("IntersectionObserver" in window)) {
        inView = true;
        first = window.setTimeout(tryShow, HINT_DELAY_MS);
        return;
      }
      // a `/#live` link lands below the hero — the first hint waits until they scroll back up
      observer = new IntersectionObserver(
        ([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          window.clearTimeout(first);
          if (inView && !shownOnce) first = window.setTimeout(tryShow, HINT_DELAY_MS);
        },
        { threshold: 0.35 }
      );
      observer.observe(root);
    });
    return () => {
      cancel();
      stop();
    };
  }, [tapHint, showNudge]);

  // touch screens: one "…" if nobody has tapped yet (mouse users get the hover version below)
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const idle = window.setTimeout(() => {
      if (tapState.current.count > 0 || document.hidden || window.scrollY > window.innerHeight / 2) return;
      showNudge(tapIdle, DOTS_MS);
    }, IDLE_MS);
    return () => window.clearTimeout(idle);
  }, [tapIdle, showNudge]);

  const clearHoverTimers = () => hoverTimers.current.splice(0).forEach((t) => window.clearTimeout(t));

  // mouse resting on her → "…" → "tap me" (only until the first tap)
  const onPointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") return;
    hovering.current = true;
    clearHoverTimers();
    if (tapState.current.count > 0 || performance.now() - lastHoverNudge.current < HOVER_COOLDOWN_MS) return;
    hoverTimers.current.push(
      window.setTimeout(() => {
        lastHoverNudge.current = performance.now();
        showNudge(tapIdle, DOTS_MS);
      }, HOVER_DOTS_MS)
    );
    if (tapHint) hoverTimers.current.push(window.setTimeout(() => showNudge(tapHint, HINT_MS), HOVER_HINT_MS));
  };

  // lean toward the mouse: left edge −3° … right edge +3° · and catch a head pat
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    if (tiltTo.current) {
      const rel = ((event.clientX - box.left) / box.width) * 2 - 1;
      tiltTo.current(Math.max(-1, Math.min(1, rel)) * TILT_MAX_DEG);
    }
    if (patLines.length > 0) trackPat(event.clientX, (event.clientY - box.top) / box.height);
  };

  /** left–right rubbing over the head → a line from basic.tapPat (works under reduced motion too: it's just text) */
  const trackPat = (x: number, relY: number) => {
    const p = pat.current;
    if (relY > PAT_HEAD_ZONE) {
      p.lastX = null;
      p.turns = [];
      return;
    }
    if (p.lastX === null) {
      p.lastX = x;
      p.dir = 0;
      p.travel = 0;
      return;
    }
    const dx = x - p.lastX;
    p.lastX = x;
    if (dx === 0) return;
    const dir = Math.sign(dx);
    if (dir === p.dir) {
      p.travel += Math.abs(dx);
      return;
    }
    // direction changed: count it if the stroke before was long enough
    if (p.dir !== 0 && p.travel >= PAT_MIN_STROKE_PX) {
      const now = performance.now();
      p.turns = [...p.turns.filter((t) => now - t < PAT_WINDOW_MS), now];
      if (p.turns.length >= PAT_TURNS && now - p.lastShown > PAT_COOLDOWN_MS && patLines.length > 0) {
        p.lastShown = now;
        p.turns = [];
        const line = patLines[Math.min(p.count, patLines.length - 1)];
        p.count += 1;
        clearHoverTimers();
        showNudge(line, PAT_MS);
      }
    }
    p.dir = dir;
    p.travel = Math.abs(dx);
  };

  const onPointerLeave = () => {
    hovering.current = false;
    clearHoverTimers();
    pat.current.lastX = null;
    pat.current.turns = [];
    tiltTo.current?.(0);
  };

  const onTap = (event: MouseEvent<HTMLButtonElement>) => {
    const now = performance.now();
    const prev = lastTap.current;
    const rapid = now - prev.at < RAPID_MS;
    const spot = rapid ? (prev.spot + 1) % BUBBLE_SPOTS.length : prev.spot === 0 ? 1 : 0;
    const id = prev.id + 1;
    lastTap.current = { at: now, spot, id };

    // tap 1 → first line · then a random line (never the same twice in a row) · every 12th → secret
    const tap = tapState.current;
    tap.count += 1;
    const secret = tap.count % SECRET_EVERY === 0 ? tapSecret : undefined;
    let text: string;
    if (secret) {
      text = secret;
    } else if (tap.count === 1 || tapLines.length === 1 || tap.line < 0) {
      tap.line = 0;
      text = tapLines[0];
    } else {
      let next = Math.floor(Math.random() * (tapLines.length - 1));
      if (next >= tap.line) next += 1;
      tap.line = next;
      text = tapLines[next];
    }
    clearHoverTimers();

    const ms = secret ? SECRET_MS : BUBBLE_MS;
    const bubble = { id, spot: secret ? -1 : spot, text, ms };
    // hint / "…" leave as soon as someone taps · never more than 2 boxes on screen
    setBubbles((list) => [...list.filter((b) => !b.nudge).slice(-1), bubble]);
    timers.current.push(window.setTimeout(() => setBubbles((list) => list.filter((b) => b.id !== id)), ms));

    if (reduced) return;

    // ring where it was tapped (keyboard → middle of the character)
    const box = event.currentTarget.getBoundingClientRect();
    const keyboard = event.detail === 0;
    const rx = keyboard ? 50 : ((event.clientX - box.left) / box.width) * 100;
    const ry = keyboard ? 40 : ((event.clientY - box.top) / box.height) * 100;
    setRings((list) => [...list.slice(-2), { id, x: rx, y: ry }]);
    timers.current.push(window.setTimeout(() => setRings((list) => list.filter((r) => r.id !== id)), RIPPLE_MS));

    // the character sways — "ใจโยก" (once per tap; a new tap restarts it)
    const target = event.currentTarget;
    gsap.killTweensOf(target);
    gsap
      .timeline()
      .set(target, { transformOrigin: "50% 92%" })
      .to(target, { rotation: -4, scaleX: 1.03, scaleY: 0.97, duration: 0.09, ease: "power2.out" })
      .to(target, { rotation: 3, scaleX: 0.98, scaleY: 1.02, duration: 0.12, ease: "sine.inOut" })
      .to(target, { rotation: -1.5, scaleX: 1, scaleY: 1, duration: 0.12, ease: "sine.inOut" })
      .to(target, { rotation: 0, duration: 0.15, ease: "power2.out" });

    // heartbeat answers: one small spike (1.25× · the secret tap 1.6×) + hearts flash
    const root = rootRef.current;
    if (!root) return;
    gsap
      .timeline()
      .to(root.querySelectorAll("[data-ecg-wrap]"), { scaleY: secret ? 1.6 : 1.25, duration: 0.12, ease: "power2.out", transformOrigin: "50% 50%" })
      .to(root.querySelectorAll("[data-ecg-wrap]"), { scaleY: 0.94, duration: 0.14, ease: "power2.inOut" })
      .to(root.querySelectorAll("[data-ecg-wrap]"), { scaleY: 1, duration: 0.16, ease: "power2.out" });
    gsap.fromTo(
      root.querySelectorAll("[data-hearts]"),
      { filter: "brightness(2) saturate(1.4)" },
      { filter: "brightness(1) saturate(1)", duration: 0.6, ease: "power2.out", clearProps: "filter" }
    );
  };

  const ctaClass = "h-12 w-full justify-center whitespace-nowrap md:h-[3.25rem] lg:w-auto short:h-10 short:text-sm";

  return (
    <section
      ref={rootRef}
      id="top"
      aria-labelledby="hero-title"
      data-onair={onAir ? "" : undefined}
      className={cn(
        "relative h-svh min-h-[560px] overflow-hidden bg-r-bg text-r-text md:min-h-[640px] short:min-h-[360px]",
        heroNameFont.variable,
        heroMonoFont.variable,
        // header (+ live strip) height → frame and content start under it
        "[--hero-top:3.5rem] sm:[--hero-top:4rem] in-data-live-banner:[--hero-top:5.5rem] sm:in-data-live-banner:[--hero-top:6rem]",
        onAir && "r-onair-glow"
      )}
    >
      <HomeHeroBackdrop />
      <HeartAtmosphere variant="aplus" fast={Boolean(onAir)} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[42%] bg-gradient-to-t from-r-bg via-r-bg/70 to-transparent lg:h-[30%]"
      />

      <MonitorReadouts tl={tl} tr={tr} bl={bl} br={br} />

      {onAir ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--hero-top)+40px)] z-[7] hidden justify-center md:flex">
          <span className="inline-flex items-center gap-2 rounded-full bg-r-pri px-3.5 py-1.5 font-r-mono text-[13px] tracking-[0.2em] text-r-on-pri">
            <span aria-hidden className={DOT_WHITE}>
              ●
            </span>
            ON AIR
          </span>
        </div>
      ) : null}

      <p
        aria-hidden
        className="pointer-events-none absolute top-[42%] left-[60px] z-[5] hidden -translate-y-1/2 rotate-180 font-r-mono text-xs tracking-[0.5em] whitespace-nowrap text-r-text-2/55 [writing-mode:vertical-rl] lg:block"
      >
        {basic.name.toUpperCase()} · マイ-R · {basic.nameLocal}
      </p>

      {/* content · phone/tablet: character on top, copy below · desktop: copy left, character right */}
      <div
        className={cn(
          "absolute inset-x-6 top-[calc(var(--hero-top)+20px)] bottom-0 z-[5] flex flex-col pt-[62px] pb-[78px]",
          "max-md:[@media(max-height:700px)_and_(orientation:portrait)]:pt-14 max-md:[@media(max-height:700px)_and_(orientation:portrait)]:pb-[70px]",
          "md:inset-x-16 md:top-[calc(var(--hero-top)+24px)] md:pt-[78px] md:pb-[132px]",
          "lg:inset-x-20 lg:mx-auto lg:max-w-[1360px] lg:flex-row lg:items-center lg:pt-[62px] lg:pb-[102px]",
          // phone / tablet on its side: copy left, character right, between the readouts
          "short:top-[calc(var(--hero-top)+24px)] short:flex-row short:items-center short:gap-6 short:pt-[34px] short:pb-[62px]"
        )}
      >
        <div className="order-2 flex-none pt-3 text-center lg:order-1 lg:w-[46%] lg:pt-0 lg:pl-10 lg:text-left short:order-1 short:w-[56%] short:pt-0 short:text-left">
          <p
            data-hero-in
            className="inline-flex items-center gap-2.5 font-r-mono text-[13px] uppercase tracking-[0.18em] text-r-nurse/90"
          >
            <span aria-hidden className="h-0.5 w-[22px] bg-r-acc" />
            {basic.unit}
          </p>
          <h1
            id="hero-title"
            data-hero-in
            className={cn(
              "mt-2.5 font-r-name text-[64px] leading-[1.05] font-bold whitespace-nowrap text-r-text",
              "[text-shadow:3px_3px_0_var(--r-pri),4.5px_4.5px_0_var(--r-acc)] max-md:[@media(max-height:700px)_and_(orientation:portrait)]:mt-1.5 max-md:[@media(max-height:700px)_and_(orientation:portrait)]:text-[56px]",
              "md:mt-3 md:text-8xl md:font-extrabold md:[text-shadow:5px_6px_0_var(--r-pri),7px_8px_0_var(--r-acc)]",
              "lg:mt-4 lg:text-[clamp(88px,min(15.5svh,9.5vw),140px)]",
              "short:mt-1 short:text-5xl"
            )}
          >
            {basic.name}
          </h1>
          <p
            data-hero-in
            className="mt-2.5 text-base leading-normal text-r-text/90 short:mt-1.5 short:text-sm max-md:[@media(max-height:700px)_and_(orientation:portrait)]:mt-1.5 max-md:[@media(max-height:700px)_and_(orientation:portrait)]:text-[15px] md:mt-3 md:text-[19px] lg:mt-[22px] lg:text-xl"
          >
            {basic.greeting}
          </p>
          <div
            data-hero-in
            className="mx-auto mt-4 grid max-w-[460px] grid-cols-2 gap-2.5 md:mt-5 md:gap-3.5 lg:mx-0 lg:mt-[30px] lg:flex lg:max-w-none short:mx-0 short:mt-3 short:max-w-[360px] short:gap-2"
          >
            {onAir ? (
              <Link
                href={onAir.url ?? "/live#this-week"}
                {...(onAir.url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(buttonVariants({ variant: "r-primary", size: "r-lg" }), ctaClass, "lg:px-[1.625rem]")}
              >
                <span aria-hidden className={DOT_WHITE}>
                  ●
                </span>
                Watch Live Now
              </Link>
            ) : youtube ? (
              <Link
                href={youtube.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "r-primary", size: "r-lg" }), ctaClass, "lg:px-[1.625rem]")}
              >
                Watch on YouTube
              </Link>
            ) : null}
            <a href="#lore" className={cn(buttonVariants({ variant: "r-outline", size: "r-lg" }), ctaClass)}>
              About {basic.name}
            </a>
          </div>
        </div>

        {/* character · its own height decides its width (cropped box); never cut off */}
        <div className="order-1 flex min-h-0 flex-1 justify-center lg:order-2 lg:h-full lg:max-h-[700px] lg:self-center short:order-2 short:h-full">
          <div data-hero-art className="relative h-full" style={{ aspectRatio: `${ART.w} / ${ART.h}` }}>
            <button
              type="button"
              onClick={onTap}
              onPointerEnter={onPointerEnter}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              aria-label="แตะมายด์"
              className="absolute inset-0 cursor-pointer rounded-[40%] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-acc focus-visible:outline-solid"
            >
              <span data-hero-float className="absolute inset-0 block origin-[50%_55%]">
                {/* leans toward the mouse, ±3° (GSAP quickTo · mouse only · not under reduced motion) */}
                <span data-hero-tilt className="absolute inset-0 block origin-[50%_92%] overflow-hidden">
                  <Image
                    src={artSrc}
                    alt={artAlt}
                    width={ART.size}
                    height={ART.size}
                    priority
                    draggable={false}
                    sizes="(min-width: 1024px) 60vw, 150vw"
                    className="absolute max-w-none select-none"
                    style={{
                      width: pct(ART.size / ART.w),
                      height: pct(ART.size / ART.h),
                      left: `-${pct(ART.x / ART.w)}`,
                      top: `-${pct(ART.y / ART.h)}`,
                    }}
                  />
                </span>
              </span>
            </button>

            {rings.map((ring) => (
              <span
                key={ring.id}
                aria-hidden
                className="pointer-events-none absolute z-[8] size-[60px] md:size-[68px]"
                style={{ left: `calc(${ring.x}% - 30px)`, top: `calc(${ring.y}% - 30px)` }}
              >
                <span className="r-tap-ring block size-full rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--r-pri)_70%,white)] bg-[radial-gradient(circle,color-mix(in_srgb,var(--r-pri)_22%,transparent)_0_55%,transparent_70%)]" />
              </span>
            ))}

            {bubbles.map((bubble) => {
              const spot = bubble.spot >= 0 ? BUBBLE_SPOTS[bubble.spot] : null;
              const side = spot?.side ?? "t";
              return (
                <span
                  key={bubble.id}
                  role="status"
                  className={cn("pointer-events-none absolute z-[9]", spot ? spot.cls : TOP_SPOT_CLS)}
                >
                  <span
                    className={cn(
                      "r-bubble relative block rounded-xl bg-r-nurse px-3 py-[7px] text-sm font-medium text-r-on-pri shadow-[0_10px_24px_-10px_rgb(0_0_0/0.6)] md:rounded-[14px] md:px-4 md:py-[9px] md:text-base",
                      spot ? "whitespace-nowrap" : TOP_SPOT_TEXT_CLS,
                      ORIGIN[side]
                    )}
                    style={{ animationDuration: `${bubble.ms}ms` }}
                  >
                    <BubbleText text={bubble.text} />
                    <span aria-hidden className={cn("absolute size-2.5 rotate-45 bg-r-nurse md:size-3", TAIL[side])} />
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* SCROLL · full-width wrapper keeps it centred whatever the animation does */}
      {/* fades out once the page scrolls; the chevron nudges down (still under reduced motion) */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center transition-opacity duration-300 short:hidden",
          scrolledAway && "opacity-0"
        )}
      >
        <span data-hero-in className="block pl-[0.32em] text-center text-[11px] tracking-[0.32em] text-r-text-2/72">
          SCROLL
          <span className="block -translate-x-[0.16em]">
            <ChevronDown className="r-nudge mx-auto mt-0.5 size-4 text-r-acc" />
          </span>
        </span>
      </div>
    </section>
  );
}
