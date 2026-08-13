"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, MapPin, Clock } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { HeartAtmosphere } from "@/components/animations/HeartAtmosphere";
import {
  CafeImageLightbox,
  type CafeLightboxItem,
} from "@/components/cafe/CafeImageLightbox";
import { CafeCountdown } from "@/components/cafe/CafeCountdown";
import { CafeVenueMenuBook } from "@/components/cafe/CafeVenueMenuBook";
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

function splitCaseDate(label?: string) {
  if (!label) return [];
  return label.split(/\s*·\s*/).filter(Boolean);
}

function CaseEcg({ className }: { className?: string }) {
  const d =
    "M0 28 H28 L36 28 L42 18 L48 38 L56 28 H92 L100 28 L106 8 L114 48 L122 28 H168 L176 28 L182 16 L188 40 L196 28 H320";

  return (
    <svg
      viewBox="0 0 320 56"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("text-[#e85a7a]", className)}
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.38"
      />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-ecg-trace"
        pathLength={1000}
        style={{
          strokeDasharray: "160 840",
          filter: "drop-shadow(0 0 6px rgba(232, 90, 122, 0.85))",
        }}
      />
    </svg>
  );
}

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

type CafeLightboxSection = "venue" | "plates" | "menu" | "goods" | "otherMenu";

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
    otherMenu: (cafe.otherMenu?.items ?? []).map((item, index) => ({
      id: item.id,
      src: item.image,
      alt: item.imageAlt ?? item.caption ?? `เมนูร้าน แผ่น ${index + 1}`,
      caption: item.captionLocal
        ? `${item.caption ?? `Plate ${String(index + 1).padStart(2, "0")}`} · ${item.captionLocal}`
        : item.caption,
      group: "Evidence Ledger · Venue Menu",
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
  const dateParts = splitCaseDate(cafe.schedule.label);
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

      const kicker = copy.querySelector<HTMLElement>("[data-hero-kicker]");
      const title = copy.querySelector<HTMLElement>("[data-hero-title]");
      const tagline = copy.querySelector<HTMLElement>("[data-hero-tagline]");
      const date = copy.querySelector<HTMLElement>("[data-hero-date]");
      const cta = copy.querySelector<HTMLElement>("[data-hero-cta]");
      const scrollHint = copy.querySelector<HTMLElement>("[data-hero-scroll]");
      const redact = copy.querySelectorAll<HTMLElement>("[data-date-redact]");
      const textEls = [kicker, title, tagline, date, cta, scrollHint].filter(
        Boolean
      ) as HTMLElement[];

      gsap.set(textEls, { autoAlpha: 0 });
      if (redact.length) {
        gsap.set(redact, { scaleX: 1, transformOrigin: "left center" });
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (kicker) {
        tl.fromTo(
          kicker,
          { x: -40, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.65 },
          0.12
        );
      }
      if (title) {
        tl.fromTo(
          title,
          { x: -90, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 1 },
          0.26
        );
      }
      if (tagline) {
        tl.fromTo(
          tagline,
          { y: 18, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.7 },
          0.46
        );
      }
      if (date) {
        tl.fromTo(
          date,
          { x: 56, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.85 },
          0.58
        );
      }
      if (redact.length) {
        tl.to(
          redact,
          { scaleX: 0, duration: 0.38, stagger: 0.08, ease: "power2.in" },
          0.78
        );
      }
      if (cta) {
        tl.fromTo(
          cta,
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.7 },
          1.02
        );
      }
      if (scrollHint) {
        tl.fromTo(
          scrollHint,
          { y: 10, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.55 },
          1.18
        );
      }

      if (kv) {
        const mobile = window.matchMedia("(max-width: 639px)").matches;
        gsap.from(kv, {
          autoAlpha: 0,
          y: mobile ? 10 : 36,
          duration: 1.1,
          ease: "power3.out",
          delay: 0.2,
        });
        gsap.to(kv, {
          y: mobile ? -4 : -14,
          rotate: mobile ? 0.2 : 0.6,
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

          {/* KV — mobile top-right behind copy; desktop right column */}
          <div className="absolute top-[3.9rem] right-[-10%] z-[1] h-[62svh] w-[72%] sm:inset-y-0 sm:top-0 sm:right-0 sm:left-auto sm:h-auto sm:w-[64%] lg:w-[60%]">
            <HeartAtmosphere
              soft
              className="z-[1] opacity-30 sm:opacity-70"
            />
            <div
              ref={kvFloatRef}
              className="absolute inset-0 z-[2] flex items-start justify-end will-change-transform sm:items-center sm:pr-4 lg:pr-10"
            >
              <ProtectedImage
                src={cafe.heroImage}
                alt={cafe.heroAlt ?? ""}
                className="h-[92%] max-h-[22rem] w-auto max-w-none object-contain object-top opacity-[0.96] saturate-[0.92] contrast-110 sm:h-[84%] sm:max-h-[min(92vh,52rem)] sm:max-w-[min(100%,40rem)] sm:object-center lg:max-h-[min(94vh,56rem)]"
              />
            </div>
          </div>

          <div className="absolute inset-0 z-[3] bg-gradient-to-r from-[#0a0c0e] from-[6%] via-[#0a0c0e]/65 via-[38%] to-transparent to-[88%] sm:from-[16%] sm:via-[#0a0c0e]/50 sm:via-[38%] sm:to-[76%]" />
          <div className="absolute inset-0 z-[3] bg-gradient-to-t from-[#0a0c0e] from-[0%] via-[#0a0c0e]/80 via-[30%] to-transparent to-[58%] sm:hidden" />
          <div className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_18%_28%,rgba(168,77,95,0.1),transparent_42%)] sm:bg-[radial-gradient(ellipse_at_14%_42%,rgba(168,77,95,0.08),transparent_42%)]" />
        </div>

        <div
          ref={heroCopyRef}
          className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-start px-5 pb-16 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-10 sm:pt-[5.25rem] sm:pb-20 lg:px-16"
        >
          <div className="w-[58%] max-w-[13.75rem] sm:w-full sm:max-w-md lg:max-w-lg">
            <p
              data-hero-kicker
              className="text-[0.62rem] tracking-[0.3em] text-[#c46a7a] uppercase sm:text-[0.7rem] sm:tracking-[0.34em]"
            >
              {edition?.kicker ?? "DETECTIVE CAFE"}
            </p>

            <h1
              data-hero-title
              className={cn(
                DISPLAY,
                "mt-2 text-[clamp(1.9rem,8.4vw,2.55rem)] leading-[0.9] font-bold tracking-tight text-[#f4ebe3] sm:mt-3 sm:text-6xl md:text-7xl lg:text-[4.5rem]"
              )}
            >
              {cafe.title}
              {cafe.titleLocal ? (
                <span
                  className={cn(
                    SERIF,
                    "mt-1.5 block text-sm font-medium tracking-normal text-[#c4b8a8] sm:mt-2 sm:text-xl"
                  )}
                >
                  {cafe.titleLocal}
                </span>
              ) : null}
            </h1>

            <p
              data-hero-tagline
              className={cn(
                SERIF,
                "mt-2.5 line-clamp-2 text-[0.82rem] leading-relaxed text-[#c4b8a8] sm:mt-4 sm:max-w-sm sm:text-base"
              )}
            >
              {cafe.tagline}
            </p>
          </div>

          <div className="mt-auto mb-8 w-full sm:mt-6 sm:mb-0 sm:max-w-md lg:max-w-lg">
            {cafe.schedule.label ? (
              <div data-hero-date>
                <div className="relative overflow-hidden border border-[#9a7b5a]/35 bg-[#14100c]/92 backdrop-blur-sm">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[repeating-linear-gradient(180deg,#9a7b5a_0_8px,transparent_8px_14px)] opacity-50"
                    aria-hidden
                  />
                  <p className="px-3 py-2 pl-4 text-[0.52rem] tracking-[0.22em] text-[#9a7b5a] uppercase sm:px-4 sm:pl-5">
                    T-Minus · Case Open
                  </p>

                  {dateParts.length > 1 ? (
                    <div className="grid grid-cols-3 gap-px border-y border-[#9a7b5a]/30 bg-[#9a7b5a]/30">
                      {dateParts.map((part, index) => (
                        <div
                          key={`${part}-${index}`}
                          className="bg-[#12100e] px-1 py-2.5 text-center sm:px-2 sm:py-3.5"
                        >
                          <p
                            className={cn(
                              DISPLAY,
                              "relative text-[clamp(1.55rem,7vw,2.55rem)] leading-none font-bold tracking-tight text-[#fff8f4] tabular-nums"
                            )}
                          >
                            <span
                              data-date-redact
                              className="pointer-events-none absolute inset-y-[12%] -inset-x-[8%] origin-left scale-x-0 bg-[#12100e]"
                              aria-hidden
                            />
                            {part}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={cn(
                        DISPLAY,
                        "border-y border-[#9a7b5a]/30 px-4 py-3 pl-5 text-[clamp(1.55rem,7vw,2.55rem)] font-bold tracking-tight text-[#fff8f4] tabular-nums"
                      )}
                    >
                      {cafe.schedule.label}
                    </p>
                  )}

                  {cafe.schedule.startsAt ? (
                    <CafeCountdown
                      startsAt={cafe.schedule.startsAt}
                      endsAt={cafe.schedule.endsAt}
                      embedded
                    />
                  ) : null}

                  <div className="bg-[#0c0a09] px-3 py-2 pl-4 sm:px-4 sm:pl-5">
                    <p className="mb-1 text-[0.5rem] tracking-[0.2em] text-[#c46a7a] uppercase sm:text-[0.55rem]">
                      Sip Pulse
                    </p>
                    <CaseEcg className="h-8 w-full sm:h-10" />
                  </div>
                </div>
              </div>
            ) : null}

            <div
              data-hero-cta
              className="mt-3 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3"
            >
              <Link
                href="#dispatch"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-none border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a]"
                )}
              >
                เปิดเคส
              </Link>
              {primaryCta ? (
                <CtaLink cta={primaryCta} variant="outline" />
              ) : null}
              {restCtas.map((cta) => (
                <CtaLink
                  key={cta.url + cta.label}
                  cta={cta}
                  variant="outline"
                />
              ))}
            </div>
          </div>

          <a
            data-hero-scroll
            href="#dispatch"
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5 text-[#c4b8a8]/65 transition hover:text-[#f4ebe3]"
            aria-label="เลื่อนไปดูวันเวลาและพิกัด"
          >
            <span className="text-[0.55rem] tracking-[0.22em] uppercase">
              Scroll
            </span>
            <ChevronDown className="size-4 animate-bounce sm:size-5" />
          </a>
        </div>
      </section>

      {/* ── 2. Dispatch ── */}
      <Shell
        id="dispatch"
        className="border-y border-[#9a7b5a]/20 bg-[#0d1013] py-14 sm:py-16"
      >
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
        {cafe.otherMenu && cafe.otherMenu.items.length > 0 ? (
          <CafeVenueMenuBook
            menu={cafe.otherMenu}
            venueLabel={cafe.location.label}
            venueImage={cafe.location.image}
            venueImageAlt={cafe.location.imageAlt}
            onZoom={(index) => openLightbox("otherMenu", index)}
          />
        ) : null}
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
