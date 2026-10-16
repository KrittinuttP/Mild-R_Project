"use client";

import { useEffect, useRef } from "react";

import { LABEL } from "@/components/cafe/board/pieces";
import { HuntCelebrate } from "@/components/cafe/hunt/HuntCelebrate";
import { GOLD_BUTTON, WaxSeal } from "@/components/cafe/hunt/HuntFrame";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

registerGsapPlugins();

type HuntStampModalProps = {
  item: CafeHuntItem;
  /** 0-based position of the piece just stamped. */
  index: number;
  /** Stamped pieces, including this one. */
  stampedIds: string[];
  itemIds: string[];
  /** "Scan the next one", or "fill in the form" once every piece is in. */
  onPrimary: () => void;
  /** Back to the stamp book. */
  onBook: () => void;
};

/**
 * Shown right after a scan stamps a new piece. The last piece gets the
 * full-screen celebration instead of the stamp window.
 */
export function HuntStampModal(props: HuntStampModalProps) {
  const { itemIds, stampedIds, onPrimary, onBook } = props;
  const complete = itemIds.length > 0 && itemIds.every((id) => stampedIds.includes(id));
  if (complete) {
    return <HuntCelebrate total={itemIds.length} onPrimary={onPrimary} onBook={onBook} />;
  }
  return <StampWindow {...props} />;
}

/** Stays until a button is pressed, so the visitor always sees which piece was collected. */
function StampWindow({
  item,
  index,
  stampedIds,
  itemIds,
  onPrimary,
  onBook,
}: HuntStampModalProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const number = index + 1;
  const label = String(number).padStart(2, "0");
  const total = itemIds.length;
  const count = itemIds.filter((id) => stampedIds.includes(id)).length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBook();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBook]);

  // The stamp lands on the paper.
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-stamp-mark]", {
          scale: 1.7,
          rotate: 8,
          opacity: 0,
          duration: 0.45,
          ease: "back.out(2.2)",
        });
      });
      return () => media.revert();
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-cafe-deep/80 px-6 py-10 font-[family-name:var(--font-cafe-thai)]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hunt-stamp-title"
        className="relative w-full max-w-sm -rotate-[0.6deg] bg-cafe-cream text-cafe-ink shadow-[0_24px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between bg-cafe-ink px-4 pt-[11px] pb-[9px]">
          <span className={cn(LABEL, "text-[10.5px] sm:text-[10.5px]")}>Evidence Found</span>
          <span className={cn(LABEL, "text-[10.5px] text-cafe-gold-pale sm:text-[10.5px]")}>
            {label} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="relative px-[22px] pt-[26px] pb-[22px] text-center">
          <div data-stamp-mark className="flex justify-center">
            <WaxSeal label={label} turn={-10} className="size-[132px]" />
          </div>

          <p className={cn(LABEL, "mt-3.5 text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
            Exhibit {label}
          </p>
          <h2
            id="hunt-stamp-title"
            className="mt-0.5 text-2xl leading-[1.3] font-bold break-words"
          >
            เจอ{item.name || `หลักฐานชิ้นที่ ${number}`} แล้ว!
          </h2>
          <p className="mt-1 text-sm text-cafe-ink-muted">ประทับตราลงสมุดเรียบร้อย</p>

          <div className="mt-4 flex justify-center gap-[7px]" aria-hidden>
            {itemIds.map((id) => (
              <span
                key={id}
                className={cn(
                  "size-3 rounded-full",
                  stampedIds.includes(id)
                    ? "bg-cafe-wax"
                    : "border-[1.5px] border-dashed border-cafe-gold-deep"
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[13.5px] text-cafe-ink-soft">
            เก็บแล้ว {count} จาก {total} · เหลืออีก {total - count} ชิ้น
          </p>

          <button
            type="button"
            autoFocus
            onClick={onPrimary}
            className={cn(
              GOLD_BUTTON,
              "mt-5 min-h-14 text-lg font-bold shadow-[0_8px_18px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,240,200,0.5)] focus-visible:outline-cafe-ink"
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6 shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
              aria-hidden
            >
              <path d="M4 8 V5 a1 1 0 0 1 1 -1 h3 M16 4 h3 a1 1 0 0 1 1 1 v3 M20 16 v3 a1 1 0 0 1 -1 1 h-3 M8 20 H5 a1 1 0 0 1 -1 -1 v-3" />
              <path d="M8 8 h3 v3 H8 z M13 13 h3 v3 h-3 z M13 8 h3 M8 13 v3 h3" />
            </svg>
            สแกนชิ้นต่อไป
          </button>
          <button
            type="button"
            onClick={onBook}
            className="mt-2.5 flex min-h-[50px] w-full items-center justify-center border-[1.5px] border-cafe-ink px-4 text-[15.5px] font-semibold text-cafe-ink transition hover:bg-cafe-ink hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold-deep"
          >
            ดูสมุดหลักฐาน
          </button>
        </div>
      </div>
    </div>
  );
}
