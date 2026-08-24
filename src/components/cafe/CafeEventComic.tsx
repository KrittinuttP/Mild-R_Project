"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { CafeEventSplash } from "@/components/cafe/CafeEventSplash";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { gsap, registerGsapPlugins, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { CafeEventPage, CafeEventPanel } from "@/types/vtuber";

registerGsapPlugins();

const SERIF = "font-[family-name:var(--font-cafe-serif)]";

type CafeEventComicProps = {
  event: CafeEventPage;
};

function PanelLines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center sm:gap-3.5 sm:px-8">
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          data-panel-line
          className={cn(
            SERIF,
            "max-w-[22rem] text-[1.05rem] leading-snug text-[#f4ebe3] drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] sm:text-xl"
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
    "relative w-full overflow-hidden border border-[#9a7b5a]/35 bg-[#0d1013]",
    "h-[85svh] sm:h-[88svh]"
  );

  return (
    <div className={frame}>
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
          <span className="max-w-[14rem] text-center text-[0.65rem] leading-snug text-[#9a7b5a]/65">
            ใส่ไฟล์ที่ {panel.image ?? "/assets/cafe/event/…"}
          </span>
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,12,14,0.62)_0%,rgba(10,12,14,0.28)_55%,rgba(10,12,14,0.45)_100%)]"
        aria-hidden
      />
      <PanelLines lines={lines} />
    </div>
  );
}

/** Webtoon / manhwa-style vertical scrollytelling for cafe event. */
export function CafeEventComic({ event }: CafeEventComicProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
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

      const panels = root.querySelectorAll<HTMLElement>("[data-comic-panel]");
      if (!panels.length) return;

      if (reduceMotion) {
        gsap.set(root.querySelectorAll("[data-panel-line]"), {
          clearProps: "all",
          autoAlpha: 1,
          y: 0,
        });
        return;
      }

      panels.forEach((panel) => {
        const pin = panel.querySelector<HTMLElement>("[data-panel-pin]");
        const lines = panel.querySelectorAll<HTMLElement>("[data-panel-line]");
        if (!pin) return;

        if (lines.length) gsap.set(lines, { autoAlpha: 0, y: 36 });

        const lineCount = lines.length;
        const holdPx = Math.max(720, lineCount * 160 + 280);

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

        lines.forEach((line, index) => {
          tl.to(
            line,
            { autoAlpha: 1, y: 0, ease: "none", duration: 0.45 },
            index * 0.4
          );
        });

        tl.to({}, { duration: 0.45 });
      });

      ScrollTrigger.refresh();
    },
    { scope: rootRef, dependencies: [event.panels, ready] }
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

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(168,77,95,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(154,123,90,0.12), transparent 50%)",
        }}
        aria-hidden
      />

      <header className="relative mx-auto max-w-md px-5 pt-24 pb-10 text-center sm:max-w-lg sm:px-6 sm:pt-28 sm:pb-12">
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
        {event.tagline ? (
          <p className="mt-5 text-xs leading-relaxed text-[#9a7b5a] sm:text-sm">
            {event.tagline}
          </p>
        ) : null}
        <p
          className="mt-8 text-[0.58rem] tracking-[0.22em] text-[#9a7b5a]/80 uppercase"
          aria-hidden
        >
          Scroll ↓
        </p>
      </header>

      <div className="relative mx-auto flex max-w-md flex-col gap-16 px-4 pb-20 sm:max-w-lg sm:gap-24 sm:px-5 sm:pb-28">
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
        <footer className="relative border-t border-[#9a7b5a]/25 px-5 py-12 text-center sm:py-16">
          <Link
            href={event.ctaBack.url}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-none border-[#9a7b5a]/50 bg-transparent px-6 text-[0.7rem] tracking-[0.18em] text-[#f4ebe3] uppercase hover:border-[#c46a7a]/60 hover:bg-[#a84d5f]/15 hover:text-[#f4ebe3]"
            )}
          >
            {event.ctaBack.label}
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
