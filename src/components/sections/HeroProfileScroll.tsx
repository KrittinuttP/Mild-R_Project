"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { HeartAtmosphere } from "@/components/animations/HeartAtmosphere";
import {
  DesignCredits,
  type CreditZone,
} from "@/components/sections/DesignCredits";
import { gsap, registerGsapPlugins, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { formatEnglishDate } from "@/lib/events";
import {
  BADGE_ACCENT_CLASS,
  BADGE_SOFT_CLASS,
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

type HeroProfileScrollProps = {
  data: VtuberProfile;
};

/** Locked visual scale (desktop sticky path) — tuned for portrait KV */
const SCALE_HERO = 1.12;
const SCALE_LOCK = 0.92;
/** Desktop L/R story steps — fit inside half-frame slots */
const SCALE_SIDE = 0.98;
const ART_MOVE = 0.24;
const ART_SETTLE = 0.1;

/** Inset from edges (~away from bezel) for L/R story art */
const SLOT_CENTER = { left: "0%", width: "100%" };
const SLOT_RIGHT = { left: "48%", width: "48%" };
const SLOT_LEFT = { left: "4%", width: "48%" };

export function HeroProfileScroll({ data }: HeroProfileScrollProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const youtube = data.socials.find((s) => s.platform === "youtube");

  const characterLayer = data.parallax_layers.find(
    (layer) => layer.id === "hero-character"
  );
  const atmosphereLayers = data.parallax_layers.filter(
    (layer) => layer.id !== "hero-character"
  );

  const { basic, fan, characterDesign, lore } = data;
  const characterSrc =
    characterLayer?.src ?? "/assets/mild/kv/Mild-R_Name_Art.png";
  const characterAlt =
    characterLayer?.alt ?? `${basic.name} character`;

  const cycleBlocks = [
    {
      key: "greeting",
      label: "Greeting",
      bodyDesktop: (
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl leading-snug text-[#fff5f7] sm:mt-3 sm:text-2xl md:text-3xl">
          {basic.greeting}
        </p>
      ),
      bodyMobile: (
        <p className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-snug text-[#fff5f7]">
          {basic.greeting}
        </p>
      ),
    },
    {
      key: "story",
      label: "Story",
      bodyDesktop: (
        <p className="mt-2 text-sm leading-relaxed text-[#f7d7de]/90 sm:mt-3 sm:text-base md:text-lg">
          {lore.summary}
        </p>
      ),
      bodyMobile: (
        <p className="mt-3 text-base leading-relaxed text-[#f7d7de]/90">
          {lore.summary}
        </p>
      ),
    },
    {
      key: "debut",
      label: "Debut",
      bodyDesktop: (
        <>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#fff5f7] sm:mt-3 sm:text-3xl">
            {formatEnglishDate(basic.debutDate)}
          </p>
          <p className="mt-1.5 text-xs text-[#f3b8c4]/80 sm:mt-2 sm:text-sm">
            {basic.agency} · {basic.unit}
          </p>
        </>
      ),
      bodyMobile: (
        <>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#fff5f7]">
            {formatEnglishDate(basic.debutDate)}
          </p>
          <p className="mt-2 text-sm text-[#f3b8c4]/80">
            {basic.agency} · {basic.unit}
          </p>
        </>
      ),
    },
    {
      key: "honey",
      label: "Honey",
      bodyDesktop: (
        <>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#fff5f7] sm:mt-3 sm:text-3xl">
            {fan.fanName} {fan.oshiMark}
          </p>
          <p className="mt-1.5 text-xs text-[#f3b8c4]/80 sm:mt-2 sm:text-sm">
            {fan.greetingToFans}
          </p>
        </>
      ),
      bodyMobile: (
        <>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#fff5f7]">
            {fan.fanName} {fan.oshiMark}
          </p>
          <p className="mt-2 text-sm text-[#f3b8c4]/80">{fan.greetingToFans}</p>
        </>
      ),
    },
  ];

  const creditSteps: Array<{
    key: string;
    label: string;
    zone: CreditZone;
  }> = [
    { key: "art", label: "Art", zone: "art" },
    { key: "audio", label: "Credits", zone: "audio" },
    { key: "loading", label: "Loading", zone: "loading" },
  ];

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const markReady = () => root.setAttribute("data-hero-ready", "");
      const clearReady = () => root.removeAttribute("data-hero-ready");
      clearReady();

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduceMotion) {
        gsap.set(
          root.querySelectorAll(
            "[data-m-reveal], [data-m-hero-art], [data-char-float], [data-scroll-char], [data-scroll-char-inner], [data-hero-copy], [data-hero-scroll], [data-cycle], [data-phase-name], [data-finale], [data-finale-left], [data-finale-right]"
          ),
          { clearProps: "all", autoAlpha: 1 }
        );
        markReady();
        return;
      }

      const mm = gsap.matchMedia();

      // —— Mobile: natural vertical scroll + reveals ——
      mm.add("(max-width: 767px)", () => {
        const mobile = root.querySelector<HTMLElement>("[data-mobile-root]");
        if (!mobile) return;

        const unit = mobile.querySelector<HTMLElement>("[data-hero-unit]");
        const title = mobile.querySelector<HTMLElement>("[data-hero-title]");
        const greet = mobile.querySelector<HTMLElement>("[data-hero-greet]");
        const cta = mobile.querySelector<HTMLElement>("[data-hero-cta]");
        const heroScroll =
          mobile.querySelector<HTMLElement>("[data-hero-scroll]");
        const heroArt = mobile.querySelector<HTMLElement>("[data-m-hero-art]");
        const charFloat =
          mobile.querySelector<HTMLElement>("[data-char-float]");

        gsap.set([unit, title, greet, cta, heroScroll].filter(Boolean), {
          autoAlpha: 0,
        });
        if (heroArt) {
          gsap.set(heroArt, { opacity: 0, x: 40, scale: 1.06 });
        }
        if (charFloat) {
          gsap.set(charFloat, { y: 0, rotation: 0, transformOrigin: "55% 45%" });
        }
        markReady();

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        if (heroArt) {
          intro.to(
            heroArt,
            { opacity: 1, x: 0, scale: 1, duration: 1.15 },
            0
          );
        }
        if (unit) {
          intro.fromTo(
            unit,
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            0.25
          );
        }
        if (title) {
          intro.fromTo(
            title,
            { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, duration: 0.75 },
            0.32
          );
        }
        if (greet) {
          intro.fromTo(
            greet,
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            0.48
          );
        }
        if (cta) {
          intro.fromTo(
            cta,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            0.58
          );
        }
        if (heroScroll) {
          intro.to(heroScroll, { autoAlpha: 1, duration: 0.35 }, 0.75);
        }

        let floatTween: gsap.core.Tween | undefined;
        if (charFloat) {
          intro.eventCallback("onComplete", () => {
            floatTween = gsap.to(charFloat, {
              y: -12,
              rotate: 0.7,
              duration: 2.7,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
          });
        }

        const reveals = gsap.utils.toArray<HTMLElement>(
          "[data-m-reveal]",
          mobile
        );
        const triggers: ScrollTrigger[] = [];

        reveals.forEach((el) => {
          const tween = gsap.fromTo(
            el,
            { autoAlpha: 0, y: 36 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.75,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 86%",
                toggleActions: "play none none reverse",
              },
            }
          );
          if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        });

        return () => {
          intro.eventCallback("onComplete", null);
          floatTween?.kill();
          intro.kill();
          triggers.forEach((t) => t.kill());
        };
      });

      // —— Desktop: column sticky scrollytelling ——
      mm.add("(min-width: 768px)", () => {
        const desk = root.querySelector<HTMLElement>("[data-desktop-root]");
        if (!desk) return;

        const character = desk.querySelector<HTMLElement>("[data-scroll-char]");
        const charInner = desk.querySelector<HTMLElement>(
          "[data-scroll-char-inner]"
        );
        const heroCopy = desk.querySelector<HTMLElement>("[data-hero-copy]");
        const heroScroll =
          desk.querySelector<HTMLElement>("[data-hero-scroll]");
        const desktopRoot = desk.querySelector<HTMLElement>(
          "[data-desktop-story]"
        );
        const finale = desk.querySelector<HTMLElement>("[data-finale]");
        const finaleLeft =
          desk.querySelector<HTMLElement>("[data-finale-left]");
        const finaleRight = desk.querySelector<HTMLElement>(
          "[data-finale-right]"
        );

        const unit = desk.querySelector<HTMLElement>("[data-hero-unit]");
        const title = desk.querySelector<HTMLElement>("[data-hero-title]");
        const greet = desk.querySelector<HTMLElement>("[data-hero-greet]");
        const cta = desk.querySelector<HTMLElement>("[data-hero-cta]");

        const phaseName =
          desktopRoot?.querySelector<HTMLElement>("[data-phase-name]") ?? null;
        const cycleLeft = desktopRoot
          ? gsap.utils.toArray<HTMLElement>("[data-cycle-left]", desktopRoot)
          : [];
        const cycleRight = desktopRoot
          ? gsap.utils.toArray<HTMLElement>("[data-cycle-right]", desktopRoot)
          : [];
        const creditCycles = desktopRoot
          ? gsap.utils
              .toArray<HTMLElement>("[data-credit-cycle]", desktopRoot)
              .sort((a, b) => {
                const order = ["art", "audio", "loading"];
                return (
                  order.indexOf(a.dataset.creditZone ?? "") -
                  order.indexOf(b.dataset.creditZone ?? "")
                );
              })
          : [];

        const playCycle = (
          tl: gsap.core.Timeline,
          items: HTMLElement[],
          startAt: number,
          fromX: number
        ) => {
          let t = startAt;
          items.forEach((el) => {
            tl.fromTo(
              el,
              { autoAlpha: 0, x: fromX },
              { autoAlpha: 1, x: 0, duration: 0.11 },
              t
            );
            t += 0.11 + 0.18;
            tl.to(
              el,
              { autoAlpha: 0, x: fromX * 0.3, duration: 0.1 },
              t
            );
            t += 0.05;
          });
          return t;
        };

        gsap.set([unit, title, greet, cta, heroScroll].filter(Boolean), {
          autoAlpha: 0,
        });
        gsap.set(
          [
            phaseName,
            finale,
            finaleLeft,
            finaleRight,
            ...cycleLeft,
            ...cycleRight,
            ...creditCycles,
          ].filter(Boolean),
          { autoAlpha: 0 }
        );

        const charFloat =
          desk.querySelector<HTMLElement>("[data-char-float]");

        if (character) gsap.set(character, { ...SLOT_CENTER });
        if (charInner) {
          gsap.set(charInner, {
            autoAlpha: 0,
            scale: SCALE_HERO * 0.86,
            y: 48,
            force3D: true,
            transformOrigin: "50% 55%",
          });
        }
        if (charFloat) {
          gsap.set(charFloat, { y: 0, rotate: 0, transformOrigin: "50% 55%" });
        }
        markReady();

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        if (charInner) {
          intro.to(
            charInner,
            { autoAlpha: 1, scale: SCALE_HERO, y: 0, duration: 1.4 },
            0
          );
        }
        if (unit) {
          intro.fromTo(
            unit,
            { x: -70, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.7 },
            0.2
          );
        }
        if (title) {
          intro.fromTo(
            title,
            { x: -90, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.9 },
            0.28
          );
        }
        if (greet) {
          intro.fromTo(
            greet,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.75 },
            0.45
          );
        }
        if (cta) {
          intro.fromTo(
            cta,
            { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, duration: 0.65 },
            0.58
          );
        }
        if (heroScroll) {
          intro.to(heroScroll, { autoAlpha: 1, duration: 0.4 }, 0.8);
        }

        let floatTween: gsap.core.Tween | undefined;
        if (charFloat) {
          intro.eventCallback("onComplete", () => {
            floatTween = gsap.to(charFloat, {
              y: -16,
              rotate: 0.8,
              duration: 3,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
          });
        }

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: desk,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.15,
            invalidateOnRefresh: true,
          },
        });

        tl.to(heroCopy, { autoAlpha: 0, y: -36, duration: 0.12 }, 0)
          .to(heroScroll, { autoAlpha: 0, duration: 0.08 }, 0)
          .to(
            desk.querySelectorAll("[data-atmos-layer]"),
            { autoAlpha: 0.45, duration: 0.14 },
            0
          );

        tl.to(character, { ...SLOT_CENTER, duration: 0.14 }, 0)
          .to(charInner, { scale: SCALE_HERO, y: 0, duration: 0.14 }, 0)
          .fromTo(
            phaseName,
            { autoAlpha: 0, x: -60 },
            { autoAlpha: 1, x: 0, duration: 0.12 },
            0.08
          )
          .to(phaseName, { autoAlpha: 1, duration: 0.1 }, 0.2)
          .to(phaseName, { autoAlpha: 0, x: -36, duration: 0.1 }, 0.32);

        tl.to(character, { ...SLOT_RIGHT, duration: ART_MOVE }, 0.34).to(
          charInner,
          { scale: SCALE_SIDE, duration: ART_MOVE },
          0.34
        );
        let cursor = 0.34 + ART_MOVE + ART_SETTLE;
        // Greeting → Honey: copy left, character right
        cursor = playCycle(tl, cycleLeft, cursor, -72);

        // Credits (Art → Audio → Loading): copy right, character left
        if (creditCycles.length > 0) {
          tl.to(character, { ...SLOT_LEFT, duration: ART_MOVE }, cursor).to(
            charInner,
            { scale: SCALE_SIDE, duration: ART_MOVE },
            cursor
          );
          cursor = cursor + ART_MOVE + ART_SETTLE;

          creditCycles.forEach((el) => {
            tl.fromTo(
              el,
              { autoAlpha: 0, x: 72 },
              { autoAlpha: 1, x: 0, duration: 0.12 },
              cursor
            );
            cursor += 0.12 + 0.22;
            tl.to(el, { autoAlpha: 0, x: 72 * 0.3, duration: 0.1 }, cursor);
            cursor += 0.06;
          });
        }

        tl.to(character, { ...SLOT_CENTER, duration: 0.22 }, cursor)
          .to(charInner, { scale: SCALE_LOCK, duration: 0.22 }, cursor)
          .to(
            desk.querySelectorAll("[data-atmos-layer]"),
            { autoAlpha: 0.35, duration: 0.18 },
            cursor
          )
          .to(finale, { autoAlpha: 1, duration: 0.08 }, cursor + 0.1)
          .fromTo(
            finaleLeft,
            { autoAlpha: 0, x: -70 },
            { autoAlpha: 1, x: 0, duration: 0.14 },
            cursor + 0.12
          )
          .fromTo(
            finaleRight,
            { autoAlpha: 0, x: 70 },
            { autoAlpha: 1, x: 0, duration: 0.14 },
            cursor + 0.16
          )
          .to({}, { duration: 0.2 });

        return () => {
          intro.eventCallback("onComplete", null);
          floatTween?.kill();
          intro.kill();
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      return () => {
        clearReady();
        mm.revert();
      };
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} id="top" data-hero-root className="bg-[#140a0d]">
      {/* ========== MOBILE: vertical stack ========== */}
      <div data-mobile-root className="md:hidden">
        <section
          aria-label={`${basic.name} hero`}
          className="relative min-h-[100dvh] overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-0 scale-105">
            {atmosphereLayers.map((layer) => (
              <div
                key={layer.id}
                className="absolute inset-0"
                style={{ zIndex: layer.zIndex ?? 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.src}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          <HeartAtmosphere />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#140a0d]/45 via-[#140a0d]/10 to-[#140a0d]" />

          {/* Art: right-side panel — figure always visible, half-cropped by edge */}
          <div
            data-m-hero-art
            data-hero-intro
            className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
          >
            <div
              data-char-float
              className="absolute top-[2%] -right-[10%] h-[70dvh] w-[92vw] will-change-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterSrc}
                alt={characterAlt}
                className="h-full w-full object-cover object-[55%_18%]"
                draggable={false}
              />
            </div>
          </div>

          {/* Copy: lower-left block with room above for art */}
          <div className="relative z-[3] flex min-h-[100dvh] flex-col justify-end px-5 pt-28 pb-[max(5.25rem,calc(env(safe-area-inset-bottom)+3.25rem))]">
            <div data-hero-copy data-hero-intro className="w-[min(100%,19.5rem)]">
              <p data-hero-unit className={cn(META_CLASS, "mb-2.5 text-[#f3b8c4]/85")}>
                {basic.unit}
              </p>
              <h1
                data-hero-title
                className="font-[family-name:var(--font-display)] text-[clamp(3.25rem,16vw,4.75rem)] leading-tight font-normal tracking-normal text-[#fff5f7]"
              >
                {basic.name}
              </h1>
              <p
                data-hero-greet
                className="mt-3.5 max-w-[17rem] text-[0.9rem] leading-relaxed text-[#f7d7de]/92"
              >
                {basic.greeting}
              </p>
              <div
                data-hero-cta
                className="mt-6 flex flex-wrap items-center gap-2.5"
              >
                {youtube ? (
                  <Link
                    href={youtube.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      CTA_PRIMARY_CLASS,
                      "min-h-11 px-5"
                    )}
                  >
                    Watch on YouTube
                  </Link>
                ) : null}
                <a
                  href="#profile"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    CTA_OUTLINE_CLASS,
                    "min-h-11 px-5"
                  )}
                >
                  Meet {basic.name}
                </a>
              </div>
            </div>

            <div
              data-hero-scroll
              data-hero-intro
              className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 text-[#f3b8c4]/65"
              aria-hidden
            >
              <span className="text-xs tracking-[0.18em] uppercase sm:text-sm">
                Scroll
              </span>
              <ChevronDown className="size-4 animate-bounce" />
            </div>
          </div>
        </section>

        <section
          aria-label={`${basic.name} story`}
          className="relative border-t border-[#f3b8c4]/10 bg-[#12080c] px-5 py-16"
        >
          <div className="mx-auto max-w-lg space-y-16">
            {cycleBlocks
              .filter((block) => block.key !== "story")
              .map((block) => (
              <article key={`m-${block.key}`} data-m-reveal>
                <p className={cn(META_CLASS, "text-[#e85a7a]")}>{block.label}</p>
                {block.bodyMobile}
              </article>
            ))}

            {creditSteps.map((step) => (
              <article key={`m-credit-${step.key}`} data-m-reveal>
                <p className={cn(META_CLASS, "text-[#e85a7a]")}>{step.label}</p>
                <div className="mt-5">
                  <DesignCredits
                    design={characterDesign}
                    zones={[step.zone]}
                    variant="strip"
                    size="lg"
                    hideHeading
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="profile"
          aria-label={`${basic.name} profile overview`}
          className="relative border-t border-[#f3b8c4]/10 bg-[#140a0d] px-5 py-16 pb-20"
        >
          <div className="mx-auto max-w-lg space-y-8">
            <div data-m-reveal>
              <p className={cn(META_CLASS, "text-[#e85a7a]")}>Profile</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-normal tracking-normal text-[#fff5f7]">
                {basic.name}
              </h2>
              {basic.nameLocal ? (
                <p className="mt-2 text-lg text-[#f3b8c4]/85">
                  {basic.nameLocal}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {basic.species ? (
                  <span className={cn(BADGE_ACCENT_CLASS, "uppercase")}>
                    {basic.species}
                  </span>
                ) : null}
                {basic.agency ? (
                  <span className={cn(BADGE_SOFT_CLASS, "uppercase")}>
                    {basic.agency}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              data-m-reveal
              className="rounded-3xl border border-[#f3b8c4]/15 bg-[#1a0d12]/55 px-5 py-4 text-[#fff5f7] backdrop-blur-[2px]"
            >
              <p className={cn(META_CLASS, "text-[#e85a7a]")}>Details</p>
              <dl className="mt-3 divide-y divide-[#f3b8c4]/12">
                {basic.species ? (
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-xs text-[#f3b8c4]/55">Species</dt>
                    <dd className="text-right font-[family-name:var(--font-display)] text-sm">
                      {basic.species}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-xs text-[#f3b8c4]/55">Debut</dt>
                  <dd className="text-right font-[family-name:var(--font-display)] text-sm">
                    {formatEnglishDate(basic.debutDate)}
                  </dd>
                </div>
                {basic.heightCm ? (
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-xs text-[#f3b8c4]/55">Height</dt>
                    <dd className="text-right font-[family-name:var(--font-display)] text-sm">
                      {basic.heightCm} cm
                    </dd>
                  </div>
                ) : null}
                {basic.birthdayLabel || basic.birthday ? (
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-xs text-[#f3b8c4]/55">Birthday</dt>
                    <dd className="text-right font-[family-name:var(--font-display)] text-sm">
                      {basic.birthdayLabel ?? basic.birthday}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-xs text-[#f3b8c4]/55">Fan</dt>
                  <dd className="text-right font-[family-name:var(--font-display)] text-sm">
                    {fan.fanName} {fan.oshiMark}
                  </dd>
                </div>
                {basic.agency ? (
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-xs text-[#f3b8c4]/55">Agency</dt>
                    <dd className="text-right text-sm text-[#f7d7de]/90">
                      {basic.agency}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </section>
      </div>

      {/* ========== DESKTOP: sticky scrollytelling ========== */}
      <div
        data-desktop-root
        className="relative hidden h-[640vh] bg-[#140a0d] md:block"
      >
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <div className="absolute inset-0 scale-110">
            {atmosphereLayers.map((layer) => (
              <div
                key={layer.id}
                data-atmos-layer
                className="pointer-events-none absolute inset-0"
                style={{ zIndex: layer.zIndex ?? 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.src}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          <HeartAtmosphere />

          <div
            data-scroll-char
            className="pointer-events-none absolute top-0 z-[5] flex h-full items-center justify-center overflow-hidden"
            style={{ left: "0%", width: "100%" }}
          >
            <div
              data-scroll-char-inner
              data-hero-intro
              className="relative h-[85%] w-[min(92%,520px)] will-change-transform"
            >
              <div
                data-char-float
                className="relative h-full w-full will-change-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterSrc}
                  alt={characterAlt}
                  className="h-full w-full object-contain object-center"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-t from-[#140a0d] via-[#140a0d]/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[7] h-[38%] bg-gradient-to-t from-[#140a0d] via-[#140a0d]/75 to-transparent" />

          <section
            aria-label={`${basic.name} hero`}
            className="relative z-10 flex h-full flex-col justify-end px-10 pb-16 lg:px-16"
          >
            <div
              data-hero-copy
              data-hero-intro
              className="relative mx-auto w-full max-w-6xl"
            >
              <p
                data-hero-unit
                className={cn(META_CLASS, "mb-3 text-[#f3b8c4]/80")}
              >
                {basic.unit}
              </p>
              <h1
                data-hero-title
                className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,8vw,8.5rem)] leading-tight font-normal tracking-normal text-[#fff5f7]"
              >
                {basic.name}
              </h1>
              <p
                data-hero-greet
                className="mt-5 max-w-xl text-lg text-[#f7d7de]/90"
              >
                {basic.greeting}
              </p>
              <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
                {youtube ? (
                  <Link
                    href={youtube.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      CTA_PRIMARY_CLASS,
                      "px-6"
                    )}
                  >
                    Watch on YouTube
                  </Link>
                ) : null}
                <a
                  href="#profile-desktop"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    CTA_OUTLINE_CLASS,
                    "px-5"
                  )}
                >
                  Meet {basic.name}
                </a>
              </div>
            </div>

            <div
              data-hero-scroll
              data-hero-intro
              className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[#f3b8c4]/70"
              aria-hidden
            >
              <span className="text-[0.6rem] tracking-[0.2em] uppercase">
                Scroll
              </span>
              <ChevronDown className="size-5 animate-bounce" />
            </div>
          </section>

          <div
            data-desktop-story
            className="pointer-events-none absolute inset-0 z-20"
          >
            <div
              data-phase-name
              data-hero-intro
              className="absolute inset-y-0 left-0 flex w-1/2 items-center px-10 lg:px-14"
            >
              <div>
                <p className="text-sm tracking-[0.35em] text-[#e85a7a] uppercase">
                  {basic.unit}
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2.8rem,7vw,5.2rem)] leading-tight font-normal tracking-normal text-[#fff5f7]">
                  {basic.name}
                </p>
                {basic.nameLocal ? (
                  <p className="mt-3 text-lg text-[#f3b8c4]/85">
                    {basic.nameLocal}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-center px-10 lg:px-14">
              <div className="relative h-[26rem] w-full max-w-[32rem] text-left">
                {cycleBlocks.map((block) => (
                  <div
                    key={block.key}
                    data-cycle
                    data-cycle-left
                    data-hero-intro
                    className="absolute inset-0 flex flex-col justify-center"
                  >
                    <p className="text-sm tracking-[0.28em] text-[#e85a7a]/90 uppercase">
                      {block.label}
                    </p>
                    {block.bodyDesktop}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-center px-10 lg:px-14">
              <div className="relative h-[26rem] w-full max-w-[32rem] text-right">
                {creditSteps.map((step) => (
                  <div
                    key={step.key}
                    data-credit-cycle
                    data-credit-zone={step.zone}
                    data-credit-side="right"
                    data-hero-intro
                    className="absolute inset-0 flex flex-col justify-center"
                  >
                    <p className="text-sm tracking-[0.28em] text-[#e85a7a]/90 uppercase sm:text-base">
                      {step.label}
                    </p>
                    <div className="pointer-events-auto mt-6">
                      <DesignCredits
                        design={characterDesign}
                        zones={[step.zone]}
                        variant="strip"
                        size="lg"
                        align="end"
                        hideHeading
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section
            data-finale
            data-hero-intro
            id="profile-desktop"
            aria-label={`${basic.name} profile overview`}
            className="pointer-events-none absolute inset-0 z-20 flex px-8 pt-16 pb-7 lg:px-12 lg:pt-16 lg:pb-8"
          >
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
              <div className="flex min-h-0 flex-1 flex-col justify-center pb-2 pt-4 lg:pb-4 lg:pt-2">
              <div className="grid shrink-0 grid-cols-2 items-stretch gap-6 lg:gap-10">
                <div
                  data-finale-left
                  className="relative max-w-lg border-l-2 border-[#e85a7a]/55 pl-5 lg:pl-6"
                >
                  <p className={cn(META_CLASS, "text-[#e85a7a]")}>Profile</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {basic.species ? (
                      <span className={cn(BADGE_ACCENT_CLASS, "uppercase")}>
                        {basic.species}
                      </span>
                    ) : null}
                    {basic.unit ? (
                      <span className={cn(BADGE_SOFT_CLASS, "uppercase")}>
                        {basic.unit}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-normal tracking-normal text-[#fff5f7] lg:text-[2.75rem] xl:text-5xl">
                    {basic.name}
                  </h2>
                  {basic.nameLocal ? (
                    <p className="mt-1.5 text-lg text-[#f3b8c4]/85 lg:text-xl">
                      {basic.nameLocal}
                    </p>
                  ) : null}
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-[#f7d7de]/88 lg:text-[0.95rem]">
                    {lore.summary}
                  </p>
                </div>

                <div
                  data-finale-right
                  className="flex max-w-sm flex-col justify-center justify-self-end rounded-3xl border border-[#f3b8c4]/15 bg-[#1a0d12]/55 px-5 py-4 text-[#fff5f7] backdrop-blur-[2px] lg:px-6 lg:py-5"
                >
                  <p className={cn(META_CLASS, "text-[#e85a7a]")}>Details</p>
                  <dl className="mt-3 divide-y divide-[#f3b8c4]/12">
                    {basic.species ? (
                      <div className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="text-xs text-[#f3b8c4]/55">Species</dt>
                        <dd className="text-right font-[family-name:var(--font-display)] text-sm lg:text-base">
                          {basic.species}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="text-xs text-[#f3b8c4]/55">Debut</dt>
                      <dd className="text-right font-[family-name:var(--font-display)] text-sm lg:text-base">
                        {formatEnglishDate(basic.debutDate)}
                      </dd>
                    </div>
                    {basic.heightCm ? (
                      <div className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="text-xs text-[#f3b8c4]/55">Height</dt>
                        <dd className="text-right font-[family-name:var(--font-display)] text-sm lg:text-base">
                          {basic.heightCm} cm
                        </dd>
                      </div>
                    ) : null}
                    {basic.birthdayLabel || basic.birthday ? (
                      <div className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="text-xs text-[#f3b8c4]/55">Birthday</dt>
                        <dd className="text-right font-[family-name:var(--font-display)] text-sm lg:text-base">
                          {basic.birthdayLabel ?? basic.birthday}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="text-xs text-[#f3b8c4]/55">Fan</dt>
                      <dd className="text-right font-[family-name:var(--font-display)] text-sm lg:text-base">
                        {fan.fanName} {fan.oshiMark}
                      </dd>
                    </div>
                    {basic.agency ? (
                      <div className="flex items-baseline justify-between gap-4 py-2">
                        <dt className="text-xs text-[#f3b8c4]/55">Agency</dt>
                        <dd className="text-right text-sm text-[#f7d7de]/90 lg:text-base">
                          {basic.agency}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
              </div>

              <div className="pointer-events-auto shrink-0 border-t border-[#f3b8c4]/15 pt-4">
                <DesignCredits
                  design={characterDesign}
                  variant="strip"
                  size="md"
                  showHandle={false}
                  layout="inline"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
