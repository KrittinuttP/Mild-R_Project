"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ParallaxScene } from "@/components/animations/ParallaxScene";
import { buttonVariants } from "@/components/ui/button";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { LEAD_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

type HeroProps = {
  data: VtuberProfile;
};

export function Hero({ data }: HeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const youtube = data.socials.find((s) => s.platform === "youtube");

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const unit = root.querySelector<HTMLElement>("[data-hero-unit]");
      const title = root.querySelector<HTMLElement>("[data-hero-title]");
      const greet = root.querySelector<HTMLElement>("[data-hero-greet]");
      const cta = root.querySelector<HTMLElement>("[data-hero-cta]");
      const scrollHint = root.querySelector<HTMLElement>("[data-hero-scroll]");
      const character = root.querySelector<HTMLElement>("[data-hero-char]");
      const textEls = [unit, title, greet, cta, scrollHint].filter(
        Boolean
      ) as HTMLElement[];

      if (reduceMotion) {
        gsap.set([character, ...textEls].filter(Boolean), {
          clearProps: "all",
          autoAlpha: 1,
        });
        return;
      }

      // Hide before first paint of timeline so entrance is visible
      gsap.set(textEls, { autoAlpha: 0 });
      if (character) {
        gsap.set(character, {
          autoAlpha: 0,
          y: 48,
          scale: 1.08,
          transformPerspective: 1000,
          transformOrigin: "50% 45%",
          force3D: true,
        });
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (character) {
        tl.to(
          character,
          { autoAlpha: 1, y: 0, scale: 1, duration: 1.35 },
          0
        );
      }

      if (unit) {
        tl.fromTo(
          unit,
          { x: -110, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.85 },
          0.2
        );
      }

      if (title) {
        tl.fromTo(
          title,
          { x: -140, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 1.05 },
          0.32
        );
      }

      if (greet) {
        tl.fromTo(
          greet,
          { x: 120, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.95 },
          0.48
        );
      }

      if (cta) {
        tl.fromTo(
          cta,
          { y: 44, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8 },
          0.62
        );
      }

      if (scrollHint) {
        tl.fromTo(
          scrollHint,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.65 },
          0.85
        );
      }

      // Subtle 3D tilt — use GSAP rotationX/Y (not CSS rotateX/Y)
      if (!character || window.matchMedia("(pointer: coarse)").matches) {
        return;
      }

      const tiltX = gsap.quickTo(character, "rotationX", {
        duration: 0.5,
        ease: "power3.out",
      });
      const tiltY = gsap.quickTo(character, "rotationY", {
        duration: 0.5,
        ease: "power3.out",
      });

      const onMove = (event: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        tiltY(px * 14);
        tiltX(py * -10);
      };

      const onLeave = () => {
        tiltX(0);
        tiltY(0);
      };

      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);

      return () => {
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="[perspective:1200px]">
      <ParallaxScene
        layers={data.parallax_layers}
        className="min-h-[100dvh]"
        travel={160}
      >
        <section
          aria-label={`${data.basic.name} hero`}
          className="relative flex min-h-[100dvh] flex-col justify-end px-6 pb-16 pt-28 sm:px-10 lg:px-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/90 via-[#140a0d]/35 to-transparent" />

          <div className="relative mx-auto w-full max-w-6xl">
            <p
              data-hero-unit
              className="mb-3 text-sm tracking-[0.28em] text-[#f3b8c4]/80 uppercase"
            >
              {data.basic.unit}
            </p>

            <h1
              data-hero-title
              className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,14vw,9rem)] leading-tight font-normal tracking-normal text-[#fff5f7]"
            >
              {data.basic.name}
            </h1>

            <p
              data-hero-greet
              className={cn("mt-4 max-w-xl", LEAD_CLASS, "text-[#f7d7de]/90")}
            >
              {data.basic.greeting}
            </p>

            <div
              data-hero-cta
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              {youtube ? (
                <Link
                  href={youtube.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "rounded-full bg-[#e85a7a] px-6 text-white hover:bg-[#d44868]"
                  )}
                >
                  Watch on YouTube
                </Link>
              ) : null}

              <Link
                href="#profile"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full border-[#f3b8c4]/40 bg-transparent text-[#fff5f7] hover:bg-[#fff5f7]/10"
                )}
              >
                Meet {data.basic.name}
              </Link>
            </div>
          </div>

          <a
            data-hero-scroll
            href="#profile"
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[#f3b8c4]/70 transition hover:text-[#fff5f7]"
            aria-label="Scroll to profile"
          >
            <span className="text-[0.65rem] tracking-[0.2em] uppercase">
              Scroll
            </span>
            <ChevronDown className="size-5 animate-bounce" />
          </a>
        </section>
      </ParallaxScene>
    </div>
  );
}
