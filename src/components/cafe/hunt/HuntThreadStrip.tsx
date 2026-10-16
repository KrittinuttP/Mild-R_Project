"use client";

import { useEffect, useRef, type RefObject } from "react";

import { CorkBoard, LABEL, SERIF } from "@/components/cafe/board/pieces";
import {
  BrassPin,
  KeyholeSlot,
  WaxSeal,
} from "@/components/cafe/hunt/HuntFrame";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import type { HuntStamp } from "@/lib/cafe-hunt-storage";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const CARD_TILTS = [-4, 1.5, 2.6, -1.8, 1.2];
const SEAL_TURNS = [-12, 8, -6, -5, 10];

function exhibit(index: number) {
  return `EX.${String(index + 1).padStart(2, "0")}`;
}

type HuntThreadStripProps = {
  items: CafeHuntItem[];
  stamps: Record<string, HuntStamp>;
  /** A window is open over the board: hold the "new seal" moment until it closes. */
  paused?: boolean;
  /** False while this browser's progress is still being read (stamps not known yet). */
  ready?: boolean;
};

/**
 * When a piece is stamped while the book is open, its seal is pressed onto the
 * board again, the thread tugs and the neighbouring tags swing and settle.
 * Pieces already in the book when it opens stay still.
 */
function useFreshSeal(
  rootRef: RefObject<HTMLDivElement | null>,
  stampedIds: string[],
  paused: boolean,
  ready: boolean
) {
  const seen = useRef<Set<string> | null>(null);
  const key = stampedIds.join(",");

  useEffect(() => {
    if (!ready) return;
    if (seen.current === null) {
      seen.current = new Set(stampedIds);
      return;
    }
    if (paused) return;
    const fresh = stampedIds.filter((id) => !seen.current?.has(id));
    fresh.forEach((id) => seen.current?.add(id));
    const root = rootRef.current;
    if (!root || fresh.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tags = gsap.utils.toArray<HTMLElement>("[data-ev]", root);
    const thread = root.querySelector("[data-ev-thread]");
    const timeline = gsap.timeline();
    fresh.forEach((id) => {
      const at = tags.findIndex((tag) => tag.dataset.ev === id);
      if (at < 0) return;
      timeline.fromTo(
        tags[at].querySelector("[data-ev-seal]"),
        { scale: 1.5, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.3, ease: "power3.in", clearProps: "transform,opacity,visibility" },
        0
      );
      if (thread) {
        timeline.fromTo(
          thread,
          { y: 0 },
          {
            keyframes: [
              { y: 3, duration: 0.08 },
              { y: -1.5, duration: 0.14 },
              { y: 0, duration: 0.3, ease: "sine.out" },
            ],
            clearProps: "transform",
          },
          0.3
        );
      }
      tags.forEach((tag, index) => {
        const away = Math.abs(index - at);
        const side = index < at ? -1 : 1;
        timeline.fromTo(
          tag,
          { rotation: 0 },
          {
            keyframes: [
              { rotation: side * Math.max(1.5, 6 - away * 1.6), duration: 0.16 },
              { rotation: -side * Math.max(0.6, 3 - away * 0.8), duration: 0.28 },
              { rotation: 0, duration: 0.45, ease: "sine.out" },
            ],
            transformOrigin: "50% 6px",
            clearProps: "transform",
          },
          0.3 + away * 0.05
        );
      });
    });
    return () => {
      timeline.progress(1).kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the stamped ids
  }, [key, paused, ready, rootRef]);
}

/**
 * Every piece as a small tag on a gold thread across the felt board (a wax
 * seal once found), then the clues for the pieces still missing. Until the
 * team publishes the clues (`hint` empty) the board alone is the list.
 */
export function HuntThreadStrip({
  items,
  stamps,
  paused = false,
  ready = true,
}: HuntThreadStripProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  useFreshSeal(
    boardRef,
    items.filter((item) => stamps[item.id]).map((item) => item.id),
    paused,
    ready
  );
  const total = items.length;
  const missing = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !stamps[item.id]);
  const found = total - missing.length;
  const clues = missing.some(({ item }) => (item.hint ?? "").trim() !== "");

  return (
    <>
      <CorkBoard className="mt-[30px] px-2.5 pt-4 pb-4">
        <p className={cn(LABEL, "px-1.5 text-[10px] sm:text-[11px]")}>Evidence Board</p>
        <div ref={boardRef} className="relative mt-1">
          <svg
            data-ev-thread
            viewBox="0 0 340 20"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-2 h-5 w-full overflow-visible"
            aria-hidden
          >
            <path
              d="M10 6 Q 92 18 170 6 T 330 6"
              className="fill-none stroke-cafe-gold stroke-[1.8]"
            />
            <path
              d="M10 5.4 Q 92 17.4 170 5.4 T 330 5.4"
              className="fill-none stroke-[#f6e4a8] stroke-[0.6] opacity-60"
            />
          </svg>
          <ul
            aria-label={`ตราประทับ เก็บแล้ว ${found} จาก ${total} ชิ้น`}
            className="relative flex justify-between"
          >
            {items.map((item, index) => {
              const stamped = Boolean(stamps[item.id]);
              return (
                <li
                  key={item.id}
                  data-ev={item.id}
                  className="relative flex w-[19%] max-w-[72px] flex-col items-center pt-4"
                >
                  <BrassPin className="top-1 size-[11px]" />
                  <div
                    className="flex aspect-[58/64] w-full flex-col items-center justify-center gap-0.5 bg-cafe-cream shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
                    style={{ transform: `rotate(${CARD_TILTS[index % CARD_TILTS.length]}deg)` }}
                  >
                    {stamped ? (
                      <span data-ev-seal className="block w-[76%]">
                        <WaxSeal
                          label={String(index + 1).padStart(2, "0")}
                          turn={SEAL_TURNS[index % SEAL_TURNS.length]}
                          className="w-full"
                        />
                      </span>
                    ) : (
                      <KeyholeSlot className="aspect-square w-[70%]" />
                    )}
                    <span
                      className={cn(
                        SERIF,
                        "text-[9px] font-bold tracking-[0.12em] text-cafe-ink-muted"
                      )}
                      aria-hidden
                    >
                      {exhibit(index)}
                    </span>
                  </div>
                  <span className="sr-only">
                    หลักฐานชิ้นที่ {index + 1}: {stamped ? "เก็บแล้ว" : "ยังไม่พบ"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CorkBoard>

      {missing.length > 0 && clues ? (
        <section
          aria-labelledby="hunt-clues-title"
          className="relative mt-[30px] rotate-[0.4deg] bg-cafe-cream px-[18px] pt-5 pb-3 text-cafe-ink shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
        >
          <BrassPin className="-top-[9px] left-1/2 size-[18px] -translate-x-1/2" />
          <p className={cn(LABEL, "text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
            Clues · Missing {missing.length}
          </p>
          <h2 id="hunt-clues-title" className="mt-0.5 text-[19px] font-bold">
            คำใบ้ของหลักฐานที่เหลือ
          </h2>
          <ul className="mt-2">
            {missing.map(({ item, index }) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-t border-dashed border-cafe-ink-soft/30 py-[11px] first:border-t-0"
              >
                <KeyholeSlot className="size-[34px]" />
                <div className="min-w-0">
                  <p className={cn(SERIF, "text-[11px] font-bold tracking-[0.14em]")}>
                    {exhibit(index)}
                  </p>
                  {(item.hint ?? "").trim() ? (
                    <p className="mt-0.5 text-[14.5px] leading-normal break-words text-cafe-wax italic">
                      <span
                        className={cn(
                          SERIF,
                          "mr-1.5 text-[10px] font-bold tracking-[0.16em] text-cafe-gold-deep not-italic"
                        )}
                      >
                        CLUE
                      </span>
                      {item.hint}
                    </p>
                  ) : (
                    <p className="text-[13px] leading-normal text-cafe-ink-muted">
                      ยังไม่มีคำใบ้สำหรับชิ้นนี้
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : missing.length > 0 && found > 0 ? (
        <p className="mt-4 text-center text-sm text-cafe-muted">
          หลักฐานที่เหลืออีก {missing.length} ชิ้นซ่อนอยู่ในร้าน ลองสังเกตรอบ ๆ ดูนะ
        </p>
      ) : null}
    </>
  );
}
