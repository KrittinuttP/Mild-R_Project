"use client";

import { useEffect, useRef } from "react";

import { HAND, TYPE } from "@/components/cafe/board/pieces";
import { THAI } from "@/components/cafe/hunt/HuntFrame";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

registerGsapPlugins();

/** Mild-R name art (square PNG with transparent padding around the figure). */
export const NAME_ART = "/assets/mild/kv/Mild-R_Name_Art.png";

/**
 * Visible part of the 2039 × 2039 art (x 461–1528, y 125–1842). The image is
 * scaled and shifted inside a box of this ratio so the padding is cropped off.
 */
const ART_CROP = {
  aspect: "1067 / 1717",
  width: `${(2039 / 1067) * 100}%`,
  height: `${(2039 / 1717) * 100}%`,
  left: `${(-461 / 1067) * 100}%`,
  top: `${(-125 / 1717) * 100}%`,
};

const MINI_TURNS = [-10, 7, -4, 11, -7];
const CONFETTI_COLORS = ["#e85a7a", "#f3b8c4", "#f2c230", "#b9e6e1", "#f4ebe3"];
/** Fixed spread so server and client render the same pieces. */
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
  wide: i % 2 === 0,
}));
const SPARKLES = [
  { className: "top-[6%] -left-[22%] size-[22px]", fill: "#f2c230" },
  { className: "top-[2%] -right-[18%] size-[18px]", fill: "#f3b8c4" },
  { className: "top-[62%] -right-[26%] size-6", fill: "#f2c230" },
  { className: "top-[70%] -left-[24%] size-4", fill: "#b9e6e1" },
];

type HuntCelebrateProps = {
  total: number;
  /** Go to the prize draw form. */
  onPrimary: () => void;
  /** Back to the stamp book. */
  onBook: () => void;
};

/**
 * Full-screen "case solved" moment, shown once when the last piece is stamped.
 * Without motion (reduced-motion setting) it shows the finished screen.
 */
export function HuntCelebrate({ total, onPrimary, onBook }: HuntCelebrateProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBook();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onBook]);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const fall = window.innerHeight + 80;

        gsap
          .timeline()
          .fromTo("[data-ce-flash]", { opacity: 0.9 }, { opacity: 0, duration: 0.55, ease: "power1.out" })
          .from("[data-ce-rays]", { opacity: 0, scale: 0.6, duration: 0.7, ease: "power2.out" }, 0.1)
          .from("[data-ce-art]", { y: -70, scale: 0.6, opacity: 0, duration: 0.75, ease: "back.out(1.8)" }, 0.2)
          .from("[data-ce-sparkle]", { scale: 0, opacity: 0, stagger: 0.08, duration: 0.4, ease: "back.out(3)" }, 0.75)
          .from("[data-ce-solved]", { scale: 2.4, rotation: -2, opacity: 0, duration: 0.32, ease: "power4.in" }, 1.3)
          .to(
            "[data-ce-shake]",
            { keyframes: { x: [-7, 6, -4, 2, 0], y: [4, -3, 2, -1, 0] }, duration: 0.3, ease: "none" },
            1.62
          )
          .from("[data-ce-mini]", { scale: 0, opacity: 0, rotation: 0, stagger: 0.12, duration: 0.35, ease: "back.out(2.6)" }, 1.9)
          .from("[data-ce-copy]", { y: 18, opacity: 0, duration: 0.5, ease: "power2.out" }, 2.5)
          .from("[data-ce-actions]", { y: 18, opacity: 0, duration: 0.5, ease: "power2.out" }, 2.75);

        gsap.to("[data-ce-spin]", { rotation: 360, duration: 18, repeat: -1, ease: "none" });
        gsap.to("[data-ce-sparkle]", {
          scale: 0.7,
          opacity: 0.6,
          rotation: 90,
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          stagger: 0.25,
          delay: 1.3,
          ease: "sine.inOut",
        });

        // Paper bits burst down the screen when the stamp lands.
        gsap.utils.toArray<HTMLElement>("[data-ce-confetti]").forEach((piece) => {
          gsap.fromTo(
            piece,
            { y: -40, x: 0, rotation: 0, opacity: 1 },
            {
              y: fall,
              x: gsap.utils.random(-60, 60),
              rotation: gsap.utils.random(360, 900),
              duration: gsap.utils.random(2.2, 3.4),
              delay: 1.62 + gsap.utils.random(0, 0.6),
              ease: "power1.in",
            }
          );
        });
      });
      return () => media.revert();
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hunt-celebrate-title"
      className={cn(THAI, "fixed inset-0 z-[110] overflow-x-hidden overflow-y-auto text-[#d8d0c4]")}
      style={{
        backgroundColor: "#0a0c0e",
        backgroundImage:
          "radial-gradient(circle at 50% 28%, rgba(232,90,122,0.32), transparent 55%), linear-gradient(rgba(244,235,227,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(244,235,227,0.022) 1px, transparent 1px)",
        backgroundSize: "auto, 44px 44px, 44px 44px",
      }}
    >
      <div
        data-ce-shake
        className="relative mx-auto flex min-h-full w-full max-w-[420px] flex-col items-center px-6 pt-[max(20px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]"
      >
        <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#c4a882]")}>
          EVIDENCE HUNT · CASE CLOSED
        </p>

        <div
          className="relative mt-3 h-[min(40svh,320px)] shrink-0"
          style={{ aspectRatio: ART_CROP.aspect }}
        >
          <div
            data-ce-rays
            className="pointer-events-none absolute top-1/2 left-1/2 size-[540px] -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          >
            <div
              data-ce-spin
              className="size-full rounded-full"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, rgba(243,184,196,0.22) 0deg 9deg, transparent 9deg 24deg)",
                maskImage: "radial-gradient(circle, #000 18%, transparent 68%)",
                WebkitMaskImage: "radial-gradient(circle, #000 18%, transparent 68%)",
              }}
            />
          </div>

          <div data-ce-art className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NAME_ART}
              alt="Mild-R"
              width={2039}
              height={2039}
              className="absolute max-w-none drop-shadow-[0_14px_26px_rgba(0,0,0,0.6)]"
              style={{
                width: ART_CROP.width,
                height: ART_CROP.height,
                left: ART_CROP.left,
                top: ART_CROP.top,
              }}
            />
          </div>

          {SPARKLES.map((sparkle, index) => (
            <svg
              key={index}
              data-ce-sparkle
              viewBox="0 0 24 24"
              className={cn("absolute", sparkle.className)}
              style={{ fill: sparkle.fill }}
              aria-hidden
            >
              <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
            </svg>
          ))}

          <p
            data-ce-solved
            className={cn(
              TYPE,
              "absolute -bottom-6 left-1/2 w-[236px] -translate-x-1/2 -rotate-[8deg] border-[5px] border-[#e85a7a] bg-[#0a0c0e]/55 pt-2 pb-1 text-center text-[32px] leading-none font-bold tracking-[0.14em] whitespace-nowrap text-[#e85a7a] shadow-[0_0_26px_rgba(232,90,122,0.55)]"
            )}
            aria-hidden
          >
            CASE SOLVED
          </p>
        </div>

        <ul
          aria-label={`ตราประทับครบ ${total} ชิ้น`}
          className="mt-12 flex w-full max-w-[342px] justify-between"
        >
          {Array.from({ length: total }, (_, index) => (
            <li
              key={index}
              data-ce-mini
              className={cn(
                TYPE,
                "flex size-[52px] items-center justify-center rounded-full border-[3px] border-[#e85a7a] bg-[#e85a7a]/12 text-lg font-bold text-[#f3b8c4]"
              )}
              style={{ transform: `rotate(${MINI_TURNS[index % MINI_TURNS.length]}deg)` }}
            >
              {String(index + 1).padStart(2, "0")}
            </li>
          ))}
        </ul>

        <div data-ce-copy className="mt-6 text-center">
          <h2
            id="hunt-celebrate-title"
            className={cn(HAND, "text-[34px] leading-[1.25] text-[#f4ebe3]")}
          >
            ปิดคดีสำเร็จ!
          </h2>
          <p className="mt-2 text-[15px] leading-[1.7]">
            เก็บหลักฐานครบทั้ง {total} ชิ้นแล้ว
            <br />
            กรอกข้อมูลเพื่อลุ้นรับรางวัลได้เลย
          </p>
        </div>

        <div data-ce-actions className="mt-auto w-full pt-7">
          <button
            type="button"
            autoFocus
            onClick={onPrimary}
            className="flex min-h-14 w-full items-center justify-center bg-[#e85a7a] px-4 text-lg font-semibold text-[#1a1410] shadow-[0_0_24px_rgba(232,90,122,0.45)] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#f4ebe3]"
          >
            กรอกชื่อลุ้นรับรางวัล
          </button>
          <button
            type="button"
            onClick={onBook}
            className="mt-2 flex min-h-12 w-full items-center justify-center text-[15px] font-semibold text-[#f3b8c4] underline underline-offset-4 transition hover:text-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
          >
            ดูสมุดสะสม
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            data-ce-confetti
            className={cn(
              "absolute -top-4 opacity-0",
              piece.round ? "size-2 rounded-full" : piece.wide ? "h-1.5 w-2.5" : "h-3.5 w-2"
            )}
            style={{ left: piece.left, backgroundColor: piece.color }}
          />
        ))}
      </div>

      <div
        data-ce-flash
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,#fff5f7,rgba(243,184,196,0.6)_60%)] opacity-0"
        aria-hidden
      />
    </div>
  );
}
