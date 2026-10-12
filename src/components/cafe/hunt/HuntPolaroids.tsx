"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CorkBoard, HAND, Pin, SERIF, TYPE } from "@/components/cafe/board/pieces";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import type { HuntStamp } from "@/lib/cafe-hunt-storage";
import { cn } from "@/lib/utils";

const TILTS = [-2, 1.5, -1, 2, -1.5];
const STAMP_TURNS = [-12, 8, -6, 10, -8];

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} น.`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type HuntPolaroidsProps = {
  items: CafeHuntItem[];
  stamps: Record<string, HuntStamp>;
  /** Stored stamps have been read; until then every piece looks missing. */
  ready: boolean;
};

/** One large polaroid per piece on the cork board, swiped sideways one at a time. */
export function HuntPolaroids({ items, stamps, ready }: HuntPolaroidsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const placed = useRef(false);
  const [active, setActive] = useState(0);
  const total = items.length;

  const scrollToCard = useCallback((index: number, smooth: boolean) => {
    const list = listRef.current;
    const card = list?.children[index] as HTMLElement | undefined;
    if (!list || !card) return;
    list.scrollTo({
      left: card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2,
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
    });
  }, []);

  // The card nearest the middle is the one being looked at.
  const syncActive = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const middle = list.scrollLeft + list.clientWidth / 2;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    Array.from(list.children).forEach((child, index) => {
      const card = child as HTMLElement;
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  }, []);

  // Open on the first piece still missing.
  useEffect(() => {
    if (!ready) return;
    if (!placed.current) {
      placed.current = true;
      const firstMissing = items.findIndex((item) => !stamps[item.id]);
      if (firstMissing > 0) scrollToCard(firstMissing, false);
    }
    const frame = window.requestAnimationFrame(syncActive);
    return () => window.cancelAnimationFrame(frame);
  }, [ready, items, stamps, scrollToCard, syncActive]);

  return (
    <div className="mt-[30px]">
      <CorkBoard>
        <ul
          ref={listRef}
          onScroll={syncActive}
          tabIndex={0}
          aria-label={`หลักฐานทั้ง ${total} ชิ้น ปัดซ้ายขวาเพื่อดูทีละชิ้น`}
          className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-98px)] pt-6 pb-7 [scrollbar-width:none] focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[#e85a7a] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            const stamp = stamps[item.id];
            const number = index + 1;
            const label = String(number).padStart(2, "0");
            return (
              <li
                key={item.id}
                className="relative flex w-[196px] shrink-0 snap-center flex-col bg-[#f4ebe3] px-2.5 pt-2.5 pb-3 text-[#1a1410] shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
              >
                <Pin />
                <span
                  className={cn(
                    TYPE,
                    "absolute top-[18px] left-[18px] z-[1] bg-[#f4ebe3] px-1.5 pt-0.5 pb-px text-[11px] font-bold tracking-[0.14em] text-[#a8323f]"
                  )}
                >
                  EX. {label}
                </span>
                {stamp ? (
                  <div className="flex h-[150px] items-center justify-center bg-[#e4d8c4]">
                    <span
                      className={cn(
                        TYPE,
                        "flex size-24 flex-col items-center justify-center rounded-full border-[3px] border-[#a8323f] font-bold text-[#a8323f] shadow-[inset_0_0_0_3px_#f4ebe3,inset_0_0_0_4px_#a8323f]"
                      )}
                      style={{ transform: `rotate(${STAMP_TURNS[index % STAMP_TURNS.length]}deg)` }}
                      aria-hidden
                    >
                      <span className="text-xs tracking-[0.1em]">FOUND</span>
                      <span className="text-[30px] leading-none">{label}</span>
                    </span>
                  </div>
                ) : (
                  <div
                    className="flex h-[150px] items-center justify-center bg-[#14100c]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, transparent 0 12px, rgba(244,235,227,0.06) 12px 13px)",
                    }}
                    aria-hidden
                  >
                    <span className={cn(SERIF, "text-[56px] text-[#f4ebe3]/70")}>?</span>
                  </div>
                )}
                {stamp ? (
                  <div className="px-1 pt-2.5">
                    <p className="text-[15px] leading-[1.4] font-semibold break-words">
                      {item.name || `หลักฐานชิ้นที่ ${number}`}
                    </p>
                    <p className="mt-0.5 text-xs text-[#3d3024]">
                      เก็บแล้ว {formatTime(stamp.at)}
                    </p>
                  </div>
                ) : (
                  <div className="px-1 pt-2.5">
                    <p className={cn(TYPE, "text-xs tracking-[0.12em] text-[#5c4636]")}>
                      ยังไม่พบ
                    </p>
                    <p className={cn(HAND, "mt-0.5 text-[15px] leading-[1.35] break-words text-[#7a1f2a]")}>
                      {item.hint ? `คำใบ้: ${item.hint}` : "สแกน QR ของจุดนี้เพื่อเก็บ"}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CorkBoard>

      <div className="mt-3 flex items-center justify-center gap-1">
        {items.map((item, index) => {
          const found = Boolean(stamps[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToCard(index, true)}
              aria-label={`ดูหลักฐานชิ้นที่ ${index + 1} (${found ? "เก็บแล้ว" : "ยังไม่พบ"})`}
              aria-current={active === index ? "true" : undefined}
              className="flex size-8 items-center justify-center focus-visible:outline-[3px] focus-visible:outline-[#e85a7a]"
            >
              <span
                className={cn(
                  "h-2.5 rounded-full transition-all motion-reduce:transition-none",
                  active === index ? "w-[22px] bg-[#f4ebe3]" : "w-2.5",
                  active !== index && (found ? "bg-[#e85a7a]" : "bg-[#f4ebe3]/30")
                )}
              />
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[13px] text-[#c4b8a8]">
        ปัดซ้าย–ขวาเพื่อดูหลักฐานทีละชิ้น
      </p>
    </div>
  );
}
