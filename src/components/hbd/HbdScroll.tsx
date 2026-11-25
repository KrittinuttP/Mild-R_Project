"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, Download, Heart, RotateCw } from "lucide-react";

import { ImageLightbox } from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { hbdConfetti, hbdHeartFirework, stopHbdFireworks } from "@/lib/hbd-fireworks";
import { heroNameFont } from "@/lib/hero-fonts";
import { thaiWordPieces } from "@/lib/thai-wrap";
import { HBD_AVATAR_DEFAULT } from "@/lib/hbd-upload";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { PROJECTS_COMING_SOON } from "@/lib/site-flags";
import { cn } from "@/lib/utils";
import type { HbdPage, HbdWish, VtuberProfile } from "@/types/vtuber";

import "@/fonts/hbd-card-fonts.css";

registerGsapPlugins();

/*
 * /hbd/2026 · design E
 * 1. Gate: 3 sealed envelopes (drawn in CSS, no card is shown) + "เริ่มอ่าน".
 * 2. "เริ่มอ่าน" opens the front envelope: heart firework → the letter flips into a
 *    cover card ("สุขสันต์วันเกิดนะ มายด์อาร์") → confetti. The page stays on the
 *    cover; "เลื่อนลงไปเปิดอ่านได้เลย" takes the reader to the first card.
 * 3. Cards show one by one, in order, each once its image has loaded.
 * Envelope / button styles live in globals.css (".hbd-*").
 */

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-r-pri";
const UPLOAD_HREF = "/hbd/2026/upload";
/** Cover card shown after the letter flips (the template, downsized). */
const COVER_SRC = "/assets/hbd/template/hbd-card-cover.jpg";
/** Cards fetched (low priority) while the envelope is still closed. */
const PRELOAD_COUNT = 3;
/** Hearts that pop out of the seal: x, y offsets in px. */
const HEART_BURST: Array<[number, number]> = [
  [-70, -60],
  [60, -70],
  [-30, -100],
  [90, -30],
  [-95, -20],
  [20, -110],
];
const GLOWS = [
  "rgba(242,67,125,0.32)",
  "rgba(34,214,191,0.2)",
  "rgba(183,156,255,0.24)",
  "rgba(255,143,176,0.3)",
];
/** left, top, size(px), color, delay(s) */
export const GATE_SPARKLES: Array<[string, string, number, string, number]> = [
  ["7%", "20%", 14, "var(--r-pri)", 0],
  ["15%", "62%", 9, "var(--r-acc)", 0.8],
  ["24%", "32%", 6, "var(--r-text)", 1.6],
  ["78%", "24%", 12, "var(--r-acc)", 0.4],
  ["88%", "58%", 15, "var(--r-pri)", 1.2],
  ["70%", "80%", 8, "var(--r-text)", 2],
  ["92%", "14%", 7, "var(--r-pri)", 0.6],
  ["32%", "84%", 10, "var(--r-acc)", 2.4],
];

type HbdScrollProps = {
  data: VtuberProfile;
  hbd: HbdPage;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}


/** Runs `onEnter` once, when `el` comes into view. Returns a cleanup. */
function onceInView(el: Element, onEnter: () => void, rootMargin = "0px 0px -12% 0px") {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        onEnter();
      }
    },
    { rootMargin }
  );
  observer.observe(el);
  return () => observer.disconnect();
}

function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={style}>
      <path
        fill="currentColor"
        d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z"
      />
    </svg>
  );
}

export function Sparkles({ items }: { items: typeof GATE_SPARKLES }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {items.map(([left, top, size, color, delay]) => (
        <span key={`${left}-${top}`} data-sparkle className="absolute" style={{ left, top }}>
          <Sparkle
            className="hbd-twinkle block"
            style={{ width: size, height: size, color, animationDelay: `${delay}s` }}
          />
        </span>
      ))}
    </div>
  );
}

function BackEnvelope({ slot }: { slot: "back-1" | "back-2" }) {
  return (
    <div data-env={slot} className="hbd-env" aria-hidden>
      <div className="hbd-env__body" />
      <div className="hbd-env__pocket" />
      <div className="hbd-env__flap" />
    </div>
  );
}

export function HbdScroll({ data, hbd }: HbdScrollProps) {
  const wishes = hbd.wishes;
  const total = wishes.length;

  const rootRef = useRef<HTMLElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const burstRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const introTlRef = useRef<gsap.core.Timeline | null>(null);

  const [opened, setOpened] = useState(false);
  const [settled, setSettled] = useState<boolean[]>(() => wishes.map(() => false));
  const [revealCount, setRevealCount] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxItems = wishes
    .filter((wish) => Boolean(wish.image))
    .map((wish) => ({
      id: wish.id,
      src: wish.image as string,
      alt: wish.alt ?? `Wish from ${wish.from}`,
      caption: `จาก ${wish.from}`,
      downloadUrl: wish.downloadUrl,
    }));
  const activeLightbox = lightboxIndex !== null ? (lightboxItems[lightboxIndex] ?? null) : null;

  const openLightbox = useCallback(
    (wishId: string) => {
      const index = lightboxItems.findIndex((item) => item.id === wishId);
      if (index >= 0) setLightboxIndex(index);
    },
    [lightboxItems]
  );

  const markSettled = useCallback((index: number) => {
    setSettled((prev) => (prev[index] ? prev : prev.map((value, i) => (i === index ? true : value))));
  }, []);

  // Show cards strictly in order: the next one waits until its image is ready.
  useEffect(() => {
    if (!opened || revealCount >= total || !settled[revealCount]) return;
    const timer = window.setTimeout(() => setRevealCount((count) => count + 1), revealCount === 0 ? 0 : 140);
    return () => window.clearTimeout(timer);
  }, [opened, revealCount, settled, total]);

  // Leaving the page stops any fireworks still running.
  useEffect(() => () => stopHbdFireworks(), []);

  // Entrance: title → back envelopes → front envelope → seal stamp → text + button.
  useGSAP(
    () => {
      const gate = gateRef.current;
      if (!gate) return;
      const q = gsap.utils.selector(gate);
      const startIdle = () => stackRef.current?.classList.add("is-idle");

      if (prefersReducedMotion()) {
        startIdle();
        return;
      }

      introTlRef.current = gsap
        .timeline({ defaults: { ease: "power3.out" }, onComplete: startIdle })
        .from(q("[data-hbd-intro]"), { autoAlpha: 0, y: 28, duration: 0.8, stagger: 0.1 })
        .from(q("[data-env='back-1']"), { autoAlpha: 0, x: 50, y: 80, rotation: 0, duration: 0.7 }, 0.35)
        .from(q("[data-env='back-2']"), { autoAlpha: 0, x: -40, y: 80, rotation: 0, duration: 0.7 }, 0.5)
        .from(
          q("[data-env='front']"),
          { autoAlpha: 0, y: 100, rotation: 4, scale: 0.9, duration: 0.8, ease: "back.out(1.4)" },
          0.65
        )
        .from(sealRef.current, { autoAlpha: 0, scale: 1.9, duration: 0.45, ease: "back.out(2)" }, 1.25)
        .fromTo(
          q("[data-seal-ring]"),
          { autoAlpha: 0.9, scale: 0.9 },
          { autoAlpha: 0, scale: 2.2, duration: 0.6, ease: "power2.out" },
          1.45
        )
        .from(q("[data-sparkle]"), { autoAlpha: 0, scale: 0.4, duration: 0.5, stagger: 0.05 }, 1.2)
        .from(q("[data-gate-after]"), { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.12 }, 1.55);
    },
    { scope: rootRef }
  );

  function showCards() {
    setOpened(true);
  }

  function goToCards() {
    const target = document.getElementById("hbd-cards");
    target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    target?.focus({ preventScroll: true });
  }

  /** End state: the cover card replaces the envelopes (also the reduced-motion path). */
  function finishOpen() {
    const stack = stackRef.current;
    stack?.classList.add("is-covered");
    gsap.set(stack, { clearProps: "height" });
    gsap.set(coverRef.current, { clearProps: "all" });
    showCards();
  }

  function fireHeart() {
    const front = frontRef.current?.getBoundingClientRect();
    if (front) hbdHeartFirework(front.left + front.width / 2, front.top - front.height * 0.55);
  }

  function onStart() {
    if (opened) {
      goToCards();
      return;
    }
    // A second tap while the envelope is opening skips to the cover.
    const running = openTlRef.current;
    if (running?.isActive()) {
      running.progress(1);
      return;
    }
    // Tapped before the entrance finished: jump it to the end so it cannot undo the opening.
    introTlRef.current?.progress(1);
    const stack = stackRef.current;
    stack?.classList.remove("is-idle");
    stack?.classList.add("is-open");

    if (prefersReducedMotion()) {
      finishOpen();
      return;
    }

    const hearts = burstRef.current ? Array.from(burstRef.current.children) : [];
    const backs = stack?.querySelectorAll("[data-env^='back']") ?? [];
    const frontParts = frontRef.current?.querySelectorAll(".hbd-env__body, .hbd-env__pocket, .hbd-env__flap") ?? [];
    // The full opening plays every time (Mild-R may come back to it); a second tap skips it.
    const T = 2.6;

    const tl = gsap
      .timeline({ onComplete: finishOpen })
      .to(frontRef.current, { rotation: "-=2", duration: 0.06, yoyo: true, repeat: 3 }, 0)
      .to(sealRef.current, { scale: 1.25, duration: 0.12 }, 0.1)
      .to(sealRef.current, { y: -90, rotation: -25, scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "power2.in" }, 0.22)
      .to(labelRef.current, { autoAlpha: 0, duration: 0.2 }, 0.22)
      .fromTo(
        hearts,
        { x: 0, y: 0, scale: 0.4, autoAlpha: 0 },
        {
          x: (i: number) => HEART_BURST[i]?.[0] ?? 0,
          y: (i: number) => HEART_BURST[i]?.[1] ?? 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.35,
          stagger: 0.02,
          ease: "power2.out",
        },
        0.2
      )
      .to(hearts, { autoAlpha: 0, duration: 0.3 }, 0.55)
      .to(flapRef.current, { rotationX: 180, duration: 0.5, ease: "power2.inOut" }, 0.45)
      .set(flapRef.current, { zIndex: 1 }, 0.7)
      .to(letterRef.current, { yPercent: -62, duration: 0.5, ease: "power3.out" }, 0.9)
      .set(letterRef.current, { zIndex: 6 }, 1.3)
      .to(letterRef.current, { yPercent: -14, scale: 1.1, duration: 0.45, ease: "power2.out" }, 1.3)
      .to(glowRef.current, { autoAlpha: 0.9, scale: 1.1, duration: 0.6 }, 1.2)
      .to(backs, { autoAlpha: 0.25, duration: 0.5 }, 1.3)
      // The letter flips into the cover card; the stack grows to the cover's height.
      .to(stack, { height: () => coverRef.current?.offsetHeight ?? 0, duration: 0.6, ease: "power2.inOut" }, T)
      .to(letterRef.current, { scale: 1.6, rotationY: 90, duration: 0.6, ease: "power2.in" }, T)
      .to([...backs, ...frontParts], { autoAlpha: 0, duration: 0.4 }, T + 0.2)
      .set(letterRef.current, { autoAlpha: 0 }, T + 0.6)
      .fromTo(
        coverRef.current,
        { autoAlpha: 1, rotationY: -90, scale: 0.85, transformPerspective: 1100 },
        { rotationY: 0, scale: 1, duration: 0.85, ease: "back.out(1.4)", immediateRender: false },
        T + 0.6
      )
      .to(glowRef.current, { autoAlpha: 0.8, scale: 1.25, duration: 0.8 }, T + 0.6);

    tl.call(fireHeart, undefined, 1.3).call(hbdConfetti, undefined, T + 1.1);
    openTlRef.current = tl;
  }

  const backHref = PROJECTS_COMING_SOON ? "/" : "/projects/hbd";
  const backLabel = PROJECTS_COMING_SOON ? "กลับหน้าแรก" : "กลับโปรเจกต์";

  return (
    <article ref={rootRef} className="relative overflow-hidden bg-r-bg text-r-text">
      {/* ── Gate ─────────────────────────────────────────────── */}
      <header
        ref={gateRef}
        className="relative flex min-h-[100dvh] flex-col overflow-hidden pt-24 pb-14 sm:pt-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_42%,rgba(242,67,125,0.24),transparent_70%)]"
          aria-hidden
        />
        <Sparkles items={GATE_SPARKLES} />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-10 lg:px-16">
          <Link
            href={backHref}
            data-hbd-intro
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/25 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
              FOCUS
            )}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {backLabel}
          </Link>
        </div>

        <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pt-8 text-center sm:px-10">
          <p
            data-hbd-intro
            className="inline-flex h-[26px] items-center rounded-full bg-r-pri/14 px-3 text-[0.7rem] tracking-[0.2em] text-r-text-2 uppercase"
          >
            {hbd.occasionLabel ?? "Birthday"}
            {hbd.year ? ` · ${hbd.year}` : null}
          </p>
          <h1
            data-hbd-intro
            className={cn(
              heroNameFont.variable,
              "mt-4 font-r-name text-[3rem] leading-[1.05] font-extrabold sm:mt-5 sm:text-[4.25rem] md:text-[5rem]"
            )}
          >
            {hbd.title}
          </h1>
          {hbd.titleLocal ? (
            <p data-hbd-intro className="mt-3 text-xl text-r-text-2 sm:text-2xl">
              {hbd.titleLocal}
            </p>
          ) : null}

          {total > 0 ? (
            <>
              {/* Envelopes — tapping them = เริ่มอ่าน (the button below is the accessible control). */}
              <div
                ref={stackRef}
                onClick={onStart}
                className="hbd-envs mt-8 cursor-pointer sm:mt-10"
                aria-hidden
              >
                <div
                  ref={glowRef}
                  className="pointer-events-none absolute inset-[6%_4%] rounded-full bg-[radial-gradient(circle,rgba(242,67,125,0.5),transparent_70%)] opacity-60 blur-[34px]"
                />
                <BackEnvelope slot="back-1" />
                <BackEnvelope slot="back-2" />
                <div ref={frontRef} data-env="front" className="hbd-env">
                  <div className="hbd-env__body" />
                  <div ref={letterRef} className="hbd-env__letter">
                    <span className="text-[0.62rem] tracking-[0.2em] text-[#c92b64] sm:text-xs">
                      BIRTHDAY · {hbd.year ?? 2026}
                    </span>
                    <span className={cn(heroNameFont.variable, "font-r-name text-lg font-extrabold sm:text-[1.35rem]")}>
                      {hbd.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[0.7rem] text-[#a0405f] sm:text-xs">
                      จากฮันนี่ <Heart className="size-3 fill-r-pri text-r-pri" />
                    </span>
                  </div>
                  <div className="hbd-env__pocket" />
                  <div ref={flapRef} className="hbd-env__flap" />
                  <span data-seal-ring className="hbd-env__ring" />
                  <span ref={sealRef} className="hbd-env__seal">
                    <Heart className="size-[45%] fill-white text-white" />
                  </span>
                  <span ref={labelRef} className="hbd-env__label">
                    ถึง มายด์อาร์
                  </span>
                  <span ref={burstRef} className="hbd-env__burst">
                    {HEART_BURST.map(([x, y], i) => (
                      <span key={`${x}-${y}`}>
                        <Heart
                          className={cn(
                            i % 2 ? "size-3.5" : "size-[18px]",
                            i % 3 === 1 ? "fill-r-acc text-r-acc" : "fill-r-pri text-r-pri"
                          )}
                        />
                      </span>
                    ))}
                  </span>
                </div>
                {/* Cover card: the letter flips into this once the envelope is open. */}
                <div ref={coverRef} className="hbd-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed size */}
                  <img src={COVER_SRC} alt="" width={1200} height={851} decoding="async" className="hbd-cover__img" />
                  <p className="hbd-cover__text">
                    <span>สุขสันต์วันเกิดนะ</span>
                    <span className="hbd-cover__name">มายด์อาร์</span>
                    <span>ฮันนี่ฝากคำอวยพรมาให้</span>
                  </p>
                </div>
              </div>

              {opened ? (
                <p className="sr-only">สุขสันต์วันเกิดนะมายด์อาร์ ฮันนี่ฝากคำอวยพรมาให้</p>
              ) : (
                <p data-gate-after className="mt-2 text-[0.9375rem] text-[#f7d7de] sm:text-base">
                  ฮันนี่ส่งการ์ดมา · รอมายด์อาร์เปิดอ่านอยู่
                </p>
              )}
              <div data-gate-after className="mt-6">
                {opened ? (
                  // After opening: a plain line of text (no button look) that takes the reader to the cards.
                  <button
                    type="button"
                    onClick={goToCards}
                    className={cn(
                      "inline-flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-base font-medium text-[#f7d7de] transition-colors hover:text-r-text sm:text-[1.0625rem]",
                      FOCUS
                    )}
                  >
                    เลื่อนลงไปเปิดอ่านได้เลย
                    <ArrowDown className="hbd-bob size-5 text-r-pri" aria-hidden />
                  </button>
                ) : (
                  <button type="button" onClick={onStart} className={cn("hbd-start", FOCUS)}>
                    <span className="hbd-start__shine" aria-hidden />
                    <Heart className="hbd-beat size-[18px] fill-current" aria-hidden />
                    เริ่มอ่าน
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p data-gate-after className="mt-10 text-[0.9375rem] text-[#f7d7de] sm:text-base">
                ยังไม่มีการ์ดอวยพร · มาเป็นคนแรกที่ส่งการ์ดกัน
              </p>
              <div data-gate-after className="mt-6">
                <Link href={UPLOAD_HREF} prefetch={false} className={cn("hbd-start", FOCUS)}>
                  <span className="hbd-start__shine" aria-hidden />
                  <Heart className="hbd-beat size-[18px] fill-current" aria-hidden />
                  ส่งการ์ดอวยพร
                </Link>
              </div>
            </>
          )}

          {total > 0 && !opened ? (
            <p data-gate-after className="mt-5 text-[13px] text-r-text-3">
              อยากอวยพรด้วย?{" "}
              <Link
                href={UPLOAD_HREF}
                prefetch={false}
                className={cn("text-r-text-2 underline underline-offset-4 hover:text-r-text", FOCUS)}
              >
                ส่งการ์ดอวยพร →
              </Link>
            </p>
          ) : null}
        </div>
      </header>

      {/* ── Cards (hidden until the envelope is opened; the first few still load in the background) ── */}
      <section
        id="hbd-cards"
        tabIndex={-1}
        hidden={!opened}
        aria-label="คำอวยพรจากฮันนี่"
        className="relative mx-auto max-w-[680px] scroll-mt-24 px-4 pt-14 pb-10 outline-none sm:px-6 sm:pt-20"
      >
        <ol className="flex flex-col gap-14 sm:gap-20">
          {wishes.map((wish, index) => (
            <li key={wish.id} className="flex flex-col gap-14 sm:gap-20">
              {index > 0 ? (
                <span aria-hidden className="flex items-center justify-center gap-3.5 opacity-70">
                  <span className="h-px w-12 bg-gradient-to-r from-transparent to-r-pri/50" />
                  <Sparkle className="size-3 text-r-pri" />
                  <span className="h-px w-12 bg-gradient-to-l from-transparent to-r-pri/50" />
                </span>
              ) : null}
              <WishCard
                wish={wish}
                index={index}
                total={total}
                eager={index < PRELOAD_COUNT}
                revealed={index < revealCount}
                fallbackMark={data.fan.oshiMark}
                onSettled={markSettled}
                onOpenImage={openLightbox}
              />
            </li>
          ))}
        </ol>
      </section>

      {opened ? <Closing message={hbd.closingMessage} /> : null}

      <ImageLightbox
        items={lightboxItems}
        activeIndex={lightboxIndex}
        onActiveIndexChange={setLightboxIndex}
        useProtectedImage
        headerAside={
          activeLightbox?.downloadUrl ? (
            <a
              href={activeLightbox.downloadUrl}
              download
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-r-text-2 ring-1 ring-r-text-2/25 transition hover:bg-r-pri/20 hover:text-r-text"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">ดาวน์โหลด JPG</span>
              <span className="sm:hidden">JPG</span>
            </a>
          ) : null
        }
      />
    </article>
  );
}

type WishCardProps = {
  wish: HbdWish;
  index: number;
  total: number;
  /** First cards load right away (low priority) so they are ready when the envelope opens. */
  eager: boolean;
  /** Its turn to be shown (all cards before it are shown). */
  revealed: boolean;
  fallbackMark: string;
  onSettled: (index: number) => void;
  onOpenImage: (wishId: string) => void;
};

type LoadStatus = "loading" | "ready" | "error";

function WishCard({
  wish,
  index,
  total,
  eager,
  revealed,
  fallbackMark,
  onSettled,
  onOpenImage,
}: WishCardProps) {
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<LoadStatus>(wish.image ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "loading") onSettled(index);
  }, [status, index, onSettled]);

  // An image already in the cache can finish before React attaches onLoad.
  useEffect(() => {
    const img = imgRef.current;
    // Only trust a finished image; a lazy image that has not started can also report `complete`.
    if (!img?.complete || img.naturalWidth === 0) return;
    const frame = requestAnimationFrame(() => setStatus("ready"));
    return () => cancelAnimationFrame(frame);
  }, [attempt]);

  async function onLoad(event: SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    try {
      await img.decode();
    } catch {
      /* decode can reject on some browsers even when the image is fine */
    }
    setStatus("ready");
  }

  function retry() {
    setStatus("loading");
    setAttempt((count) => count + 1);
  }

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !revealed) return;
      const media = root.querySelector("[data-card-media]");
      const copy = root.querySelectorAll("[data-card-copy] > *");
      const shine = root.querySelector("[data-card-shine]");

      if (prefersReducedMotion()) {
        gsap.set([media, ...copy], { autoAlpha: 1 });
        return;
      }

      // "Placed on the table": drops in from a little above, tilted left / right on alternate cards.
      const side = index % 2 ? 1 : -1;
      const tl = gsap
        .timeline({ paused: true })
        .fromTo(
          media,
          { autoAlpha: 0, y: -34, scale: 1.07, rotation: 5 * side },
          { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.75, ease: "back.out(1.25)" }
        )
        .fromTo(
          copy,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" },
          0.35
        );
      // A light sweeps across the card once it has landed.
      if (shine) {
        tl.fromTo(shine, { xPercent: -120, autoAlpha: 1 }, { xPercent: 120, duration: 0.9, ease: "power2.inOut" }, 0.65).set(
          shine,
          { autoAlpha: 0 }
        );
      }

      return onceInView(root, () => tl.play());
    },
    { dependencies: [revealed], scope: rootRef }
  );

  const src =
    wish.image && attempt > 0
      ? `${wish.image}${wish.image.includes("?") ? "&" : "?"}retry=${attempt}`
      : wish.image;
  const number = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return (
    <article ref={rootRef} aria-label={`คำอวยพรจาก ${wish.from}`} className="relative flex flex-col items-center">
      <div className="relative w-full">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-x-6 -inset-y-8 rounded-full blur-[34px] transition-opacity duration-700 sm:-inset-x-10 sm:-inset-y-12",
            revealed ? "opacity-80" : "opacity-30"
          )}
          style={{ background: `radial-gradient(circle, ${GLOWS[index % GLOWS.length]}, transparent 68%)` }}
        />

        {!revealed ? (
          <div
            aria-hidden
            className="absolute inset-0 z-10 rounded-2xl bg-black/25 p-2 ring-1 ring-white/10 sm:rounded-3xl sm:p-3"
          >
            <div className="hbd-skel flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl sm:rounded-xl">
              <Heart className="hbd-beat size-7 fill-r-pri text-r-pri opacity-70" />
              <span className="text-[13px] text-r-text-3">กำลังเปิดการ์ด…</span>
            </div>
          </div>
        ) : null}

        <div
          data-card-media
          className="relative rounded-2xl bg-black/25 p-2 opacity-0 shadow-[0_26px_60px_rgba(0,0,0,0.42)] ring-1 ring-white/10 sm:rounded-3xl sm:p-3"
        >
          {wish.image ? (
            <div className={cn("relative", status !== "ready" && "aspect-[1748/1240]")}>
              {status === "error" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/[0.04] text-center sm:rounded-xl">
                  <span className="text-sm text-r-text-2">เปิดการ์ดใบนี้ไม่สำเร็จ</span>
                  <button
                    type="button"
                    onClick={retry}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] text-r-text ring-1 ring-r-text-2/30 ring-inset hover:ring-r-pri/60",
                      FOCUS
                    )}
                  >
                    <RotateCw className="size-3.5" aria-hidden />
                    ลองอีกครั้ง
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenImage(wish.id)}
                  aria-label={`ดูรูปใหญ่ — จาก ${wish.from}`}
                  className={cn("block w-full cursor-zoom-in", status !== "ready" && "absolute inset-0", FOCUS)}
                >
                  <ProtectedImage
                    key={attempt}
                    ref={imgRef}
                    src={src}
                    alt={wish.alt ?? `Wish from ${wish.from}`}
                    loading={eager ? "eager" : "lazy"}
                    fetchPriority={eager ? "low" : "auto"}
                    decoding="async"
                    onLoad={onLoad}
                    onError={() => setStatus("error")}
                    className={cn(
                      "w-full rounded-xl object-contain sm:rounded-xl",
                      status === "ready" ? "h-auto" : "h-full"
                    )}
                  />
                </button>
              )}
              {status === "ready" ? (
                <span className="hbd-shine" aria-hidden>
                  <span data-card-shine />
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[16rem] items-center justify-center text-6xl opacity-40">{fallbackMark}</div>
          )}

          <span className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 rounded-full shadow-[0_0_0_5px_var(--r-bg),0_10px_24px_rgba(0,0,0,0.45)]">
            <ProtectedImage
              src={wish.avatar || HBD_AVATAR_DEFAULT}
              alt=""
              loading={eager ? "eager" : "lazy"}
              className="size-14 rounded-full object-cover sm:size-[68px]"
            />
          </span>
        </div>
      </div>

      <div data-card-copy className="mt-12 flex flex-col items-center gap-2.5 px-1 text-center sm:mt-[3.25rem] sm:gap-3">
        <span className="text-xs tracking-[0.16em] text-r-text-2/55 tabular-nums opacity-0">{number}</span>
        <h3 className="hbd-hand -mt-1 text-[1.625rem] text-[#ffe3ea] opacity-0 sm:text-3xl">จาก {wish.from}</h3>
        {wish.message ? (
          <div className="relative max-w-md pt-3 opacity-0">
            <span
              aria-hidden
              className="absolute -top-4 left-1/2 -translate-x-1/2 font-serif text-5xl leading-none text-r-pri/50 sm:-top-5 sm:text-6xl"
            >
              “
            </span>
            <p className="text-[1.0625rem] leading-[1.8] whitespace-pre-line text-[#f7d7de] sm:text-lg">
              <ThaiWrap text={wish.message} />
            </p>
          </div>
        ) : null}
        {wish.image && wish.downloadUrl ? (
          <a
            href={wish.downloadUrl}
            download
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 rounded-md text-[12.5px] text-r-text-3 opacity-0 transition-colors hover:text-r-text-2",
              FOCUS
            )}
          >
            <Download className="size-3.5" aria-hidden />
            ดาวน์โหลดการ์ด (JPG)
          </a>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Text a fan typed, wrapped only between whole Thai words. The browser's own Thai
 * line breaking can cut a word ("ความสุ" / "ขมากๆ"); here each word is an inline-block
 * with a <wbr> between words. Split after mount, so the server HTML (plain text) never
 * differs from the first client render.
 */
function ThaiWrap({ text }: { text: string }) {
  const [lines, setLines] = useState<string[][] | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLines(text.split("\n").map(thaiWordPieces)));
    return () => cancelAnimationFrame(frame);
  }, [text]);
  if (!lines) return <>{text}</>;
  return (
    <>
      {lines.map((pieces, i) => (
        <span key={i}>
          {i > 0 ? "\n" : null}
          {pieces.map((piece, j) =>
            /^\s+$/.test(piece) ? (
              " "
            ) : (
              <span key={j}>
                {j > 0 && !/^\s+$/.test(pieces[j - 1]) ? <wbr /> : null}
                <span className="inline-block max-w-full">{piece}</span>
              </span>
            )
          )}
        </span>
      ))}
    </>
  );
}

function Closing({ message }: { message?: string }) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll<HTMLElement>("[data-close-anim]");
      if (prefersReducedMotion()) {
        gsap.set(bits, { autoAlpha: 1 });
        return;
      }
      const tl = gsap.fromTo(
        bits,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.14, ease: "power3.out", paused: true }
      );
      return onceInView(root, () => tl.play(), "0px 0px -20% 0px");
    },
    { scope: rootRef }
  );

  if (!message) return null;
  const [headline, ...rest] = message.split(/\s*[—–]\s*/);
  const tail = rest.join(" — ");

  return (
    <footer ref={rootRef} className="relative overflow-hidden px-5 py-24 text-center sm:px-8 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(242,67,125,0.26),transparent_58%)]"
        aria-hidden
      />
      <Sparkles items={GATE_SPARKLES.slice(0, 6)} />
      <div className={cn(DISPLAY, "relative mx-auto flex max-w-lg flex-col items-center gap-4 sm:gap-5")}>
        <span data-close-anim className="opacity-0">
          <Heart className="hbd-beat size-9 fill-r-pri text-r-pri sm:size-10" aria-hidden />
        </span>
        <p data-close-anim className="text-3xl font-normal tracking-tight opacity-0 sm:text-5xl">
          {headline}
        </p>
        {tail ? (
          <>
            <span data-close-anim className="h-px w-28 bg-r-pri/55 opacity-0 sm:w-40" aria-hidden />
            <p data-close-anim className="max-w-md text-lg leading-relaxed text-r-text-2 opacity-0 sm:text-2xl">
              {tail}
            </p>
          </>
        ) : null}
      </div>
    </footer>
  );
}
