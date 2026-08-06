"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Clock } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { HeartAtmosphere } from "@/components/animations/HeartAtmosphere";
import {
  CafeImageLightbox,
  type CafeLightboxItem,
} from "@/components/cafe/CafeImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { CafePage, CafeVisualKind, ProjectCta } from "@/types/vtuber";

registerGsapPlugins();

type CafePromoProps = {
  cafe: CafePage;
};

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";

const VISUAL_KIND_LABEL: Record<CafeVisualKind, string> = {
  atmosphere: "Atmosphere",
  location: "Location",
  art: "Art",
  other: "Plate",
};

function CtaLink({
  cta,
  variant = "default",
}: {
  cta: ProjectCta;
  variant?: "default" | "outline";
}) {
  const external = cta.url.startsWith("http");
  return (
    <Link
      href={cta.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        buttonVariants({ size: "lg", variant }),
        "rounded-none",
        variant === "default"
          ? "border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a]"
          : "border-[#9a7b5a]/45 bg-transparent text-[#d8d0c4] hover:border-[#c46a7a]/55 hover:bg-[#a84d5f]/12 hover:text-[#f4ebe3]"
      )}
    >
      {cta.label}
      {external ? <ExternalLink className="size-4 opacity-80" /> : null}
    </Link>
  );
}

function DoubleRule({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-1", className)} aria-hidden>
      <div className="border-t-2 border-[#9a7b5a]/45" />
      <div className="border-t border-[#9a7b5a]/30" />
    </div>
  );
}

function SectionHead({
  eyebrow,
  stamp,
  title,
  titleLocal,
  className,
}: {
  eyebrow: string;
  stamp?: string;
  title: string;
  titleLocal?: string;
  className?: string;
}) {
  return (
    <ScrollReveal variant="editorial" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
        <p className="text-[0.65rem] tracking-[0.28em] text-[#9a7b5a] uppercase sm:text-[0.68rem] sm:tracking-[0.32em]">
          {eyebrow}
        </p>
        {stamp ? (
          <span className="border border-[#a84d5f]/40 px-2 py-0.5 text-[0.58rem] tracking-[0.2em] text-[#c46a7a] uppercase sm:text-[0.6rem] sm:tracking-[0.22em]">
            {stamp}
          </span>
        ) : null}
      </div>
      <h2
        className={cn(
          SERIF,
          "mt-3 text-[1.75rem] leading-tight font-semibold text-[#f4ebe3] sm:mt-4 sm:text-3xl md:text-4xl"
        )}
      >
        {title}
        {titleLocal ? (
          <span
            className={cn(
              DISPLAY,
              "mt-1.5 block text-base font-medium text-[#c4b8a8] sm:mt-2 sm:text-lg md:text-xl"
            )}
          >
            {titleLocal}
          </span>
        ) : null}
      </h2>
      <DoubleRule className="mt-5 max-w-sm sm:mt-6" />
    </ScrollReveal>
  );
}

function CafeThumb({
  src,
  alt,
  frameClassName,
  imageClassName,
  onOpen,
}: {
  src?: string;
  alt: string;
  frameClassName?: string;
  imageClassName?: string;
  onOpen?: () => void;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-[3/4] items-center justify-center border border-dashed border-[#9a7b5a]/30 bg-[#0d1013]",
          frameClassName
        )}
        aria-hidden
      >
        <span className="text-[0.58rem] tracking-[0.18em] text-[#9a7b5a]/80 uppercase">
          Photo TBA
        </span>
      </div>
    );
  }

  const frame = cn(
    "relative aspect-[3/4] overflow-hidden border border-[#9a7b5a]/30 bg-[#0d1013]",
    frameClassName
  );
  const image = (
    <ProtectedImage
      src={src}
      alt={alt}
      wrapClassName="absolute inset-0 block"
      className={cn("h-full w-full object-cover", imageClassName)}
    />
  );

  if (!onOpen) {
    return <div className={frame}>{image}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`ดูรูป: ${alt}`}
      className={cn(
        frame,
        "cursor-zoom-in text-left transition hover:border-[#c46a7a]/45"
      )}
    >
      {image}
    </button>
  );
}

type CafeLightboxSection = "venue" | "plates" | "menu" | "goods";

function buildCafeLightboxGroups(cafe: CafePage): Record<
  CafeLightboxSection,
  CafeLightboxItem[]
> {
  return {
    venue: cafe.location.image
      ? [
          {
            id: "location",
            src: cafe.location.image,
            alt: cafe.location.imageAlt ?? cafe.location.label,
            caption: cafe.location.detail ?? cafe.location.label,
            group: "Dispatch · Venue",
          },
        ]
      : [],
    plates: (cafe.visuals ?? []).map((visual) => ({
      id: visual.id,
      src: visual.src,
      alt: visual.alt,
      caption: visual.caption ?? visual.alt,
      group: `Photographic Plates · ${VISUAL_KIND_LABEL[visual.kind ?? "other"]}`,
    })),
    menu: cafe.menu
      .filter((item) => Boolean(item.image))
      .map((item) => ({
        id: `menu-${item.id}`,
        src: item.image as string,
        alt: item.imageAlt ?? item.name,
        caption: item.nameLocal
          ? `${item.name} · ${item.nameLocal}`
          : item.name,
        group: "Evidence Ledger · Menu",
      })),
    goods: (cafe.goods ?? [])
      .filter((item) => Boolean(item.image))
      .map((item) => ({
        id: `goods-${item.id}`,
        src: item.image as string,
        alt: item.imageAlt ?? item.name,
        caption: item.nameLocal
          ? `${item.name} · ${item.nameLocal}`
          : item.name,
        group: "Recovered Property · Goods",
      })),
  };
}

function Shell({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 px-5 py-12 sm:scroll-mt-24 sm:px-10 sm:py-16 lg:px-16 lg:py-20",
        className
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function CafePromo({ cafe }: CafePromoProps) {
  const rootRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const kvFloatRef = useRef<HTMLDivElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const [primaryCta, ...restCtas] = cafe.ctas;
  const edition = cafe.edition;
  const lightboxGroups = useMemo(() => buildCafeLightboxGroups(cafe), [cafe]);
  const [lightbox, setLightbox] = useState<{
    section: CafeLightboxSection;
    index: number;
  } | null>(null);

  const openLightbox = (section: CafeLightboxSection, index: number) => {
    if (!lightboxGroups[section][index]) return;
    setLightbox({ section, index });
  };

  const lightboxItems = lightbox ? lightboxGroups[lightbox.section] : [];
  const lightboxIndex = lightbox?.index ?? null;

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduceMotion) return;

      const bg = heroBgRef.current;
      const kv = kvFloatRef.current;
      const copy = heroCopyRef.current;
      if (!bg || !copy) return;

      gsap.fromTo(
        bg,
        { scale: 1.04, yPercent: -2 },
        {
          scale: 1,
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "+=70%",
            scrub: true,
          },
        }
      );

      const copyTargets =
        copy.querySelector(":scope > div")?.children ?? copy.children;
      gsap.from(copyTargets, {
        autoAlpha: 0,
        y: 28,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        delay: 0.15,
      });

      if (kv) {
        const mobile = window.matchMedia("(max-width: 639px)").matches;
        gsap.from(kv, {
          autoAlpha: 0,
          y: mobile ? 20 : 36,
          duration: 1.1,
          ease: "power3.out",
          delay: 0.2,
        });
        gsap.to(kv, {
          y: mobile ? -8 : -14,
          rotate: mobile ? 0.35 : 0.6,
          duration: 2.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1.2,
        });
      }
    },
    { scope: rootRef }
  );

  return (
    <article
      ref={rootRef}
      className="relative bg-[#0a0c0e] text-[#d8d0c4]"
      style={
        {
          "--cafe-ink": "#0a0c0e",
          "--cafe-panel": "#12161a",
          "--cafe-line": "#9a7b5a",
          "--cafe-rose": "#a84d5f",
          "--cafe-rose-soft": "#c46a7a",
          "--cafe-muted": "#c4b8a8",
        } as CSSProperties
      }
    >
      {/* ── 1. Hero: hybrid — home-like split + cafe tone ── */}
      <section
        id="overview"
        className="relative min-h-[100svh] scroll-mt-20 overflow-hidden sm:scroll-mt-24"
      >
        <div ref={heroBgRef} className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[#0a0c0e]" />

          {/* KV / art panel — bottom-right on mobile (under copy), right column on desktop */}
          <div className="absolute inset-x-0 bottom-0 h-[52svh] translate-x-[8%] sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[58%] sm:translate-x-0 lg:w-[54%]">
            <HeartAtmosphere
              soft
              className="z-[1] opacity-70 sm:opacity-90"
            />
            <div
              ref={kvFloatRef}
              className="absolute inset-0 z-[2] flex items-end justify-end will-change-transform pr-1 sm:items-center sm:pr-2 lg:pr-8"
            >
              <ProtectedImage
                src={cafe.heroImage}
                alt={cafe.heroAlt ?? ""}
                className="h-[94%] max-h-[26rem] w-auto max-w-[92%] object-contain object-bottom opacity-95 saturate-[0.9] contrast-110 sm:h-[78%] sm:max-h-[min(88vh,46rem)] sm:max-w-[min(100%,34rem)] sm:-translate-x-[10%] sm:translate-y-[8%] sm:object-center lg:max-h-[min(90vh,50rem)]"
              />
            </div>
          </div>

          {/* Separation gradients — left/top ink for overlapping mobile copy */}
          <div className="absolute inset-0 z-[3] bg-gradient-to-b from-[#0a0c0e] from-[8%] via-[#0a0c0e]/55 via-[42%] to-transparent to-[78%] sm:bg-gradient-to-r sm:from-[#0a0c0e] sm:from-[20%] sm:via-[#0a0c0e]/70 sm:via-[44%] sm:to-transparent sm:to-[80%]" />
          <div className="absolute inset-0 z-[3] bg-gradient-to-r from-[#0a0c0e]/80 from-[0%] via-[#0a0c0e]/25 via-[48%] to-transparent to-[72%] sm:hidden" />
          <div className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_78%_88%,rgba(168,77,95,0.12),transparent_42%)] sm:bg-[radial-gradient(ellipse_at_18%_40%,rgba(168,77,95,0.1),transparent_40%)]" />
        </div>

        <div
          ref={heroCopyRef}
          className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-start px-5 pb-10 pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-10 sm:pt-32 sm:pb-20 lg:px-16"
        >
          <div className="w-full sm:max-w-md lg:max-w-lg">
            <p className="w-full text-[0.62rem] tracking-[0.26em] text-[#c46a7a] uppercase sm:text-[0.65rem] sm:tracking-[0.3em]">
              {edition?.kicker ?? "SPECIAL EDITION"}
              {edition?.caseNo ? (
                <span className="text-[#9a7b5a]">
                  {" "}
                  · {edition.caseNo}
                </span>
              ) : null}
            </p>

            <p
              className={cn(
                SERIF,
                "mt-2 w-[70%] text-base tracking-[0.02em] text-[#f4ebe3]/90 italic sm:mt-3 sm:w-full sm:text-xl"
              )}
            >
              {edition?.masthead ?? "The Honey Pulse Gazette"}
            </p>

            <DoubleRule className="mt-4 max-w-[12rem] sm:mt-5" />

            <h1
              className={cn(
                SERIF,
                "mt-5 w-full text-[clamp(2.35rem,10vw,3.4rem)] leading-[0.95] font-semibold tracking-tight text-[#f4ebe3] sm:mt-6 sm:text-5xl md:text-6xl lg:text-[4.25rem]"
              )}
            >
              {cafe.title}
              {cafe.titleLocal ? (
                <span
                  className={cn(
                    DISPLAY,
                    "mt-2 block text-base font-medium tracking-normal text-[#c4b8a8] sm:mt-2.5 sm:text-xl"
                  )}
                >
                  {cafe.titleLocal}
                </span>
              ) : null}
            </h1>

            <div className="mt-4 w-[70%] sm:mt-5 sm:w-full">
              <p
                className={cn(
                  SERIF,
                  "max-w-[18rem] text-[0.95rem] leading-relaxed text-[#c4b8a8] sm:max-w-sm sm:text-lg"
                )}
              >
                {cafe.tagline}
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
                {primaryCta ? <CtaLink cta={primaryCta} /> : null}
                {restCtas.map((cta) => (
                  <CtaLink
                    key={cta.url + cta.label}
                    cta={cta}
                    variant="outline"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Dispatch ── */}
      <Shell className="border-y border-[#9a7b5a]/20 bg-[#0d1013] py-14 sm:py-16">
        <SectionHead
          eyebrow="Dispatch"
          stamp="CONFIDENTIAL"
          title="Window & Location"
          titleLocal="กรอบเวลาและพิกัดเคส"
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-8">
          <ScrollReveal variant="soft">
            <div className="grid gap-0 border border-[#9a7b5a]/25 bg-[#12161a]/80 sm:grid-cols-2">
              <div className="flex gap-4 border-b border-[#9a7b5a]/20 px-5 py-6 sm:border-r sm:border-b-0 sm:px-6">
                <Clock className="mt-0.5 size-5 shrink-0 text-[#a84d5f]" />
                <div>
                  <p className="text-[0.65rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
                    {cafe.schedule.label}
                  </p>
                  <p
                    className={cn(
                      SERIF,
                      "mt-2 text-base leading-snug text-[#f4ebe3] sm:text-lg"
                    )}
                  >
                    {cafe.schedule.detail ?? "TBA"}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 px-5 py-6 sm:px-6">
                <MapPin className="mt-0.5 size-5 shrink-0 text-[#a84d5f]" />
                <div>
                  <p className="text-[0.65rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
                    {cafe.location.label}
                  </p>
                  <p
                    className={cn(
                      SERIF,
                      "mt-2 text-base leading-snug text-[#f4ebe3] sm:text-lg"
                    )}
                  >
                    {cafe.location.detail ?? "TBA"}
                  </p>
                  {cafe.location.mapUrl ? (
                    <Link
                      href={cafe.location.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#c46a7a] transition hover:text-[#f4ebe3]"
                    >
                      เปิดแผนที่
                      <ExternalLink className="size-3.5 opacity-70" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {cafe.location.image ? (
            <ScrollReveal variant="soft" delay={0.06}>
              <figure className="mx-auto w-full max-w-[14rem] overflow-hidden border border-[#9a7b5a]/25 bg-[#12161a] lg:mx-0">
                <button
                  type="button"
                  onClick={() => openLightbox("venue", 0)}
                  aria-label={`ดูรูป: ${cafe.location.imageAlt ?? cafe.location.label}`}
                  className="block w-full cursor-zoom-in text-left transition hover:opacity-95"
                >
                  <ProtectedImage
                    src={cafe.location.image}
                    alt={cafe.location.imageAlt ?? cafe.location.label}
                    className="aspect-[4/3] w-full object-cover opacity-90"
                  />
                </button>
                <figcaption className="border-t border-[#9a7b5a]/20 px-3 py-2 text-[0.58rem] tracking-[0.16em] text-[#9a7b5a] uppercase">
                  Venue
                </figcaption>
              </figure>
            </ScrollReveal>
          ) : null}
        </div>
      </Shell>

      {/* ── 3. Photographic plates — compact contact sheet ── */}
      {cafe.visuals && cafe.visuals.length > 0 ? (
        <Shell id="plates" className="py-14 sm:py-16">
          <SectionHead
            eyebrow="Photographic Plates"
            stamp="SAMPLE ART"
            title="บรรยากาศ · สถานที่ · งานศิลป์"
          />
          <div className="mt-7 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3">
            {cafe.visuals.map((visual, index) => (
              <ScrollReveal
                key={visual.id}
                delay={Math.min(index * 0.04, 0.28)}
                variant="soft"
                className="min-w-0"
              >
                <figure className="group overflow-hidden border border-[#9a7b5a]/25 bg-[#12161a]">
                  <button
                    type="button"
                    onClick={() => openLightbox("plates", index)}
                    aria-label={`ดูรูป: ${visual.alt}`}
                    className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden text-left"
                  >
                    <ProtectedImage
                      src={visual.src}
                      alt={visual.alt}
                      className={cn(
                        "h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]",
                        visual.kind === "art" && "object-[center_18%]"
                      )}
                    />
                  </button>
                  <figcaption className="space-y-0.5 border-t border-[#9a7b5a]/20 px-2.5 py-2 sm:px-3">
                    <span className="block text-[0.58rem] tracking-[0.16em] text-[#a84d5f] uppercase">
                      {VISUAL_KIND_LABEL[visual.kind ?? "other"]} ·{" "}
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {visual.caption ? (
                      <span
                        className={cn(
                          SERIF,
                          "line-clamp-1 text-xs text-[#c4b8a8]"
                        )}
                      >
                        {visual.caption}
                      </span>
                    ) : null}
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </Shell>
      ) : null}

      {/* ── 4. Day schedule ── */}
      {cafe.daySchedule && cafe.daySchedule.items.length > 0 ? (
        <Shell
          id="day-schedule"
          className="border-y border-[#9a7b5a]/20 bg-[#0d1013]"
        >
          <SectionHead
            eyebrow="Dossier · Timeline"
            stamp="RESTRICTED"
            title={cafe.daySchedule.title}
            titleLocal={cafe.daySchedule.titleLocal}
          />
          {cafe.daySchedule.dateLabel ? (
            <ScrollReveal variant="editorial" delay={0.05}>
              <p className="mt-4 text-sm tracking-[0.16em] text-[#9a7b5a] uppercase">
                {cafe.daySchedule.dateLabel}
              </p>
            </ScrollReveal>
          ) : null}

          <ol className="mt-10 border border-[#9a7b5a]/25">
            {cafe.daySchedule.items.map((item, index) => (
              <ScrollReveal
                key={`${item.time}-${item.title}`}
                as="li"
                delay={index * 0.05}
                variant="soft"
                className="grid gap-3 border-b border-[#9a7b5a]/20 bg-[#12161a]/50 px-5 py-7 last:border-b-0 sm:grid-cols-[5.5rem_1fr] sm:gap-8 sm:px-8"
              >
                <div>
                  <span className="text-[0.6rem] tracking-[0.18em] text-[#9a7b5a] uppercase">
                    Entry {String(index + 1).padStart(2, "0")}
                  </span>
                  <p
                    className={cn(
                      SERIF,
                      "mt-1 text-xl font-semibold tracking-wide text-[#c46a7a] tabular-nums sm:text-2xl"
                    )}
                  >
                    {item.time}
                  </p>
                </div>
                <div>
                  <h3
                    className={cn(
                      SERIF,
                      "text-xl font-semibold text-[#f4ebe3] sm:text-2xl"
                    )}
                  >
                    {item.title}
                  </h3>
                  {item.titleLocal ? (
                    <p className="mt-1 text-sm text-[#c4b8a8]">
                      {item.titleLocal}
                    </p>
                  ) : null}
                  {item.detail ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#c4b8a8]/90 sm:text-base">
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              </ScrollReveal>
            ))}
          </ol>
        </Shell>
      ) : null}

      {/* ── 5. Clues ── */}
      <Shell>
        <SectionHead
          eyebrow="Intelligence Brief"
          stamp="CLUES"
          title="จุดสังเกตของเคส"
        />
        <div
          className="mt-10 grid gap-px border border-[#9a7b5a]/25 bg-[#9a7b5a]/25 sm:grid-cols-3"
          role="list"
        >
          {cafe.highlights.map((item, index) => (
            <ScrollReveal
              key={item}
              delay={index * 0.08}
              variant="float"
            >
              <div
                role="listitem"
                className="h-full bg-[#12161a] px-5 py-8 sm:px-6"
              >
                <span className="text-[0.65rem] tracking-[0.24em] text-[#a84d5f] uppercase">
                  Clue {String(index + 1).padStart(2, "0")}
                </span>
                <p
                  className={cn(
                    SERIF,
                    "mt-4 text-base leading-relaxed text-[#d8d0c4] sm:text-lg"
                  )}
                >
                  {item}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Shell>

      {/* ── 6. Menu ledger — portrait plates ready for photos ── */}
      <Shell
        id="menu"
        className="border-y border-[#9a7b5a]/20 bg-[#0d1013]"
      >
        <SectionHead
          eyebrow="Evidence Ledger · Menu"
          stamp="EXHIBIT A"
          title="บันทึกเมนู"
        />
        <ul className="mt-8 space-y-2.5 sm:mt-10 sm:space-y-3">
          {cafe.menu.map((item, index) => (
            <ScrollReveal
              key={item.id}
              as="li"
              delay={index * 0.06}
              variant="soft"
              className="grid list-none gap-4 border border-[#9a7b5a]/25 bg-[#12161a]/60 p-3.5 sm:grid-cols-[5.5rem_8.5rem_1fr_auto] sm:items-center sm:gap-7 sm:p-5"
            >
              <p className="text-[0.62rem] tracking-[0.18em] text-[#9a7b5a] uppercase sm:text-[0.65rem] sm:tracking-[0.2em]">
                Ex. {String(index + 1).padStart(2, "0")}
              </p>
              <CafeThumb
                src={item.image}
                alt={item.imageAlt ?? item.name}
                frameClassName="w-full max-w-[9.5rem] sm:w-[8.5rem] sm:max-w-none"
                onOpen={
                  item.image
                    ? () =>
                        openLightbox(
                          "menu",
                          lightboxGroups.menu.findIndex(
                            (entry) => entry.id === `menu-${item.id}`
                          )
                        )
                    : undefined
                }
              />
              <div className="min-w-0 sm:col-span-1">
                <h3
                  className={cn(
                    SERIF,
                    "text-lg font-semibold text-[#f4ebe3] sm:text-2xl"
                  )}
                >
                  {item.name}
                </h3>
                {item.nameLocal ? (
                  <p className="mt-0.5 text-xs text-[#c4b8a8] sm:mt-1 sm:text-sm">
                    {item.nameLocal}
                  </p>
                ) : null}
                {item.description ? (
                  <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[#c4b8a8]/90 sm:mt-2 sm:text-sm">
                    {item.description}
                  </p>
                ) : null}
              </div>
              {item.priceLabel ? (
                <p className="shrink-0 self-start border border-[#a84d5f]/40 px-2 py-1 text-[0.58rem] tracking-[0.18em] text-[#c46a7a] uppercase sm:self-center sm:text-[0.62rem] sm:tracking-[0.2em]">
                  {item.priceLabel}
                </p>
              ) : null}
            </ScrollReveal>
          ))}
        </ul>
      </Shell>

      {/* ── 7. Goods — mixed proportions ── */}
      {cafe.goods && cafe.goods.length > 0 ? (
        <Shell id="goods">
          <SectionHead
            eyebrow="Recovered Property"
            stamp="FOR HONEY ONLY"
            title="ของที่ระลึก"
          />
          <ul className="mt-7 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 lg:grid-cols-3">
            {cafe.goods.map((item, index) => (
              <ScrollReveal
                key={item.id}
                as="li"
                delay={Math.min(index * 0.05, 0.3)}
                variant="soft"
                className="flex list-none flex-col overflow-hidden border border-[#9a7b5a]/25 bg-[#12161a]"
              >
                {item.image ? (
                  <button
                    type="button"
                    onClick={() =>
                      openLightbox(
                        "goods",
                        lightboxGroups.goods.findIndex(
                          (entry) => entry.id === `goods-${item.id}`
                        )
                      )
                    }
                    aria-label={`ดูรูป: ${item.imageAlt ?? item.name}`}
                    className="block w-full cursor-zoom-in text-left"
                  >
                    <ProtectedImage
                      src={item.image}
                      alt={item.imageAlt ?? item.name}
                      wrapClassName="block w-full"
                      className="aspect-[4/3] w-full object-cover object-top"
                    />
                  </button>
                ) : (
                  <div
                    className="flex aspect-[4/3] items-center justify-center border-b border-dashed border-[#9a7b5a]/25 bg-[#0d1013]"
                    aria-hidden
                  >
                    <span className="text-[0.58rem] tracking-[0.18em] text-[#9a7b5a]/80 uppercase">
                      Photo TBA
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col border-t border-[#9a7b5a]/20 px-3 py-3.5 sm:px-4 sm:py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.58rem] tracking-[0.18em] text-[#a84d5f] uppercase">
                      Item {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.55rem] tracking-[0.14em] text-[#9a7b5a]/80 uppercase">
                      Recovered
                    </span>
                  </div>
                  <h3
                    className={cn(
                      SERIF,
                      "mt-2 text-base font-semibold text-[#f4ebe3] sm:text-lg"
                    )}
                  >
                    {item.name}
                  </h3>
                  {item.nameLocal ? (
                    <p className="mt-0.5 text-xs text-[#c4b8a8] sm:text-sm">
                      {item.nameLocal}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#c4b8a8]/90 sm:text-sm">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </ScrollReveal>
            ))}
          </ul>
        </Shell>
      ) : null}

      {/* ── 8. Closing ── */}
      <Shell className="border-t border-[#9a7b5a]/20 bg-[#0d1013]">
        <div className="mx-auto max-w-2xl">
          <SectionHead
            eyebrow="Closing Note"
            stamp="END OF EDITION"
            title="สรุปฉบับนี้"
          />
          {cafe.body.map((paragraph, index) => (
            <ScrollReveal
              key={paragraph.slice(0, 32)}
              delay={index * 0.06}
              variant="soft"
            >
              <p
                className={cn(
                  SERIF,
                  "mt-5 text-base leading-relaxed text-[#d8d0c4] sm:text-lg"
                )}
              >
                {paragraph}
              </p>
            </ScrollReveal>
          ))}

          <ScrollReveal variant="float" delay={0.1}>
            <div className="mt-10 flex flex-wrap gap-3">
              {cafe.ctas.map((cta, index) => (
                <CtaLink
                  key={cta.url + cta.label}
                  cta={cta}
                  variant={index === 0 ? "default" : "outline"}
                />
              ))}
            </div>
          </ScrollReveal>

          {cafe.disclaimer ? (
            <ScrollReveal variant="editorial" delay={0.12}>
              <p className="mt-10 border-t border-[#9a7b5a]/25 pt-5 text-xs leading-relaxed text-[#9a7b5a]/85">
                {cafe.disclaimer}
              </p>
            </ScrollReveal>
          ) : null}
        </div>
      </Shell>

      <CafeImageLightbox
        items={lightboxItems}
        activeIndex={lightboxIndex}
        onActiveIndexChange={(index) => {
          if (index === null || !lightbox) {
            setLightbox(null);
            return;
          }
          setLightbox({ section: lightbox.section, index });
        }}
      />
    </article>
  );
}
