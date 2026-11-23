"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { HbdCardCanvas } from "@/components/hbd/card-maker/HbdCardCanvas";
import {
  HBD_CARD_FONTS,
  type HbdCardContent,
  type HbdCardFontId,
  type HbdCardStyle,
} from "@/lib/hbd-card-maker";
import { clampText, textLength } from "@/lib/hbd-upload";
import { cn } from "@/lib/utils";

const DEMO_TEXT = "สุขสันต์วันเกิดนะมายด์ ฮันนี่อยู่ข้างๆ เสมอเลย";
const DEMO_NAME = "ฮันนี่";
/** Styles the demo cycles through after typing. */
const DEMO_STYLES: ReadonlyArray<HbdCardStyle> = [
  { font: "mali", color: "#d9467a", size: "m" },
  { font: "playpen", color: "#7b5cc4", size: "m" },
  { font: "itim", color: "#1c9586", size: "m" },
  { font: "charm", color: "#c8323c", size: "m" },
];
const CHIP_FONTS: ReadonlyArray<HbdCardFontId> = ["mali", "itim", "charm", "playpen"];
const DOTS: ReadonlyArray<string> = ["#d9467a", "#c8323c", "#d0602a", "#3f8a3a", "#1c9586", "#3a7bd5", "#7b5cc4", "#2b2326"];
const RAINBOW = "conic-gradient(#ff4d4d, #ffa64d, #ffe14d, #6be36b, #4dd8ff, #5a6bff, #d04dff, #ff4d4d)";

const TYPE_MS = 75;
const HOLD_MS = 1300;
const STYLE_MS = 1500;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * "วิธีส่ง" preview of the web card editor: types a wish, then cycles fonts and
 * colors on the real card renderer. Decorative only (not clickable); pauses
 * off screen and stays still with reduced motion.
 */
export function HbdCardDemo({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const total = useMemo(() => textLength(DEMO_TEXT), []);
  const [typed, setTyped] = useState(total);
  const [styleIndex, setStyleIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || prefersReducedMotion()) return;
    let timer: ReturnType<typeof setTimeout>;
    let n = 0;
    let s = 0;
    const type = () => {
      n += 1;
      setTyped(n);
      timer = setTimeout(n < total ? type : cycle, n < total ? TYPE_MS : HOLD_MS);
    };
    const cycle = () => {
      s += 1;
      if (s < DEMO_STYLES.length) {
        setStyleIndex(s);
        timer = setTimeout(cycle, STYLE_MS);
        return;
      }
      // Start over: back to the first style and an empty card.
      s = 0;
      n = 0;
      setStyleIndex(0);
      setTyped(0);
      timer = setTimeout(type, 500);
    };
    const start = () => {
      setStyleIndex(0);
      setTyped(0);
      timer = setTimeout(type, 400);
    };
    timer = setTimeout(start, 0);
    return () => clearTimeout(timer);
  }, [visible, total]);

  const text = clampText(DEMO_TEXT, typed);
  const style = DEMO_STYLES[styleIndex];
  const content = useMemo<HbdCardContent>(() => ({ message: text, name: DEMO_NAME, style }), [text, style]);

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-2", className)}>
      <span className="sr-only">ตัวอย่างหน้าทำการ์ดบนเว็บ พิมพ์คำอวยพรแล้วเลือก Font กับสีได้</span>
      <div aria-hidden className="pointer-events-none flex select-none flex-col gap-2">
        <HbdCardCanvas content={content} label="ตัวอย่างการ์ด" className="rounded-lg" />
        <div className="flex h-8 items-center rounded-lg px-2.5 text-[12.5px] text-r-text ring-[1.5px] ring-r-pri/60 ring-inset">
          <span className="truncate">{text}</span>
          <span className="ml-0.5 h-3.5 w-[1.5px] flex-none animate-pulse bg-[#ff6b9a]" />
        </div>
        <div className="grid grid-cols-4 gap-1">
          {CHIP_FONTS.map((id) => {
            const font = HBD_CARD_FONTS[id];
            const on = style.font === id;
            return (
              <span
                key={id}
                className={cn(
                  "flex h-8 items-center justify-center rounded-lg text-[13px] leading-none text-[#ff8fb4] transition-colors",
                  on
                    ? "bg-r-pri/16 ring-[1.5px] ring-r-pri/75 ring-inset"
                    : "bg-white/[0.05] ring-1 ring-white/[0.12] ring-inset"
                )}
                style={{ fontFamily: `"${font.family}", "IBM Plex Sans Thai", sans-serif`, fontWeight: font.weight }}
              >
                สุขสันต์
              </span>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className="size-3.5 rounded-full" style={{ background: RAINBOW }} />
          {DOTS.map((hex) => (
            <span
              key={hex}
              className={cn(
                "size-3.5 rounded-full transition-shadow",
                style.color === hex && "shadow-[0_0_0_2px_#1a0d12,0_0_0_3.5px_#ff6b9a]"
              )}
              style={{ background: hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
