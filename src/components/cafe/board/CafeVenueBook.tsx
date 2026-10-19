"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

import { LABEL, SERIF, THAI } from "@/components/cafe/board/pieces";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import type { CafeVenueMenuItem } from "@/types/vtuber";

/*
 * Venue menu as a menu book. The house menus are price posters, so a page is
 * always shown whole (object-contain, never cropped).
 * - md and up: an open spread of two pages, index tabs on top (left aligned).
 * - below md: one page, index tabs sticking out of the right edge; swipe or
 *   the arrows turn the page.
 * Tapping a page opens it in the lightbox.
 */

const MD_QUERY = "(min-width: 768px)";
const SWIPE_PX = 48;
const LEATHER = "bg-[linear-gradient(#3a1f14,#2a160e)]";
const TAB_TONES = ["bg-cafe-wax", "bg-cafe-forest", "bg-cafe-gold-deep"];

type Group = { label: string; first: number; count: number };

function groupsOf(items: CafeVenueMenuItem[]): Group[] {
  const groups: Group[] = [];
  items.forEach((item, index) => {
    const label = item.group?.trim();
    if (!label) return;
    const known = groups.find((group) => group.label === label);
    if (known) known.count += 1;
    else groups.push({ label, first: index, count: 1 });
  });
  return groups;
}

function useMdUp() {
  const [md, setMd] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const sync = () => setMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return md;
}

function pageLabel(item: CafeVenueMenuItem, index: number) {
  return item.captionLocal ?? item.caption ?? `เมนูร้าน หน้า ${index + 1}`;
}

function BookPage({
  item,
  index,
  side,
  onZoom,
}: {
  item: CafeVenueMenuItem;
  index: number;
  side: "left" | "right" | "single";
  onZoom: (index: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onZoom(index)}
      aria-label={`ขยายดู: ${pageLabel(item, index)}`}
      className={cn(
        "group relative block w-full cursor-zoom-in bg-[#f4ecd9] p-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-cream",
        side === "left" && "shadow-[inset_-14px_0_18px_rgba(0,0,0,0.2)]",
        side === "right" && "shadow-[inset_14px_0_18px_rgba(0,0,0,0.2)]",
        side === "single" && "shadow-[0_14px_26px_rgba(0,0,0,0.5),inset_8px_0_12px_rgba(0,0,0,0.18)]"
      )}
    >
      <ProtectedImage
        src={item.image}
        alt={item.imageAlt ?? pageLabel(item, index)}
        loading="lazy"
        wrapClassName="block aspect-[5/7] w-full"
        className="h-full w-full object-contain"
      />
      <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 bg-cafe-void/85 px-1.5 py-1 text-[11px] text-cafe-cream">
        <Maximize2 className="size-3" aria-hidden />
        <span className="sr-only sm:not-sr-only">ขยาย</span>
      </span>
      {side === "single" ? (
        <span
          aria-hidden
          className="absolute right-0 bottom-0 size-8 bg-[linear-gradient(315deg,#2a160e_50%,#e6dcc4_50%)] shadow-[-2px_-2px_4px_rgba(0,0,0,0.25)]"
        />
      ) : null}
    </button>
  );
}

function PageArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "หน้าก่อนหน้า" : "หน้าถัดไป"}
      className="inline-flex size-11 items-center justify-center rounded-full border border-cafe-gold/60 bg-cafe-void/85 text-cafe-gold-soft transition hover:bg-cafe-gold/20 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-cream"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

export function CafeVenueBook({
  items,
  onZoom,
}: {
  items: CafeVenueMenuItem[];
  onZoom: (index: number) => void;
}) {
  const md = useMdUp();
  const step = md ? 2 : 1;
  const [page, setPage] = useState(0);
  const swipeFrom = useRef<number | null>(null);
  // A swipe ends with a click on the page; that click must not open the lightbox.
  const swiped = useRef(false);
  const groups = groupsOf(items);
  const total = items.length;
  // A spread always starts on an even page.
  const start = md ? page - (page % 2) : page;
  const shown = items.slice(start, start + step);
  const shownGroups = Array.from(
    new Set(shown.map((item) => item.group?.trim()).filter(Boolean))
  ) as string[];
  // The page asked for (tab or arrow) decides the lit tab, even when the spread starts earlier.
  const active = items[page]?.group?.trim() ?? shownGroups[0];

  if (total === 0) return null;

  const go = (next: number) => setPage(Math.max(0, Math.min(total - 1, next)));
  const prev = () => go(start - step);
  const next = () => go(start + step);
  const lastStart = md ? total - 1 - ((total - 1) % 2) : total - 1;
  const range = shown.length > 1 ? `${start + 1}–${start + shown.length}` : `${start + 1}`;
  const status = `หน้า ${range} / ${total}${shownGroups.length ? ` · ${shownGroups.join(" · ")}` : ""}`;

  const tabs = groups.map((group, index) => {
    const on = group.label === active;
    return { group, on, tone: TAB_TONES[index % TAB_TONES.length] };
  });

  const pager = (
    <div className="mt-5 flex items-center justify-center gap-5">
      <PageArrow dir="prev" disabled={start === 0} onClick={prev} />
      <p aria-live="polite" className={cn(SERIF, "text-center text-sm text-cafe-gold-soft sm:text-[15px]")}>
        {status}
      </p>
      <PageArrow dir="next" disabled={start >= lastStart} onClick={next} />
    </div>
  );

  if (md) {
    return (
      <div className="mt-8">
        <div className="mx-auto w-fit max-w-full">
          {tabs.length > 1 ? (
            <nav aria-label="หมวดเมนู" className="flex items-end gap-1 pl-3.5">
              {tabs.map(({ group, on, tone }) => (
                <button
                  key={group.label}
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => go(group.first)}
                  className={cn(
                    THAI,
                    "relative top-px inline-flex items-center gap-1.5 rounded-t-lg px-4 text-sm font-semibold text-cafe-cream transition focus-visible:outline-2 focus-visible:outline-cafe-cream",
                    tone,
                    on
                      ? "h-[38px] shadow-[0_-2px_6px_rgba(0,0,0,0.35)]"
                      : "h-8 shadow-[inset_0_0_0_1px_rgba(201,161,74,0.55)] brightness-[.82] hover:brightness-100"
                  )}
                >
                  {group.label}
                  <span className="text-xs font-normal opacity-80">{group.count}</span>
                </button>
              ))}
            </nav>
          ) : null}
          <div className={cn("flex rounded-md p-3.5 shadow-[0_24px_40px_rgba(0,0,0,0.55)]", LEATHER)}>
            <div className="w-[min(25rem,42vw)]">
              <BookPage item={items[start]} index={start} side="left" onZoom={onZoom} />
            </div>
            <span aria-hidden className="w-1 bg-[linear-gradient(90deg,rgba(0,0,0,0.5),rgba(0,0,0,0.1))]" />
            <div className="w-[min(25rem,42vw)]">
              {items[start + 1] ? (
                <BookPage item={items[start + 1]} index={start + 1} side="right" onZoom={onZoom} />
              ) : (
                <div className="flex aspect-[5/7] h-full items-center justify-center bg-[#f4ecd9] shadow-[inset_14px_0_18px_rgba(0,0,0,0.2)]">
                  <span className={cn(LABEL, "text-[10px] text-cafe-ink-muted sm:text-[10px]")}>End of menu</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {pager}
        <p className="mt-2 text-center text-xs text-cafe-muted">
          คลิกแถบหมวดด้านบนเพื่อข้ามไปหน้านั้น · คลิกหน้าเพื่อขยาย
        </p>
      </div>
    );
  }

  const item = items[start];
  return (
    <div className={cn("-mx-5 mt-6 border-y border-cafe-gold/35 px-5 pt-6 pb-6 sm:-mx-8 sm:px-8", LEATHER)}>
      <div
        className="relative mx-auto w-[min(19rem,calc(100%-2.25rem))] touch-pan-y"
        onPointerDown={(event) => {
          swipeFrom.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from === null) return;
          const dx = event.clientX - from;
          if (Math.abs(dx) < SWIPE_PX) return;
          swiped.current = true;
          if (dx < 0) next();
          else prev();
        }}
      >
        <BookPage
          item={item}
          index={start}
          side="single"
          onZoom={(index) => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            onZoom(index);
          }}
        />
        {tabs.length > 1 ? (
          <nav aria-label="หมวดเมนู" className="absolute top-10 -right-9 flex flex-col gap-2">
            {tabs.map(({ group, on, tone }) => (
              <button
                key={group.label}
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => go(group.first)}
                className={cn(
                  "flex h-[5.25rem] w-9 items-center justify-center rounded-r-md text-cafe-cream shadow-[3px_3px_6px_rgba(0,0,0,0.4)] focus-visible:outline-2 focus-visible:outline-cafe-cream",
                  tone,
                  !on && "brightness-75"
                )}
              >
                <span className={cn(THAI, "text-xs font-semibold [writing-mode:vertical-rl]")}>{group.label}</span>
              </button>
            ))}
          </nav>
        ) : null}
      </div>
      {pager}
      <p className="mt-2 text-center text-xs text-cafe-muted">ปัดซ้ายขวาเพื่อพลิกหน้า · แตะหน้าเพื่อขยาย</p>
    </div>
  );
}
