"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { CafeEventSplash } from "@/components/cafe/CafeEventSplash";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { gsap, registerGsapPlugins, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { CafeEventPage, CafeEventPanel } from "@/types/vtuber";

registerGsapPlugins();

const SERIF = "font-[family-name:var(--font-cafe-serif)]";

/** Hidden until GSAP owns visibility — prevents first-paint flash. */
const HIDE_UNTIL_SCROLL = "opacity-0";

type CafeEventComicProps = {
  event: CafeEventPage;
};

function PanelLines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center sm:gap-5 sm:px-8">
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          data-panel-line
          className={cn(
            SERIF,
            HIDE_UNTIL_SCROLL,
            "max-w-[20rem] text-[1.05rem] leading-snug tracking-wide text-[#f4ebe3]/92 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:max-w-[24rem] sm:text-xl"
          )}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function PanelArt({ panel }: { panel: CafeEventPanel }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(panel.image) && !failed;
  const lines = panel.lines?.filter(Boolean) ?? [];

  const frame = cn(
    "relative w-full overflow-hidden border border-[#9a7b5a]/35 bg-[#0a0c0e]",
    "h-[85svh] sm:h-[88svh]"
  );

  return (
    <div className={frame}>
      <div
        data-panel-media
        className={cn("absolute inset-0", HIDE_UNTIL_SCROLL)}
      >
        {hasImage ? (
          <ProtectedImage
            src={panel.image}
            alt={panel.imageAlt ?? panel.caption ?? panel.id}
            wrapClassName="absolute inset-0 block"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6"
            aria-hidden
          >
            <span className="text-[0.58rem] tracking-[0.22em] text-[#9a7b5a]/85 uppercase">
              Panel TBA
            </span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,12,14,0.55)_0%,rgba(10,12,14,0.22)_55%,rgba(10,12,14,0.4)_100%)]"
          aria-hidden
        />
      </div>
      <PanelLines lines={lines} />
    </div>
  );
}

function CaseTitleBlock({ event }: { event: CafeEventPage }) {
  return (
    <div
      data-case-title
      className="mx-auto w-full max-w-md px-5 text-center sm:max-w-lg sm:px-6"
    >
      {event.status ? (
        <p className="text-[0.58rem] tracking-[0.28em] text-[#c46a7a] uppercase">
          {event.status === "upcoming" ? "CASE PENDING" : event.status}
        </p>
      ) : null}
      <h1
        className={cn(
          SERIF,
          "mt-3 text-3xl font-semibold tracking-tight text-[#f4ebe3] italic sm:text-4xl"
        )}
      >
        {event.title}
      </h1>
      {event.titleLocal ? (
        <p className="mt-2 text-sm text-[#c4b8a8] sm:text-base">
          {event.titleLocal}
        </p>
      ) : null}
    </div>
  );
}

/** Webtoon / manhwa-style vertical scrollytelling for cafe event. */
export function CafeEventComic({ event }: CafeEventComicProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const prologueLines = event.prologue?.lines?.filter(Boolean) ?? [];
  const panelImages = event.panels
    .map((panel) => panel.image)
    .filter((src): src is string => Boolean(src));

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !ready) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const prologuePin = root.querySelector<HTMLElement>(
        "[data-prologue-pin]"
      );
      const prologueLinesEls = root.querySelectorAll<HTMLElement>(
        "[data-prologue-line]"
      );
      const scrollHint = root.querySelector<HTMLElement>("[data-scroll-hint]");
      const panels = root.querySelectorAll<HTMLElement>("[data-comic-panel]");

      if (reduceMotion) {
        gsap.set(
          root.querySelectorAll(
            "[data-prologue-line], [data-panel-line], [data-panel-media]"
          ),
          { clearProps: "all", autoAlpha: 1, y: 0 }
        );
        if (scrollHint) gsap.set(scrollHint, { autoAlpha: 0 });
        return;
      }

      // Idle bob + fade out when scrolling into the case
      if (scrollHint && prologuePin) {
        const idle = gsap.timeline({ repeat: -1, yoyo: true });
        idle
          .to(scrollHint, {
            y: 7,
            autoAlpha: 0.55,
            duration: 1.15,
            ease: "sine.inOut",
          })
          .to(scrollHint, {
            y: 0,
            autoAlpha: 1,
            duration: 1.15,
            ease: "sine.inOut",
          });

        ScrollTrigger.create({
          trigger: prologuePin,
          start: "top top",
          end: "+=100",
          scrub: true,
          onUpdate: (self) => {
            if (self.progress <= 0.01) {
              if (idle.paused()) idle.resume();
              return;
            }
            idle.pause();
            gsap.set(scrollHint, {
              autoAlpha: Math.max(0, 1 - self.progress),
              y: 0,
            });
          },
          onLeave: () => {
            idle.pause();
            gsap.set(scrollHint, { autoAlpha: 0, y: 0 });
          },
          onEnterBack: () => {
            gsap.set(scrollHint, { autoAlpha: 1, y: 0 });
            idle.restart();
          },
        });
      }

      // —— Open: CASE PENDING + title visible; optional lines on scroll ——
      if (prologuePin && prologueLinesEls.length) {
        gsap.set(prologueLinesEls, { autoAlpha: 0, y: 28 });

        const holdPx = Math.max(700, prologueLinesEls.length * 180 + 280);
        const prologueTl = gsap.timeline({
          scrollTrigger: {
            trigger: prologuePin,
            start: "top top",
            end: `+=${holdPx}`,
            pin: true,
            pinSpacing: true,
            scrub: 0.85,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        prologueTl.to({}, { duration: 0.35 });

        prologueLinesEls.forEach((line, index) => {
          prologueTl.to(
            line,
            { autoAlpha: 1, y: 0, ease: "none", duration: 0.5 },
            0.35 + index * 0.5
          );
        });

        prologueTl.to({}, { duration: 0.55 });
      }

      // —— Panels: art first, then lines ——
      panels.forEach((panel) => {
        const pin = panel.querySelector<HTMLElement>("[data-panel-pin]");
        const lines = panel.querySelectorAll<HTMLElement>("[data-panel-line]");
        const media = panel.querySelector<HTMLElement>("[data-panel-media]");
        if (!pin) return;

        if (media) gsap.set(media, { autoAlpha: 0 });
        if (lines.length) gsap.set(lines, { autoAlpha: 0, y: 36 });

        const lineCount = Math.max(lines.length, 1);
        const holdPx = Math.max(900, lineCount * 170 + 480);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: "center center",
            end: `+=${holdPx}`,
            pin: true,
            pinSpacing: true,
            scrub: 0.7,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to({}, { duration: 0.25 });

        if (media) {
          tl.to(media, { autoAlpha: 1, ease: "none", duration: 0.65 }, 0.25);
        }

        const linesStart = media ? 0.25 + 0.65 + 0.2 : 0.35;
        lines.forEach((line, index) => {
          tl.to(
            line,
            { autoAlpha: 1, y: 0, ease: "none", duration: 0.45 },
            linesStart + index * 0.4
          );
        });

        tl.to({}, { duration: 0.5 });
      });

      ScrollTrigger.refresh();
    },
    {
      scope: rootRef,
      dependencies: [event.panels, event.prologue, ready],
    }
  );

  return (
    <div
      ref={rootRef}
      className="relative min-h-full bg-[#0a0c0e] text-[#d8d0c4]"
    >
      <CafeEventSplash
        title={event.title}
        titleLocal={event.titleLocal}
        images={panelImages}
        onFinished={() => setReady(true)}
      />

      {/* Open on CASE PENDING + title; optional mysterious lines after */}
      <section
        data-prologue
        className="relative z-10"
        aria-label="เปิดเคส"
      >
        <div
          data-prologue-pin
          className="relative flex min-h-[100svh] flex-col items-center justify-center gap-10 px-6 sm:gap-12"
        >
          <CaseTitleBlock event={event} />

          {prologueLines.length > 0 ? (
            <div className="relative flex w-full max-w-md flex-col items-center justify-center gap-5 text-center sm:gap-6">
              {prologueLines.map((line, index) => (
                <p
                  key={`prologue-${index}`}
                  data-prologue-line
                  className={cn(
                    SERIF,
                    HIDE_UNTIL_SCROLL,
                    "max-w-[18rem] text-[1.1rem] leading-relaxed tracking-wide text-[#f4ebe3]/88 sm:max-w-[22rem] sm:text-xl"
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          <div
            data-scroll-hint
            className="pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-[#9a7b5a]/70"
            role="status"
          >
            <span
              className={cn(
                SERIF,
                "text-sm font-medium tracking-[0.12em] text-[#c4b8a8]/75 italic sm:text-base"
              )}
            >
              เลื่อนเพื่อ{" "}
              <span className="font-semibold not-italic text-[#c4b8a8]/90">
                เปิดแฟ้ม
              </span>
            </span>
            <ChevronDown
              className="mt-0.5 size-6 text-[#9a7b5a]/80 sm:size-7"
              aria-hidden
            />
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-16 px-4 pb-20 sm:max-w-lg sm:gap-24 sm:px-5 sm:pb-28">
        {event.panels.map((panel, index) => (
          <article
            key={panel.id}
            data-comic-panel
            aria-label={`แผ่น ${index + 1}${panel.caption ? ` · ${panel.caption}` : ""}`}
          >
            <div data-panel-pin>
              <div data-panel-art>
                <PanelArt panel={panel} />
              </div>
            </div>
            {(panel.caption || panel.captionLocal || panel.body) && (
              <div
                data-panel-caption
                className="mt-4 space-y-1.5 px-1 will-change-transform sm:mt-5"
              >
                {panel.caption ? (
                  <p
                    className={cn(
                      SERIF,
                      "text-base font-semibold text-[#f4ebe3]/90 italic sm:text-lg"
                    )}
                  >
                    {panel.caption}
                  </p>
                ) : null}
                {panel.captionLocal ? (
                  <p className="text-xs tracking-wide text-[#c46a7a] sm:text-sm">
                    {panel.captionLocal}
                  </p>
                ) : null}
                {panel.body ? (
                  <p className="text-sm leading-relaxed text-[#c4b8a8] sm:text-base">
                    {panel.body}
                  </p>
                ) : null}
              </div>
            )}
          </article>
        ))}
      </div>

      {event.ctaBack ? (
        <footer className="relative z-10 border-t border-[#9a7b5a]/25 px-5 py-12 text-center sm:py-16">
          <Link
            href={event.ctaBack.url}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-2xl border-[#9a7b5a]/50 bg-transparent px-6 text-[0.7rem] tracking-[0.18em] text-[#f4ebe3] uppercase hover:border-[#c46a7a]/60 hover:bg-[#a84d5f]/15 hover:text-[#f4ebe3]"
            )}
          >
            {event.ctaBack.label}
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
