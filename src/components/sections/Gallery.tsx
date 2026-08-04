"use client";

import { useRef } from "react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import type { VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

type GalleryProps = {
  data: VtuberProfile;
};

export function Gallery({ data }: GalleryProps) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(
        "[data-gallery-item]",
        rootRef.current
      );

      items.forEach((item, index) => {
        gsap.fromTo(
          item,
          { autoAlpha: 0, y: 36 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            delay: (index % 2) * 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    },
    { scope: rootRef }
  );

  return (
    <section
      ref={rootRef}
      id="gallery"
      className="relative scroll-mt-20 bg-[#12080c] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#140a0d] to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <p className="text-[0.7rem] tracking-[0.28em] text-[#f3b8c4]/75 uppercase sm:text-sm">
            Gallery
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Visual archive
          </h2>
          <p className="mt-4 max-w-xl text-sm text-[#f7d7de]/85 sm:text-base">
            Placeholder visuals for layout and motion — swap sources in data when
            official or fan art assets are ready.
          </p>
        </ScrollReveal>

        <ul className="mt-10 grid gap-8 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {data.gallery.map((item, index) => (
            <li
              key={item.id}
              data-gallery-item
              className={index % 2 === 1 ? "sm:mt-10" : undefined}
            >
              <Dialog>
                <DialogTrigger
                  className="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60"
                >
                  <figure>
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#1a0c12]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10080c]/80 via-transparent to-transparent opacity-80" />
                    </div>
                    <figcaption className="mt-3 flex items-baseline justify-between gap-3 border-t border-[#f3b8c4]/15 pt-3 sm:mt-4 sm:gap-4 sm:pt-4">
                      <span className="font-[family-name:var(--font-display)] text-lg sm:text-xl">
                        {item.caption ?? item.alt}
                      </span>
                      <span className="shrink-0 text-[0.65rem] tracking-[0.2em] text-[#f3b8c4]/55 uppercase sm:text-xs">
                        View
                      </span>
                    </figcaption>
                  </figure>
                </DialogTrigger>

                <DialogContent className="max-h-[90dvh] w-[min(100%,calc(100vw-1.5rem))] max-w-3xl overflow-y-auto border-[#f3b8c4]/20 bg-[#140a0d] p-3 text-[#fff5f7] sm:max-w-3xl">
                  <DialogHeader className="px-2 pt-2">
                    <DialogTitle className="font-[family-name:var(--font-display)] text-lg text-[#fff5f7] sm:text-xl">
                      {item.caption ?? item.alt}
                    </DialogTitle>
                    {item.credit ? (
                      <DialogDescription className="text-[#f3b8c4]/70">
                        {item.credit}
                      </DialogDescription>
                    ) : null}
                  </DialogHeader>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="mt-2 max-h-[70vh] w-full object-contain"
                  />
                </DialogContent>
              </Dialog>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
