"use client";

import { useRef } from "react";

import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import type { VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

type LoreProps = {
  data: VtuberProfile;
};

export function Lore({ data }: LoreProps) {
  const rootRef = useRef<HTMLElement>(null);
  const chapters = data.lore.chapters ?? [];

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const progress = root.querySelector<HTMLElement>("[data-lore-progress]");
      const track = root.querySelector<HTMLElement>("[data-lore-track]");

      if (progress && track) {
        gsap.fromTo(
          progress,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top center",
            scrollTrigger: {
              trigger: track,
              start: "top 55%",
              end: "bottom 45%",
              scrub: true,
            },
          }
        );
      }

      const chapterEls = gsap.utils.toArray<HTMLElement>(
        "[data-lore-chapter]",
        root
      );

      chapterEls.forEach((chapter) => {
        const inner = chapter.querySelector<HTMLElement>(
          "[data-lore-chapter-inner]"
        );
        const index = chapter.querySelector<HTMLElement>("[data-lore-index]");
        if (!inner) return;

        gsap.fromTo(
          [inner, index].filter(Boolean),
          { autoAlpha: 0.25, y: 48 },
          {
            autoAlpha: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: chapter,
              start: "top 75%",
              end: "top 35%",
              scrub: true,
            },
          }
        );
      });

      const paragraphEls = gsap.utils.toArray<HTMLElement>(
        "[data-lore-paragraph]",
        root
      );

      paragraphEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            delay: i * 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
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
      id="lore"
      className="relative scroll-mt-24 overflow-hidden bg-[#10080c] px-6 py-28 text-[#fff5f7] sm:px-10 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#140a0d] to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm tracking-[0.28em] text-[#f3b8c4]/75 uppercase">
            Lore
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            เรื่องราวหลังภัย
          </h2>
          {data.lore.theme ? (
            <p className="mt-4 text-sm tracking-wide text-[#e85a7a]/90">
              {data.lore.theme}
            </p>
          ) : null}
        </div>

        <div className="mt-12 max-w-2xl space-y-6">
          {data.lore.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              data-lore-paragraph
              className="text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {chapters.length > 0 ? (
          <div
            data-lore-track
            className="relative mt-24 grid gap-0 lg:grid-cols-[4rem_1fr]"
          >
            <div className="relative hidden lg:block" aria-hidden>
              <div className="sticky top-28 h-[50vh]">
                <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-[#f3b8c4]/15" />
                <div
                  data-lore-progress
                  className="absolute top-0 bottom-0 left-1/2 w-px origin-top -translate-x-1/2 bg-[#e85a7a]"
                />
              </div>
            </div>

            <div className="space-y-6">
              {chapters.map((chapter, index) => (
                <article
                  key={chapter.id}
                  data-lore-chapter
                  className="min-h-[70vh] border-t border-[#f3b8c4]/15 py-16 lg:min-h-[80vh] lg:py-24"
                >
                  <div
                    data-lore-chapter-inner
                    className="grid gap-6 md:grid-cols-[7rem_1fr] md:gap-10"
                  >
                    <span
                      data-lore-index
                      className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#e85a7a]/80"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
                        {chapter.title}
                      </h3>
                      <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg">
                        {chapter.body}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
