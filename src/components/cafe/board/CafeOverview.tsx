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
  SherlockSweetieLogo,
} from "@/components/cafe/SherlockSweetieLogo";
import {
  Classified,
  ClassifiedStamp,
  EmptyFrame,
  FELT_FRAME,
  FELT_STYLE,
  Paper,
  SERIF,
  Stamp,
  THAI,
  TILT,
  tiltStyle,
} from "@/components/cafe/board/pieces";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { useNow } from "@/hooks/useNow";
import { preorderIsListed } from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

/** Mentions booking only while it is open; its own clock keeps the board from re-rendering. */
function SetsButtonLabel({ preorder }: { preorder: CafePage["preorder"] }) {
  const now = useNow(1000, Boolean(preorder));
  const open = Boolean(preorder) && (now === null || preorderIsListed(preorder, now));
  return <>{open ? "ดูเซตและจองล่วงหน้า" : "ดูเซต"}</>;
}

/*
 * Overview = one felt board (design H1 on desktop, H2 on phones):
 *   character cutout · Sherlock Sweetie wordmark · one-line lede · case file
 *   (date / time / scene / access) · venue polaroid · the two buttons.
 * A gold thread runs from the heart beside the character to the lock on the
 * case file, and on to the venue polaroid (desktop). While the dispatch is
 * hidden the lock is a wax seal and every value sits under a black bar.
 *
 * Desktop (≥ 1100px) and phone each get their own case-file markup; the other
 * is `hidden`, so pins measured by `BoardThread` are always the visible ones.
 */

/** "SUN · 06 DEC 2026" (date part "06 DEC 2026"). Fixed to Bangkok time so server and client agree. */
function caseDate(startsAt: string | undefined) {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: part("weekday").toUpperCase(),
    date: `${part("day")} ${part("month").toUpperCase()} ${part("year")}`,
  };
}

/**
 * The pins the thread joins, listed from the heart outward. Tags are the
 * `data-pin` ids below; a point whose element is hidden (`display: none`) is
 * skipped. The thread is drawn the other way: it runs in to the heart and
 * stops at its edge.
 */
const THREAD_ROUTES = [
  // Desktop: heart → case-file lock → venue polaroid clip.
  ["heart", "lock", "venue"],
  // Phone: heart → clip of the venue polaroid pinned beside her.
  ["heart", "venue-m"],
] as const;

type Point = { x: number; y: number; r: number };

/** Control point of a bend that hangs `sag` px below the lower end. */
function bend(from: Point, to: Point, sag: number) {
  return { x: (from.x + to.x) / 2, y: Math.max(from.y, to.y) + sag };
}

/** Quadratic bend that hangs `sag` px below the lower end. */
function hang(from: Point, to: Point, sag: number) {
  const c = bend(from, to, sag);
  return `Q ${c.x} ${c.y} ${to.x} ${to.y}`;
}

/** Pull `to` back along the curve's last direction, so the line stops at its rim. */
function stopShort(from: Point, to: Point, sag: number): Point {
  const c = bend(from, to, sag);
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  const length = Math.hypot(dx, dy);
  if (length < 1 || to.r <= 0) return to;
  const back = Math.min(to.r, length * 0.5);
  return {
    x: Math.round((to.x - (dx / length) * back) * 10) / 10,
    y: Math.round((to.y - (dy / length) * back) * 10) / 10,
    r: 0,
  };
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
      const point = (id: string): Point | null => {
        const el = board.querySelector<HTMLElement>(`[data-pin="${id}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1) return null;
        // The SVG fills the padding box, so step in past the frame.
        return {
          x: Math.round((rect.left + rect.width / 2 - box.left - board.clientLeft) * 10) / 10,
          y: Math.round((rect.top + rect.height / 2 - box.top - board.clientTop) * 10) / 10,
          r: Math.min(rect.width, rect.height) / 2,
        };
      };

      // First route whose first two points are both on screen.
      let points: Point[] = [];
      for (const route of THREAD_ROUTES) {
        const found = route.map(point);
        if (found[0] && found[1]) {
          points = found.filter((p): p is Point => p !== null);
          break;
        }
      }
      // One subpath from the far pin in to the heart, so the dash is drawn
      // towards her and ends at the heart's edge (the heart stays clear of the
      // line on every layout, whatever sits on top).
      const route = points.slice().reverse();
      const last = route.length - 1;
      const sagOf = (i: number) => (i === last - 1 ? 10 : 14);
      if (last >= 1) route[last] = stopShort(route[last - 1], route[last], sagOf(last - 1));
      const next =
        route.length >= 2
          ? `M ${route[0].x} ${route[0].y} ` +
            route
              .slice(1)
              .map((to, i) => hang(route[i], to, sagOf(i)))
              .join(" ")
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
        className="stroke-cafe-gold"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={1}
        style={{ filter: "drop-shadow(0 0 4px rgba(201,161,74,.85))" }}
      />
    </svg>
  );
}

/**
 * Where the thread is tied on the case file: a brass keyhole plate while the
 * file is open, a gold wax seal while the dispatch is still hidden.
 */
function CaseLock({
  id,
  sealed,
  className,
}: {
  id: string;
  sealed: boolean;
  className?: string;
}) {
  return (
    <span
      data-pin={id}
      className={cn(
        "absolute z-10 block -translate-x-1/2 [filter:drop-shadow(2px_4px_3px_rgba(0,0,0,.45))]",
        sealed ? "size-10 -translate-y-[60%]" : "h-8 w-6 -translate-y-[45%]",
        className
      )}
      aria-hidden
    >
      {sealed ? (
        <svg viewBox="0 0 100 100" data-lock-wax className="size-full">
          <defs>
            <radialGradient id={`${id}-wax`} cx=".4" cy=".35">
              <stop offset="0" stopColor="#e3c77e" />
              <stop offset=".6" stopColor="#c9a14a" />
              <stop offset="1" stopColor="#7a5c1c" />
            </radialGradient>
          </defs>
          <path
            d="M50 4 C62 6 66 2 74 10 C82 16 90 18 92 30 C96 40 98 48 94 58 C92 70 96 76 86 84 C78 92 70 94 58 96 C46 98 38 98 28 92 C18 88 10 84 6 72 C2 62 4 54 4 44 C4 32 10 24 18 16 C26 8 38 2 50 4 Z"
            fill={`url(#${id}-wax)`}
          />
          <circle cx="50" cy="50" r="31" fill="none" stroke="#7a5c1c" strokeWidth="2.5" opacity=".7" />
          <path
            transform="translate(50 52) scale(0.62)"
            d="M0 30 C -40 5 -45 -30 -22 -36 C -10 -39 -2 -32 0 -24 C 2 -32 10 -39 22 -36 C 45 -30 40 5 0 30 Z"
            fill="#7a5c1c"
            opacity=".85"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 64 86" className="size-full">
          <defs>
            <linearGradient id={`${id}-brass`} x1="0" x2="1">
              <stop offset="0" stopColor="#f6e4a8" />
              <stop offset=".5" stopColor="#c9a14a" />
              <stop offset="1" stopColor="#7a5c1c" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="82" rx="10" fill={`url(#${id}-brass)`} />
          <path
            fillRule="evenodd"
            d="M27 44 A10 10 0 1 1 37 44 L41 70 H23 Z"
            className="fill-cafe-ink"
          />
        </svg>
      )}
      {sealed ? null : (
        // Light running over the brass once, just before the thread leaves the pin.
        <span className="absolute inset-0 overflow-hidden rounded-[18%]">
          <span
            data-lock-glint
            className="absolute -inset-y-2 left-0 w-1/3 -translate-x-[260%] rotate-[18deg] bg-[linear-gradient(90deg,transparent,rgba(255,250,225,.95),transparent)]"
          />
        </span>
      )}
    </span>
  );
}

/** Gold paper clip that holds the venue polaroid. */
function Clip({ id, className }: { id?: string; className?: string }) {
  return (
    <span
      data-pin={id}
      className={cn(
        "absolute z-10 block w-4 rotate-[-8deg] rounded-[10px] border-[3px] border-cafe-gold",
        className
      )}
      aria-hidden
    />
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

/** A value on the case file: redaction reveal when shown, a black bar when hidden. */
function Fact({
  hidden,
  reveal = false,
  children,
}: {
  hidden: boolean;
  reveal?: boolean;
  children: ReactNode;
}) {
  if (hidden) return <Classified hidden>{children}</Classified>;
  return reveal ? <Redacted>{children}</Redacted> : <>{children}</>;
}

const KEY = cn(
  SERIF,
  "text-[10px] font-bold tracking-[0.22em] text-cafe-gold-deep uppercase min-[640px]:text-[11px]"
);
const VALUE = cn(SERIF, "font-bold tracking-[0.05em] text-cafe-ink");
const CHIP =
  "inline-block bg-cafe-forest px-2 py-0.5 font-[family-name:var(--font-cafe-serif)] font-bold tracking-[0.04em] text-cafe-cream";

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
  const when = hidden ? null : caseDate(schedule.startsAt);
  const statusLabel = hidden
    ? cafe.statusLabelSealed ?? "CASE FILE · SEALED"
    : cafe.statusLabel;

  const countdown = schedule.startsAt ? (
    <CafeCountdown
      variant="inline"
      startsAt={schedule.startsAt}
      endsAt={schedule.endsAt}
      className="min-w-0 font-[family-name:var(--font-cafe-serif)] text-[length:inherit] text-cafe-cream"
    />
  ) : null;
  const countdownChip = (size: string) =>
    hidden ? (
      <span className={cn(SERIF, size, "font-bold")}>
        <Classified hidden>00 วัน 00:00:00</Classified>
      </span>
    ) : countdown ? (
      <span className={cn(CHIP, size)}>
        <span className="mr-1 font-[family-name:var(--font-cafe-thai)] font-semibold">อีก</span>
        {countdown}
      </span>
    ) : null;

  const mapLink = (className: string) =>
    location.mapUrl && !hidden ? (
      <a
        href={location.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex min-h-11 items-center font-semibold text-cafe-ink underline decoration-cafe-gold decoration-2 underline-offset-4 hover:decoration-cafe-gold-deep",
          className
        )}
      >
        เปิดแผนที่ →
      </a>
    ) : null;

  // Venue polaroid. Clicking opens the venue photo in the lightbox.
  const venue = (variant: "wide" | "phone") => {
    const wide = variant === "wide";
    const frame = wide ? "h-28 w-full" : "h-28 w-full min-[640px]:h-40";
    const caption = cn(
      SERIF,
      "mt-1.5 block text-center text-[9px] tracking-[0.16em] text-cafe-ink-soft uppercase"
    );
    const clip = <Clip id={wide ? "venue" : "venue-m"} className="-top-5 left-4 h-12" />;
    if (hidden) {
      return (
        <span className="relative block bg-cafe-cream-light p-2 pb-1.5 shadow-[0_14px_24px_rgba(0,0,0,0.45)]">
          {clip}
          <EmptyFrame className={frame} />
          <span className={caption}>Venue · Classified</span>
          <span className="sr-only">ข้อมูลลับ</span>
        </span>
      );
    }
    if (!location.image) return null;
    return (
      <button
        type="button"
        onClick={onOpenVenue}
        aria-label={`ดูรูป: ${location.imageAlt ?? location.label}`}
        className="group relative block w-full cursor-zoom-in bg-cafe-cream-light p-2 pb-1.5 text-left shadow-[0_14px_24px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 motion-reduce:transition-none"
      >
        {clip}
        <ProtectedImage
          src={location.image}
          alt={location.imageAlt ?? location.label}
          wrapClassName={cn("block overflow-hidden", frame)}
          className="h-full w-full object-cover grayscale-[.3] transition duration-300 group-hover:grayscale-0"
        />
        {/* Sepia haze the photo "develops" out of during the opening (opacity only). */}
        <span
          data-motion="develop"
          className={cn(
            "pointer-events-none absolute inset-x-2 top-2 opacity-0 bg-[radial-gradient(circle_at_50%_45%,rgba(120,98,60,.55),rgba(40,32,20,.92))]",
            frame
          )}
          aria-hidden
        />
        <span className={caption}>Venue Photo</span>
      </button>
    );
  };

  const dateValue = when ? (
    <>
      {when.weekday} · {when.date}
    </>
  ) : (
    schedule.label
  );

  // Date · time · scene · access. Phone rows are narrower and leave no room for the polaroid.
  const facts = (phone: boolean) => {
    const row = cn(
      "grid items-baseline py-2.5",
      phone ? "grid-cols-[4.5rem_minmax(0,1fr)] gap-2" : "grid-cols-[5.5rem_minmax(0,1fr)] gap-3"
    );
    const value = cn(VALUE, phone ? "text-[15px] leading-snug" : "text-[17px]");
    const besidePhoto = phone ? "" : "pr-36";
    return (
      <dl className="divide-y divide-dashed divide-cafe-ink/20">
        <div className={cn(row, besidePhoto)}>
          <dt className={KEY}>Date</dt>
          <dd className={value}>
            <Fact hidden={hidden} reveal>
              {dateValue}
            </Fact>
            <div className="mt-1.5">{countdownChip(phone ? "text-[12px]" : "text-[12.5px]")}</div>
          </dd>
        </div>
        <div className={cn(row, besidePhoto)}>
          <dt className={KEY}>Time</dt>
          <dd className={value}>
            <Fact hidden={hidden}>{schedule.detail ?? "—"}</Fact>
          </dd>
        </div>
        <div className={row}>
          <dt className={KEY}>Scene</dt>
          <dd className={cn(value, "break-words")}>
            <Fact hidden={hidden} reveal>
              {location.label}
            </Fact>
          </dd>
        </div>
        {location.detail || location.mapUrl ? (
          <div className={cn(row, "items-center py-1.5")}>
            <dt className={KEY}>Access</dt>
            <dd className={cn("flex flex-wrap items-center gap-x-2 text-cafe-ink-soft", phone ? "text-[13px]" : "text-[13.5px]")}>
              {location.detail ? <Fact hidden={hidden}>{location.detail}</Fact> : null}
              {location.detail && location.mapUrl && !hidden ? <span aria-hidden>·</span> : null}
              {mapLink(cn("min-h-9 whitespace-nowrap", phone ? "text-[13px]" : "text-[13.5px]"))}
            </dd>
          </div>
        ) : null}
      </dl>
    );
  };

  const caseTab = edition?.caseNo ? (
    <span
      className={cn(
        SERIF,
        "absolute -top-7 left-14 flex h-7 items-center rounded-t bg-cafe-cream px-4 text-[11px] font-bold tracking-[0.22em] text-cafe-gold-deep uppercase"
      )}
    >
      {edition.caseNo}
    </span>
  ) : null;

  return (
    <section
      id="overview"
      className="relative scroll-mt-24 px-3 pt-20 min-[640px]:px-8 min-[640px]:pt-24"
    >
      <div className="mx-auto max-w-[1280px]">
        <div
          ref={boardRef}
          data-motion="hero-board"
          data-hero-intro
          className={cn("relative", FELT_FRAME)}
          style={FELT_STYLE}
        >
          <CaseGhostMotifs only="lens" />

          <div
            className={cn(
              "relative flex flex-col px-3 pt-6 pb-5 min-[640px]:px-10 min-[640px]:pt-10 min-[640px]:pb-9",
              "min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.9fr)] min-[1100px]:items-stretch min-[1100px]:gap-6 min-[1100px]:px-10 min-[1100px]:pt-9 min-[1100px]:pb-10"
            )}
          >
            {/* ── Character (desktop: left column; phone: beside the notes) ── */}
            <div
              className={cn(
                "order-2 mt-6 grid grid-cols-[44%_minmax(0,1fr)] items-end gap-2.5 min-[640px]:mt-10 min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] min-[640px]:items-center min-[640px]:gap-8",
                "min-[1100px]:order-none min-[1100px]:mt-0 min-[1100px]:block min-[1100px]:self-end"
              )}
            >
              <div className={cn("relative z-30", "min-[1100px]:z-auto")}>
                <div
                  data-motion="hero-char"
                  className="animate-cafe-float relative mx-auto w-max max-w-full"
                >
                  <ProtectedImage
                    src={cutout}
                    alt={cafe.heroAlt ?? cafe.title}
                    className={cn(
                      "h-[min(330px,85vw)] w-auto max-w-full object-contain [filter:drop-shadow(8px_14px_10px_rgba(0,0,0,.55))] min-[640px]:h-[min(600px,72vw)]",
                      "min-[1100px]:h-[min(720px,calc(100svh-9rem))] min-[1100px]:min-h-[600px] min-[1100px]:max-w-none"
                    )}
                  />
                  {/* She is the detective on this case, never the suspect. */}
                  <p
                    className={cn(
                      THAI,
                      "absolute bottom-[6%] -left-1.5 z-20 rotate-[-4deg] border border-cafe-gold/70 bg-cafe-cream/95 px-1.5 py-0.5 text-[13px] font-bold whitespace-nowrap text-cafe-forest shadow-md min-[640px]:bottom-[10%] min-[640px]:px-2.5 min-[640px]:py-1 min-[640px]:text-lg",
                      "min-[1100px]:bottom-[14%] min-[1100px]:left-auto min-[1100px]:-right-[4%] min-[1100px]:px-3 min-[1100px]:py-1 min-[1100px]:text-xl"
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

              {/* Phone: the venue polaroid pinned beside her; the thread runs from her heart to its clip. */}
              <div className={cn("self-start pt-10 min-[640px]:pt-16", "min-[1100px]:hidden")}>
                <div
                  data-motion="hero-card"
                  className={cn(TILT, "mx-auto w-full max-w-[11rem] min-[640px]:max-w-[16rem]")}
                  style={tiltStyle(5)}
                >
                  {venue("phone")}
                </div>
              </div>
            </div>

            {/* ── Wordmark, lede, case file, buttons ── */}
            <div
              className={cn(
                "contents",
                "min-[1100px]:flex min-[1100px]:min-w-0 min-[1100px]:flex-col min-[1100px]:items-center min-[1100px]:justify-center"
              )}
            >
              <div className={cn("order-1 flex flex-col items-center", "min-[1100px]:order-none")}>
                <SherlockSweetieLogo
                  as="h1"
                  motion="hero-title"
                  label={cafe.title}
                  className="text-[clamp(36px,11.2vw,88px)] min-[1100px]:text-[clamp(64px,6.9vw,92px)]"
                />
                {cafe.lede ? (
                  <p
                    data-motion="hero-meta"
                    className={cn(
                      THAI,
                      "mt-3 max-w-[30ch] text-center text-[13px] leading-relaxed text-balance text-cafe-text italic min-[640px]:max-w-none min-[640px]:text-[15px]"
                    )}
                  >
                    {cafe.lede}
                  </p>
                ) : null}
              </div>

              {/* Desktop case file. */}
              <Paper
                tilt={0.6}
                motion="hero-card"
                className={cn(
                  "mt-10 hidden w-full max-w-[700px] px-7 pt-6 pb-7",
                  "min-[1100px]:block"
                )}
              >
                <CaseLock id="lock" sealed={hidden} className="top-0.5 left-8" />
                {caseTab}
                <div className="absolute -top-6 -right-10 z-20 w-44 rotate-[5deg]">
                  {venue("wide")}
                </div>

                {facts(false)}
                {hidden ? <ClassifiedStamp /> : null}
                {statusLabel ? (
                  <Stamp
                    motion="hero-stamp"
                    className="absolute right-44 -bottom-4 z-20 rotate-[-7deg] bg-cafe-cream/90 whitespace-nowrap"
                  >
                    {statusLabel}
                  </Stamp>
                ) : null}
              </Paper>

              {/* Phone case file: the same facts as desktop, full width and upright enough to read. */}
              <Paper
                tilt={0.6}
                motion="hero-card"
                className={cn(
                  "order-3 mt-12 w-full px-4 pt-5 pb-6 min-[640px]:mx-auto min-[640px]:max-w-[560px] min-[640px]:px-6",
                  "min-[1100px]:hidden"
                )}
              >
                <CaseLock id="lock-m" sealed={hidden} className="top-0.5 left-7" />
                {caseTab}
                {facts(true)}
                {hidden ? <ClassifiedStamp small /> : null}
                {statusLabel ? (
                  <Stamp
                    motion="hero-stamp"
                    className="absolute right-3 -bottom-4 z-20 rotate-[-7deg] bg-cafe-cream/90 px-1.5 text-[10px] whitespace-nowrap min-[640px]:text-xs"
                  >
                    {statusLabel}
                  </Stamp>
                ) : null}
              </Paper>

              <div
                data-motion="hero-meta"
                className={cn(
                  "order-4 mt-9 flex flex-col gap-3 min-[640px]:mt-12 min-[640px]:flex-row min-[640px]:justify-center",
                  "min-[1100px]:order-none min-[1100px]:mt-10 min-[1100px]:flex-row min-[1100px]:justify-center"
                )}
              >
                <a
                  href="#sets"
                  className="inline-flex min-h-12 items-center justify-center bg-cafe-gold px-6 text-[15px] font-semibold text-cafe-ink transition hover:-translate-y-0.5 hover:bg-cafe-gold-soft motion-reduce:transition-none"
                >
                  <SetsButtonLabel preorder={cafe.preorder} />
                </a>
                {follow?.url ? (
                  <Link
                    href={follow.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center border border-cafe-gold/60 px-6 text-[15px] font-semibold text-cafe-cream transition hover:-translate-y-0.5 hover:border-cafe-gold hover:bg-cafe-gold/10 motion-reduce:transition-none"
                  >
                    {follow.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <BoardThread boardRef={boardRef} />
        </div>
      </div>
    </section>
  );
}
