"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { CafeCountdown } from "@/components/cafe/CafeCountdown";
import {
  CaseGhostMotifs,
  GoldDiamond,
  GoldDoubleFrame,
  SherlockSweetieLogo,
} from "@/components/cafe/SherlockSweetieLogo";
import {
  Classified,
  ClassifiedStamp,
  EmptyFrame,
  FELT_FRAME,
  FELT_STYLE,
  HAND,
  LABEL,
  Paper,
  SERIF,
  Stamp,
  THAI,
  TILT,
  TYPE,
  tiltStyle,
} from "@/components/cafe/board/pieces";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

type Point = { x: number; y: number };

/** Quadratic bend. `drop` > 0 hangs the thread; < 0 lifts it clear of the text. */
function bend(from: Point, to: Point, drop: number) {
  const x = (from.x + to.x) / 2;
  const y = (from.y + to.y) / 2 + drop;
  return `Q ${x} ${y} ${to.x} ${to.y}`;
}


/**
 * "นักสืบ: Mild-R" tag laid over the KV — she is the detective on this case,
 * never the suspect. Phone (< 1100px) and desktop each have their own
 * position and size — tune them here independently.
 * Phone: the KV column is raised (z-30) so the tag sits in front of everything.
 */
const DETECTIVE_TAG =
  "absolute z-20 whitespace-nowrap border border-cafe-gold/70 bg-cafe-cream/95 font-bold text-cafe-forest shadow-md";
const DETECTIVE_TAG_MOBILE =
  "bottom-[8%] left-1 rotate-[-4deg] px-1.5 py-0.5 text-sm";
const DETECTIVE_TAG_DESKTOP =
  "bottom-[12%] -right-[6%] rotate-[-4deg] px-3 py-1 text-xl";

/** "SUN · 06 · 12 · 2026", as on the GB01 banner. Fixed to Bangkok time so server and client agree. */
function bannerDate(startsAt: string | undefined, fallback: string) {
  if (!startsAt) return fallback;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday").toUpperCase()} · ${part("day")} · ${part("month")} · ${part("year")}`;
}

function BoardThread({
  boardRef,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
}) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const board = boardRef.current;
    const path = pathRef.current;
    if (!board || !path) return;

    let drawn = "";
    const measure = () => {
      const box = board.getBoundingClientRect();
      const point = (id: string) => {
        const el = board.querySelector<HTMLElement>(`[data-pin="${id}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1) return null;
        // The SVG fills the padding box, so step in past the wooden frame.
        return {
          x: Math.round((rect.left + rect.width / 2 - box.left - board.clientLeft) * 10) / 10,
          y: Math.round((rect.top + rect.height / 2 - box.top - board.clientTop) * 10) / 10,
        };
      };
      const heart = point("heart");
      const date = point("date");
      const place = point("place");
      // One subpath, right → left. Two separate M commands would dash in parallel.
      const next =
        heart && date && place
          ? `M ${place.x} ${place.y} ${bend(place, date, -12)} ${bend(date, heart, 18)}`
          : "";
      if (next === drawn) return;
      drawn = next;
      if (next) path.setAttribute("d", next);
      else path.removeAttribute("d");
    };

    // Pins move without any resize to report: card hover, the float loop, the
    // opening timeline. Follow them every frame, but only while the board shows.
    let frame = 0;
    const follow = () => {
      measure();
      frame = requestAnimationFrame(follow);
    };
    const onScreen = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry?.isIntersecting) follow();
    });
    onScreen.observe(board);
    measure();
    return () => {
      onScreen.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [boardRef]);

  // Always rendered so the opening timeline can find the path; `pathLength`
  // lets it draw the thread with a 0–1 dash offset whatever the real length.
  // `d` is written by the effect above, outside React.
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
      aria-hidden
    >
      <path
        ref={pathRef}
        data-motion="hero-yarn"
        pathLength={1}
        fill="none"
        stroke="#c9a14a"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={1}
        style={{ filter: "drop-shadow(0 0 4px rgba(201,161,74,.85))" }}
      />
    </svg>
  );
}

/**
 * Text under a black bar. The bar rests at zero width, so the text is readable
 * without script; the opening timeline covers it and then pulls it off.
 */
function Redacted({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <span
        data-redact
        className="absolute -inset-x-1.5 -inset-y-0.5 origin-right bg-cafe-void [transform:scaleX(0)]"
        aria-hidden
      />
    </span>
  );
}

type CafeOverviewProps = {
  cafe: CafePage;
  showDispatch: boolean;
  onOpenVenue: () => void;
};

export function CafeOverview({
  cafe,
  showDispatch,
  onOpenVenue,
}: CafeOverviewProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const edition = cafe.edition;
  const schedule = cafe.dispatch.schedule;
  const location = cafe.dispatch.location;
  const hidden = !showDispatch;
  const follow = cafe.closing.ctas?.[0];
  const cutout = cafe.heroCutout || "/assets/cafe/kv/KV_cafe.webp";

  const dateText = bannerDate(schedule.startsAt, schedule.label);
  const meta = cn(
    SERIF,
    "font-bold whitespace-nowrap text-cafe-cream tracking-[0.18em] sm:tracking-[0.22em]"
  );
  const button =
    "inline-flex min-h-12 items-center justify-center px-6 text-[15px] font-semibold transition hover:-translate-y-0.5 motion-reduce:transition-none";

  return (
    <section
      id="overview"
      className="relative scroll-mt-24 px-5 pt-20 sm:px-8 sm:pt-24"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* GB01 web hero: gold double frame, ghost keyhole + lens, centred wordmark. */}
        <div
          data-motion="hero-banner"
          data-hero-intro
          className="relative isolate flex min-h-[min(640px,calc(100svh-6rem))] flex-col items-center justify-center px-4 py-16 text-center sm:px-10 sm:py-20 lg:min-h-[min(760px,calc(100svh-7rem))]"
        >
          <GoldDoubleFrame />
          <CaseGhostMotifs />
          {edition?.caseNo ? (
            <p className={cn(LABEL, "mb-8 lg:absolute lg:top-14 lg:left-16 lg:mb-0")}>
              {edition.caseNo}
            </p>
          ) : null}
          <SherlockSweetieLogo
            as="h1"
            motion="hero-title"
            label={cafe.title}
            className="text-[clamp(36px,11.6vw,128px)]"
          />
          <div data-motion="hero-meta" className="mt-9 flex flex-col items-center gap-3 sm:mt-11">
            {/* Phone: one fact per line. sm: date ◆ time, then place. xl: one row, as on GB01. */}
            <p className="flex flex-col items-center gap-x-4 gap-y-2 text-[13px] sm:flex-row sm:flex-wrap sm:justify-center sm:text-base lg:gap-x-6 lg:text-xl">
              <span className={meta}>
                <Classified hidden={hidden} tone="wall">{dateText}</Classified>
              </span>
              <GoldDiamond className="hidden sm:inline-block" />
              <span className={meta}>
                <Classified hidden={hidden} tone="wall">{schedule.detail ?? ""}</Classified>
              </span>
              <GoldDiamond className="hidden xl:inline-block" />
              <span className={cn(meta, "sm:basis-full xl:basis-auto")}>
                <Classified hidden={hidden} tone="wall">{location.label}</Classified>
              </span>
            </p>
            <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <a href="#sets" className={cn(button, "bg-cafe-gold text-cafe-ink hover:bg-cafe-gold-soft")}>
                {cafe.preorder ? "ดูเซตและจองล่วงหน้า" : "ดูเซต"}
              </a>
              {follow?.url ? (
                <Link
                  href={follow.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(button, "border border-cafe-gold/60 text-cafe-cream hover:border-cafe-gold hover:bg-cafe-gold/10")}
                >
                  {follow.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div
          ref={boardRef}
          data-motion="hero-board"
          data-hero-intro
          className={cn("relative mt-10 sm:mt-14", FELT_FRAME)}
          style={FELT_STYLE}
        >
          {/* Below 1100px the right column dissolves (`contents`), so its cards join
              this grid: character beside the case sheet, everything else full width. */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 p-3 sm:gap-6 sm:p-6 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[1100px]:items-stretch min-[1100px]:p-8">
            <div className="relative z-30 flex justify-center min-[1100px]:z-auto min-[1100px]:block min-[1100px]:self-end">
              <div
                data-motion="hero-char"
                className="animate-cafe-float relative min-[1100px]:mx-auto min-[1100px]:w-max"
              >
                <ProtectedImage
                  src={cutout}
                  alt={cafe.heroAlt ?? cafe.title}
                  className="h-[min(440px,70vw)] w-auto max-w-full object-contain min-[1100px]:h-[720px] min-[1100px]:max-w-none [filter:drop-shadow(8px_14px_10px_rgba(0,0,0,.55))]"
                />
                {/* Same tag twice so phone and desktop can be placed independently. */}
                <p className={cn(THAI, DETECTIVE_TAG, DETECTIVE_TAG_MOBILE, "min-[1100px]:hidden")}>
                  นักสืบ: Mild-R
                </p>
                <p
                  className={cn(
                    THAI,
                    DETECTIVE_TAG,
                    DETECTIVE_TAG_DESKTOP,
                    "hidden min-[1100px]:block"
                  )}
                >
                  นักสืบ: Mild-R
                </p>
                <span
                  data-pin="heart"
                  data-motion="hero-heart"
                  className="absolute top-[15%] left-[80%] z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center min-[1100px]:size-7"
                  aria-hidden
                >
                  <Heart
                    className="animate-cafe-beat size-5 fill-cafe-heart text-cafe-cream-light min-[1100px]:size-7"
                    style={{ filter: "drop-shadow(0 0 12px rgba(242,92,154,.7))" }}
                  />
                </span>
              </div>
            </div>

            <div className="contents min-w-0 flex-col gap-5 min-[1100px]:flex">
              <Paper
                tilt={-1}
                pin="title"
                motion="hero-card"
                className="px-3.5 py-4 sm:px-6 sm:py-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <p className={cn(LABEL, "text-cafe-ink-muted")}>
                    {edition?.kicker}
                    {edition?.kickerLocal ? ` · ${edition.kickerLocal}` : ""}
                  </p>
                  {cafe.statusLabel ? (
                    <Stamp
                      motion="hero-stamp"
                      className="max-w-full rotate-[-6deg] min-[1100px]:shrink-0"
                    >
                      {cafe.statusLabel}
                    </Stamp>
                  ) : null}
                </div>
                {cafe.titleLocal ? (
                  <h2 className={cn(THAI, "mt-3 text-xl leading-snug font-bold text-cafe-forest sm:text-[1.75rem]")}>
                    {cafe.titleLocal}
                  </h2>
                ) : null}
                {cafe.tagline ? (
                  <p className="mt-3 hidden max-w-xl text-[14.5px] leading-relaxed text-cafe-ink-soft min-[1100px]:block">
                    {cafe.tagline}
                  </p>
                ) : null}
              </Paper>

              {/* Narrow screens: the pitch moves below the notes (`order-2`),
                  so date and place stay together beside the character. */}
              {cafe.tagline ? (
                <Paper
                  tilt={0.4}
                  motion="hero-card"
                  className="order-2 col-span-2 px-3.5 py-3.5 sm:px-5 sm:py-5 min-[1100px]:hidden"
                >
                  <p className="text-sm leading-relaxed text-cafe-ink-soft">{cafe.tagline}</p>
                </Paper>
              ) : null}

              <>
                <div className="order-1 col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                  <Paper
                    pin="date"
                    tilt={2}
                    tone="pink"
                    motion="hero-card"
                    className="px-3 py-4 sm:px-4 sm:py-5"
                  >
                    <p className={cn(HAND, "text-base text-cafe-forest sm:text-lg")}>
                      <Classified hidden={hidden}>วันเปิดแฟ้มคดี</Classified>
                    </p>
                    <p className={cn(SERIF, "mt-1 text-xl leading-none whitespace-nowrap text-cafe-ink sm:text-[2rem]")}>
                      {hidden ? (
                        <Classified hidden>{schedule.label}</Classified>
                      ) : (
                        <Redacted>{schedule.label}</Redacted>
                      )}
                    </p>
                    {schedule.detail ? (
                      <p className="mt-2 text-sm text-cafe-ink-soft">
                        <Classified hidden={hidden}>{schedule.detail}</Classified>
                      </p>
                    ) : null}
                    {schedule.startsAt ? (
                      <div className="mt-3">
                        <CafeCountdown
                          variant="inline"
                          startsAt={schedule.startsAt}
                          endsAt={schedule.endsAt}
                          className="text-sm sm:text-lg"
                        />
                      </div>
                    ) : hidden ? (
                      <p className={cn(TYPE, "mt-3 text-sm font-bold sm:text-lg")}>
                        <Classified hidden>00 วัน 00:00:00</Classified>
                      </p>
                    ) : null}
                    {hidden ? <ClassifiedStamp /> : null}
                  </Paper>
                  <Paper
                    pin="place"
                    tilt={-2}
                    tone="mint"
                    motion="hero-card"
                    className="px-3 py-4 sm:px-4 sm:py-5"
                  >
                    <p className={cn(HAND, "text-base sm:text-lg")}>
                      <Classified hidden={hidden}>สถานที่เกิดเหตุ</Classified>
                    </p>
                    <p className={cn(SERIF, "mt-1 text-[17px] leading-tight break-words sm:text-[1.7rem]")}>
                      {hidden ? (
                        <Classified hidden>{location.label}</Classified>
                      ) : (
                        <Redacted>{location.label}</Redacted>
                      )}
                    </p>
                    {location.detail ? (
                      <p className="mt-2 text-xs sm:text-sm">
                        <Classified hidden={hidden}>{location.detail}</Classified>
                      </p>
                    ) : null}
                    {location.mapUrl ? (
                      <a
                        href={location.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline sm:mt-3"
                      >
                        เปิดแผนที่ →
                      </a>
                    ) : null}
                    {hidden ? <ClassifiedStamp /> : null}
                  </Paper>
                </div>
                  {hidden ? (
                    <div
                      data-motion="hero-card"
                      className={cn(
                        "relative order-3 col-span-2 overflow-hidden bg-cafe-cream text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
                        TILT
                      )}
                      style={tiltStyle(0.6)}
                    >
                      <EmptyFrame className="h-[170px] w-full sm:h-[250px] min-[1100px]:h-[190px]" />
                      <p className={cn(TYPE, "px-3 py-2 text-xs tracking-[0.14em] text-cafe-ink-muted uppercase")}>
                        <Classified hidden>Venue · {location.label}</Classified>
                      </p>
                      <ClassifiedStamp />
                    </div>
                  ) : location.image ? (
                    <button
                      type="button"
                      onClick={onOpenVenue}
                      aria-label={`ดูรูป: ${location.imageAlt ?? location.label}`}
                      className="group order-3 col-span-2 block w-full cursor-zoom-in text-left"
                    >
                      <span
                        data-motion="hero-card"
                        className={cn(
                          "block overflow-hidden bg-cafe-cream text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
                          TILT
                        )}
                        style={tiltStyle(0.6)}
                      >
                        <ProtectedImage
                          src={location.image}
                          alt={location.imageAlt ?? location.label}
                          wrapClassName="block h-[170px] w-full overflow-hidden sm:h-[250px] min-[1100px]:h-[190px]"
                          className="h-full w-full object-cover grayscale-[.45] transition duration-300 group-hover:grayscale-0"
                        />
                        <span className={cn(TYPE, "block px-3 py-2 text-xs tracking-[0.14em] text-cafe-ink-muted uppercase")}>
                          Venue · {location.label}
                        </span>
                      </span>
                    </button>
                  ) : null}
              </>
            </div>
          </div>

          <BoardThread boardRef={boardRef} />
        </div>
      </div>
    </section>
  );
}
