"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HBD_AVATAR_DEFAULT } from "@/lib/hbd-upload";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { HbdPage, VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

const DISPLAY = "font-[family-name:var(--font-display)]";

type HbdScrollProps = {
  data: VtuberProfile;
  hbd: HbdPage;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HbdScroll({ data, hbd }: HbdScrollProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const wishes = useMemo(() => {
    return [...hbd.wishes].sort((a, b) => {
      const aLazy = a.loadOnDemand ? 1 : 0;
      const bLazy = b.loadOnDemand ? 1 : 0;
      return aLazy - bLazy;
    });
  }, [hbd.wishes]);

  const lightboxItems = useMemo(
    () =>
      wishes
        .filter((wish) => Boolean(wish.image))
        .map((wish) => ({
          id: wish.id,
          src: wish.image as string,
          alt: wish.alt ?? `Wish from ${wish.from}`,
          from: wish.from,
        })),
    [wishes]
  );

  const activeLightbox =
    lightboxIndex !== null ? (lightboxItems[lightboxIndex] ?? null) : null;

  const openLightbox = (wishId: string) => {
    const index = lightboxItems.findIndex((item) => item.id === wishId);
    if (index >= 0) setLightboxIndex(index);
  };

  const goPrev = () => {
    if (lightboxItems.length < 2 || lightboxIndex === null) return;
    setLightboxIndex(
      (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length
    );
  };

  const goNext = () => {
    if (lightboxItems.length < 2 || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % lightboxItems.length);
  };

  useEffect(() => {
    if (lightboxIndex === null || lightboxItems.length < 2) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxIndex(
          (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length
        );
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxIndex((lightboxIndex + 1) % lightboxItems.length);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, lightboxItems.length]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      if (prefersReducedMotion()) {
        gsap.set(root.querySelectorAll("[data-hbd-anim]"), {
          clearProps: "all",
          autoAlpha: 1,
          y: 0,
          x: 0,
          scale: 1,
        });
        return;
      }

      const introBits = root.querySelectorAll<HTMLElement>(
        "[data-hbd-intro] [data-hbd-anim]"
      );
      if (introBits.length) {
        gsap.fromTo(
          introBits,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: "power3.out",
            delay: 0.08,
          }
        );
      }

      const cards = gsap.utils.toArray<HTMLElement>("[data-hbd-card]", root);
      cards.forEach((card) => {
        const media = card.querySelector<HTMLElement>("[data-hbd-media]");
        const mediaInner = card.querySelector<HTMLElement>(
          "[data-hbd-media-inner]"
        );
        const copy = card.querySelector<HTMLElement>("[data-hbd-copy]");

        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 56 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          }
        );

        if (media) {
          gsap.fromTo(
            media,
            { scale: 0.97 },
            {
              scale: 1,
              duration: 1.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        if (mediaInner) {
          gsap.fromTo(
            mediaInner,
            { yPercent: 3 },
            {
              yPercent: -3,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.65,
              },
            }
          );
        }

        if (copy) {
          gsap.set(copy.children, { autoAlpha: 0, y: 16 });
          gsap.to(copy.children, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 78%",
              toggleActions: "play none none reverse",
            },
          });
        }
      });

      const closer = root.querySelector<HTMLElement>("[data-hbd-close]");
      if (closer) {
        const bits = closer.querySelectorAll<HTMLElement>("[data-hbd-anim]");
        const headline = closer.querySelector<HTMLElement>(
          "[data-hbd-close-headline]"
        );

        gsap.set(bits, { autoAlpha: 0, y: 24 });
        if (headline) gsap.set(headline, { scale: 0.94 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: closer,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        });

        bits.forEach((bit, index) => {
          const isHeadline = bit.hasAttribute("data-hbd-close-headline");
          tl.to(
            bit,
            {
              autoAlpha: 1,
              y: 0,
              ...(isHeadline ? { scale: 1 } : {}),
              duration: isHeadline ? 0.95 : 0.75,
              ease: isHeadline ? "power3.out" : "power2.out",
            },
            index * 0.14
          );
        });
      }
    },
    { scope: rootRef, dependencies: [wishes.length] }
  );

  return (
    <article
      ref={rootRef}
      className="relative overflow-hidden bg-[#140a0d] text-[#fff5f7]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-5%,rgba(232,90,122,0.28),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_40%,rgba(243,184,196,0.08),transparent_50%)]"
        aria-hidden
      />

      {/* Hero — brand + one CTA */}
      <header
        data-hbd-intro
        className="relative flex min-h-[100dvh] flex-col pb-16 pt-28 sm:pt-32"
      >
        <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-10 lg:px-16">
          <div data-hbd-anim>
            <BackLink href="/projects/hbd" className="mb-8">
              กลับโปรเจกต์
            </BackLink>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 text-center sm:px-10">
          <p
            data-hbd-anim
            className="inline-flex self-center rounded-full bg-[#e85a7a]/15 px-3 py-1 text-[0.7rem] tracking-[0.2em] text-[#f3b8c4] uppercase"
          >
            {hbd.occasionLabel ?? "Birthday"}
            {hbd.year ? ` · ${hbd.year}` : null}
          </p>

          <h1
            data-hbd-anim
            className={cn(
              DISPLAY,
              "mt-5 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl"
            )}
          >
            {hbd.title}
          </h1>

          {hbd.titleLocal ? (
            <p
              data-hbd-anim
              className="mt-4 text-xl text-[#f3b8c4]/85 sm:text-2xl"
            >
              {hbd.titleLocal}
            </p>
          ) : null}

          <div
            data-hbd-anim
            className="mx-auto mt-6 max-w-lg space-y-1 text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg"
          >
            {hbd.subtitle.includes("—") || hbd.subtitle.includes("–") ? (
              <div className="flex flex-col items-center gap-3">
                <p>{hbd.subtitle.split(/\s*[—–]\s*/)[0]}</p>
                <div
                  className="h-px w-24 bg-[#e85a7a]/45 sm:w-32"
                  aria-hidden
                />
                <p className="text-[#f3b8c4]/70">
                  {hbd.subtitle.split(/\s*[—–]\s*/).slice(1).join(" — ")}
                </p>
              </div>
            ) : (
              <p>{hbd.subtitle}</p>
            )}
          </div>

          <div data-hbd-anim className="mt-10 flex justify-center">
            <Link
              href="/hbd/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#e85a7a] px-6 py-3.5 text-sm font-semibold text-[#140a0d] shadow-[0_10px_30px_rgba(232,90,122,0.35)] transition hover:bg-[#f3b8c4]"
            >
              <Sparkles className="size-4" />
              ส่งการ์ดอวยพร · 12.12.2026
            </Link>
          </div>

          <div
            data-hbd-anim
            className="mt-16 flex flex-col items-center gap-2 text-[#f3b8c4]/60"
          >
            <ChevronDown className="size-5 animate-bounce" aria-hidden />
          </div>
        </div>
      </header>

      {/* Wishes — full card art, stacked reading column */}
      <div className="relative mx-auto flex max-w-2xl flex-col gap-20 px-4 pb-16 sm:gap-28 sm:px-6 sm:pb-24">
        {wishes.map((wish) => (
          <section
            key={wish.id}
            data-hbd-card
            className="will-change-transform"
            aria-label={`คำอวยพรจาก ${wish.from}`}
          >
            <div
              data-hbd-media
              className="relative overflow-hidden rounded-3xl bg-black/25 ring-1 ring-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] will-change-transform"
            >
              {wish.image ? (
                <button
                  type="button"
                  data-hbd-media-inner
                  onClick={() => openLightbox(wish.id)}
                  aria-label={`ดูรูปใหญ่ — จาก ${wish.from}`}
                  className="flex w-full cursor-zoom-in justify-center px-2 py-3 will-change-transform transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60 focus-visible:ring-inset sm:px-3 sm:py-4"
                >
                  <ProtectedImage
                    src={wish.image}
                    alt={wish.alt ?? `Wish from ${wish.from}`}
                    loading={wish.loadOnDemand ? "lazy" : "eager"}
                    className="h-auto w-full max-w-full object-contain"
                  />
                </button>
              ) : (
                <div className="flex min-h-[20rem] items-center justify-center text-6xl opacity-40">
                  {data.fan.oshiMark}
                </div>
              )}
            </div>

            <div data-hbd-copy className="mt-7 px-1 text-center sm:mt-8">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <ProtectedImage
                  src={wish.avatar || HBD_AVATAR_DEFAULT}
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover ring-2 ring-[#e85a7a]/35 sm:size-14"
                />
                <h2
                  className={cn(
                    DISPLAY,
                    "text-left text-2xl font-bold sm:text-3xl"
                  )}
                >
                  จาก {wish.from}
                </h2>
              </div>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#f7d7de]/90 sm:text-lg">
                {wish.message}
              </p>
            </div>
          </section>
        ))}
      </div>

      {/* Closing */}
      <footer
        data-hbd-close
        className="relative px-5 py-24 text-center sm:px-8 sm:py-32"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(232,90,122,0.26),transparent_58%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl">
          {hbd.closingMessage ? (
            <div
              className={cn(
                DISPLAY,
                "mx-auto flex max-w-lg flex-col items-center gap-4 sm:gap-5"
              )}
            >
              <p
                data-hbd-anim
                className="text-3xl sm:text-4xl"
                aria-hidden
              >
                💖
              </p>
              {hbd.closingMessage.includes("—") ||
              hbd.closingMessage.includes("–") ? (
                <>
                  <p
                    data-hbd-anim
                    data-hbd-close-headline
                    className="text-3xl font-bold tracking-tight text-[#fff5f7] sm:text-5xl"
                  >
                    {hbd.closingMessage.split(/\s*[—–]\s*/)[0]}
                  </p>
                  <div
                    data-hbd-anim
                    className="h-px w-28 bg-[#e85a7a]/55 sm:w-40"
                    aria-hidden
                  />
                  <p
                    data-hbd-anim
                    className="max-w-md text-lg font-semibold leading-relaxed text-[#f3b8c4]/90 sm:text-2xl"
                  >
                    {hbd.closingMessage
                      .split(/\s*[—–]\s*/)
                      .slice(1)
                      .join(" — ")}
                  </p>
                </>
              ) : (
                <p
                  data-hbd-anim
                  data-hbd-close-headline
                  className="text-3xl font-bold tracking-tight text-[#fff5f7] sm:text-5xl"
                >
                  {hbd.closingMessage}
                </p>
              )}
              <p
                data-hbd-anim
                className="mt-2 text-xl opacity-80 sm:text-2xl"
                aria-hidden
              >
                ✨
              </p>
            </div>
          ) : null}
        </div>
      </footer>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
      >
        <DialogContent
          className="flex h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-none flex-col gap-2 overflow-hidden rounded-2xl border-[#f3b8c4]/20 bg-[#140a0d] p-2 text-[#fff5f7] sm:h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-1.25rem)] sm:w-[calc(100vw-1.25rem)] sm:max-w-none sm:gap-3 sm:p-3"
          showCloseButton
        >
          {activeLightbox ? (
            <>
              <DialogHeader className="shrink-0 px-1 pt-0.5 pr-10 sm:px-2">
                <DialogTitle className={cn(DISPLAY, "text-base sm:text-lg")}>
                  จาก {activeLightbox.from}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  ดูรูปอวยพรขนาดใหญ่
                </DialogDescription>
              </DialogHeader>

              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                <ProtectedImage
                  src={activeLightbox.src}
                  alt={activeLightbox.alt}
                  className="max-h-full max-w-full h-auto w-auto object-contain"
                />

                {lightboxItems.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="รูปก่อนหน้า"
                      onClick={goPrev}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "absolute top-1/2 left-1 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/85 text-[#fff5f7] backdrop-blur-sm transition hover:bg-[#e85a7a]/90 hover:text-[#fff5f7] sm:left-3"
                      )}
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="รูปถัดไป"
                      onClick={goNext}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "absolute top-1/2 right-1 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/85 text-[#fff5f7] backdrop-blur-sm transition hover:bg-[#e85a7a]/90 hover:text-[#fff5f7] sm:right-3"
                      )}
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                ) : null}
              </div>

              <p className="shrink-0 px-1 pb-0.5 text-center text-xs tracking-wide text-[#f3b8c4]/70 sm:px-2">
                {(lightboxIndex ?? 0) + 1} / {lightboxItems.length}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </article>
  );
}
