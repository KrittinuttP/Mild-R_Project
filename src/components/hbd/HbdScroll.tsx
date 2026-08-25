"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { HbdPage, VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

type HbdScrollProps = {
  data: VtuberProfile;
  hbd: HbdPage;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HbdScroll({ data, hbd }: HbdScrollProps) {
  const rootRef = useRef<HTMLElement>(null);

  const wishes = useMemo(() => {
    return [...hbd.wishes].sort((a, b) => {
      const aLazy = a.loadOnDemand ? 1 : 0;
      const bLazy = b.loadOnDemand ? 1 : 0;
      return aLazy - bLazy;
    });
  }, [hbd.wishes]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;

      const intro = root.querySelector<HTMLElement>("[data-hbd-intro]");
      if (intro) {
        gsap.fromTo(
          intro.children,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.08,
            ease: "power3.out",
          }
        );
      }

      const cards = gsap.utils.toArray<HTMLElement>("[data-hbd-card]", root);
      cards.forEach((card, index) => {
        const fromX = index % 2 === 0 ? -36 : 36;
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 48, x: fromX, rotate: index % 2 === 0 ? -1.5 : 1.5 },
          {
            autoAlpha: 1,
            y: 0,
            x: 0,
            rotate: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );

        const media = card.querySelector<HTMLElement>("[data-hbd-media]");
        if (media) {
          gsap.fromTo(
            media,
            { scale: 1.08 },
            {
              scale: 1,
              duration: 1.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
      });

      const closer = root.querySelector<HTMLElement>("[data-hbd-close]");
      if (closer) {
        gsap.fromTo(
          closer,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: closer,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    },
    { scope: rootRef, dependencies: [wishes.length] }
  );

  return (
    <article
      ref={rootRef}
      className="relative bg-[#140a0d] text-[#fff5f7]"
    >
      {/* Intro */}
      <header className="relative flex min-h-[100dvh] flex-col justify-center px-5 pt-28 pb-16 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(232,90,122,0.22),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#140a0d] to-transparent" />

        <div className="relative mx-auto w-full max-w-6xl" data-hbd-intro>
          <Link
            href="/projects/hbd"
            className="inline-flex items-center gap-2 text-sm tracking-wide text-[#f3b8c4]/75 transition hover:text-[#fff5f7]"
          >
            <ArrowLeft className="size-4" />
            กลับไปโปรเจกต์ HBD
          </Link>

          <p className="mt-10 text-[0.7rem] tracking-[0.28em] text-[#f3b8c4]/75 uppercase sm:text-sm">
            {hbd.occasionLabel ?? "Birthday"}
            {hbd.year ? ` · ${hbd.year}` : null}
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            {hbd.title}
          </h1>
          {hbd.titleLocal ? (
            <p className="mt-4 text-xl text-[#f3b8c4]/85 sm:text-2xl">
              {hbd.titleLocal}
            </p>
          ) : null}
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg">
            {hbd.subtitle}
          </p>
          <p className="mt-4 text-sm text-[#f3b8c4]/60">
            สำหรับ {data.basic.name} {data.fan.oshiMark} · จาก{data.fan.fanName}
          </p>

          <Link
            href="/hbd/upload"
            className="mt-8 inline-flex items-center gap-2 border border-[#e85a7a]/45 bg-[#e85a7a]/15 px-5 py-3 text-sm tracking-wide text-[#f7d7de] transition hover:bg-[#e85a7a]/25"
          >
            ส่งการ์ดอวยพร · 12.12.2026
          </Link>

          <div className="mt-14 flex flex-col items-start gap-2 text-[#f3b8c4]/70">
            <span className="text-xs tracking-[0.2em] uppercase">
              Scroll to open wishes
            </span>
            <ChevronDown className="size-5 animate-bounce" aria-hidden />
          </div>
        </div>
      </header>

      {/* Wish cards */}
      <div className="relative mx-auto max-w-6xl space-y-24 px-5 pb-10 sm:space-y-32 sm:px-10 lg:px-16">
        {wishes.map((wish, index) => {
          const flip = index % 2 === 1;
          return (
            <section
              key={wish.id}
              data-hbd-card
              className={cn(
                "grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16",
                flip && "md:[&>*:first-child]:order-2"
              )}
              aria-label={`คำอวยพรจาก ${wish.from}`}
            >
              <div
                data-hbd-media
                className="relative aspect-[4/5] overflow-hidden bg-[#1a0c12] sm:aspect-[5/6]"
              >
                {wish.image ? (
                  <ProtectedImage
                    src={wish.image}
                    alt={wish.alt ?? `Wish from ${wish.from}`}
                    loading={wish.loadOnDemand ? "lazy" : "eager"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl opacity-40">
                    {data.fan.oshiMark}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/55 via-transparent to-transparent" />
                {wish.fromUpload ? (
                  <span className="absolute top-3 left-3 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 px-2.5 py-1 text-[0.65rem] tracking-wide text-[#f3b8c4]/80 backdrop-blur-sm">
                    upload-ready
                  </span>
                ) : null}
              </div>

              <div className={cn(flip ? "md:text-right" : undefined)}>
                <p className="text-[0.65rem] tracking-[0.28em] text-[#e85a7a] uppercase">
                  Wish {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
                  จาก {wish.from}
                </h2>
                <p className="mt-5 text-base leading-relaxed text-[#f7d7de]/90 sm:text-lg">
                  {wish.message}
                </p>
              </div>
            </section>
          );
        })}
      </div>

      {/* Closing */}
      <footer
        data-hbd-close
        className="relative px-5 py-28 text-center sm:px-10 lg:px-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(232,90,122,0.16),transparent_50%)]" />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-4xl" aria-hidden>
            {data.fan.oshiMark}
          </p>
          <p className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
            {hbd.closingMessage}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/projects"
              className="text-sm tracking-wide text-[#f3b8c4]/75 transition hover:text-[#fff5f7]"
            >
              โปรเจกต์ทั้งหมด
            </Link>
            <span className="text-[#f3b8c4]/30">·</span>
            <Link
              href="/fan-art"
              className="text-sm tracking-wide text-[#f3b8c4]/75 transition hover:text-[#fff5f7]"
            >
              คลัง Fan art
            </Link>
          </div>
        </div>
      </footer>
    </article>
  );
}
