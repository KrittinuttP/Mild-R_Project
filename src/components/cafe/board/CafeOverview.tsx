"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { CafeCountdown } from "@/components/cafe/CafeCountdown";
import { CafeTopSecret } from "@/components/cafe/CafeTopSecret";
import {
  HAND,
  LABEL,
  Paper,
  SERIF,
  Stamp,
  TILT,
  TYPE,
  tiltStyle,
} from "@/components/cafe/board/pieces";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

type Point = { x: number; y: number };

/** `drop` > 0 hangs the thread down; < 0 lifts it (to clear text under the pins). */
function sag(from: Point, to: Point, drop = 36) {
  const x = (from.x + to.x) / 2;
  const y = (from.y + to.y) / 2 + drop;
  return `M ${from.x} ${from.y} Q ${x} ${y} ${to.x} ${to.y}`;
}

function BoardThread({
  boardRef,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
}) {
  const [d, setD] = useState("");

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const measure = () => {
      const box = board.getBoundingClientRect();
      const point = (id: string) => {
        const el = board.querySelector<HTMLElement>(`[data-pin="${id}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1) return null;
        // The SVG fills the padding box, so step in past the wooden frame.
        return {
          x: rect.left + rect.width / 2 - box.left - board.clientLeft,
          y: rect.top + rect.height / 2 - box.top - board.clientTop,
        };
      };
      const heart = point("heart");
      const date = point("date");
      const place = point("place");
      if (!heart || !date || !place) {
        setD("");
        return;
      }
      setD(`${sag(heart, date, 18)} ${sag(date, place, -12)}`);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [boardRef]);

  // Always rendered so the opening timeline can find the path; `pathLength`
  // lets it draw the thread with a 0–1 dash offset whatever the real length.
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full overflow-visible min-[1100px]:block"
      aria-hidden
    >
      <path
        data-motion="hero-yarn"
        d={d || undefined}
        pathLength={1}
        fill="none"
        stroke="#e85a7a"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={1}
        style={{ filter: "drop-shadow(0 0 4px rgba(232,90,122,.85))" }}
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
        className="absolute -inset-x-1.5 -inset-y-0.5 origin-right bg-[#14100c] [transform:scaleX(0)]"
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
  const follow = cafe.closing.ctas?.[0];
  const cutout = cafe.heroCutout || "/assets/mild/kv/Mild-R_KV.png";

  return (
    <section
      id="overview"
      className="relative scroll-mt-24 px-5 pt-28 sm:px-8 sm:pt-32"
    >
      <div className="mx-auto max-w-[1280px]">
        <div
          ref={boardRef}
          data-motion="hero-board"
          data-hero-intro
          className="relative border-[12px] border-[#2a1c12] min-[1100px]:border-[20px]"
          style={{
            backgroundColor: "#8a6a45",
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(255,255,255,.16) 0 1px, transparent 1.6px), radial-gradient(circle at 72% 64%, rgba(40,22,8,.28) 0 1px, transparent 1.6px), radial-gradient(circle at 40% 80%, rgba(255,236,210,.18) 0 1px, transparent 1.6px)",
            backgroundSize: "13px 17px, 19px 23px, 16px 21px",
            boxShadow:
              "inset 0 0 0 2px #14100c, inset 0 0 120px 30px rgba(10,8,6,.6), 0 30px 70px rgba(0,0,0,.7)",
          }}
        >
          <div className="grid gap-6 p-4 sm:p-6 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[1100px]:p-8">
            <div className="relative flex justify-center min-[1100px]:block min-[1100px]:self-end">
              {/* Desktop: the cutout steps out past the left edge of the frame. */}
              <div
                data-motion="hero-char"
                className="relative min-[1100px]:-ml-[92px] min-[1100px]:w-max"
              >
                <ProtectedImage
                  src={cutout}
                  alt={cafe.heroAlt ?? cafe.title}
                  className="animate-cafe-float h-[min(440px,70vw)] w-auto max-w-full object-contain min-[1100px]:h-[min(680px,52vw)] min-[1100px]:max-w-none [filter:drop-shadow(3px_0_0_#f4ebe3)_drop-shadow(-3px_0_0_#f4ebe3)_drop-shadow(0_3px_0_#f4ebe3)_drop-shadow(0_-3px_0_#f4ebe3)_drop-shadow(8px_14px_10px_rgba(0,0,0,.55))]"
                />
                <p
                  className={cn(
                    HAND,
                    "absolute bottom-3 left-2 bg-[#f4ebe3]/90 px-2 py-1 text-base text-[#a8323f] shadow-md min-[1100px]:left-[104px]"
                  )}
                >
                  เป้าหมาย: Mild-R
                </p>
                <span
                  data-pin="heart"
                  data-motion="hero-heart"
                  className="absolute top-[42%] left-[58%] z-10 hidden size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center min-[1100px]:flex"
                  aria-hidden
                >
                  <Heart
                    className="animate-cafe-beat size-7 fill-[#e85a7a] text-[#fff5f7]"
                    style={{ filter: "drop-shadow(0 0 12px rgba(232,90,122,.8))" }}
                  />
                </span>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Paper
                tilt={-1}
                pin="title"
                motion="hero-card"
                className="px-5 py-6 sm:px-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={cn(LABEL, "text-[#5c4636]")}>
                    {edition?.kicker}
                    {edition?.kickerLocal ? ` · ${edition.kickerLocal}` : ""}
                  </p>
                  {cafe.statusLabel ? (
                    <Stamp
                      motion="hero-stamp"
                      className="rotate-[-6deg] shrink-0"
                    >
                      {cafe.statusLabel}
                    </Stamp>
                  ) : null}
                </div>
                <h1
                  data-motion="hero-title"
                  className={cn(
                    TYPE,
                    "mt-3 text-3xl leading-[1.05] font-bold text-[#1a1410] sm:text-4xl min-[1100px]:text-5xl"
                  )}
                >
                  {cafe.title}
                </h1>
                {cafe.titleLocal ? (
                  <p className={cn(HAND, "mt-2 text-[28px] leading-tight text-[#7a1f2a]")}>
                    {cafe.titleLocal}
                  </p>
                ) : null}
                {cafe.tagline ? (
                  <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-[#3d3024]">
                    {cafe.tagline}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <a
                    href="#sets"
                    className="inline-flex min-h-11 items-center bg-[#f2c230] px-4 text-sm font-semibold text-[#1a1410] transition hover:-translate-y-0.5"
                  >
                    ดูเซตและจองล่วงหน้า
                  </a>
                  {follow?.url ? (
                    <Link
                      href={follow.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center bg-[#1a1410] px-4 text-sm text-[#f4ebe3] transition hover:-translate-y-0.5"
                    >
                      {follow.label}
                    </Link>
                  ) : null}
                </div>
              </Paper>

              {showDispatch ? (
                <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Paper
                    pin="date"
                    tilt={2}
                    tone="pink"
                    motion="hero-card"
                    className="px-4 py-5"
                  >
                    <p className={cn(HAND, "text-lg text-[#7a1f2a]")}>วันเปิดแฟ้มคดี</p>
                    <p className={cn(SERIF, "mt-1 text-[2rem] leading-none text-[#1a1410]")}>
                      <Redacted>{schedule.label}</Redacted>
                    </p>
                    {schedule.detail ? (
                      <p className="mt-2 text-sm text-[#3d3024]">{schedule.detail}</p>
                    ) : null}
                    {schedule.startsAt ? (
                      <div className="mt-3">
                        <CafeCountdown
                          variant="inline"
                          startsAt={schedule.startsAt}
                          endsAt={schedule.endsAt}
                        />
                      </div>
                    ) : null}
                  </Paper>
                  <Paper
                    pin="place"
                    tilt={-2}
                    tone="mint"
                    motion="hero-card"
                    className="px-4 py-5"
                  >
                    <p className={cn(HAND, "text-lg")}>สถานที่เกิดเหตุ</p>
                    <p className={cn(SERIF, "mt-1 text-[1.7rem] leading-tight")}>
                      <Redacted>{location.label}</Redacted>
                    </p>
                    {location.detail ? (
                      <p className="mt-2 text-sm">{location.detail}</p>
                    ) : null}
                    {location.mapUrl ? (
                      <a
                        href={location.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
                      >
                        เปิดแผนที่ →
                      </a>
                    ) : null}
                  </Paper>
                </div>
                  {location.image ? (
                    <button
                      type="button"
                      onClick={onOpenVenue}
                      aria-label={`ดูรูป: ${location.imageAlt ?? location.label}`}
                      className="group block w-full cursor-zoom-in text-left"
                    >
                      <span
                        data-motion="hero-card"
                        className={cn(
                          "block overflow-hidden bg-[#f4ebe3] text-[#1a1410] shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
                          TILT
                        )}
                        style={tiltStyle(0.6)}
                      >
                        <ProtectedImage
                          src={location.image}
                          alt={location.imageAlt ?? location.label}
                          wrapClassName="block h-[250px] w-full overflow-hidden min-[1100px]:h-[190px]"
                          className="h-full w-full object-cover grayscale-[.45] transition duration-300 group-hover:grayscale-0"
                        />
                        <span className={cn(TYPE, "block px-3 py-2 text-xs tracking-[0.14em] text-[#5c4636] uppercase")}>
                          Venue · {location.label}
                        </span>
                      </span>
                    </button>
                  ) : null}
                </>
              ) : (
                <CafeTopSecret titleLocal="ข้อมูลสถานที่และเวลาเกิดเหตุ · ยังไม่เปิดเผย" />
              )}
            </div>
          </div>

          <BoardThread boardRef={boardRef} />
        </div>
      </div>
    </section>
  );
}
