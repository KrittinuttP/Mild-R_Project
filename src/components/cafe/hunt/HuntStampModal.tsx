"use client";

import { useEffect, useRef } from "react";

import { HAND, Pin, TYPE } from "@/components/cafe/board/pieces";
import { HuntCelebrate } from "@/components/cafe/hunt/HuntCelebrate";
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
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-[#050607]/80 px-6 py-10 font-[family-name:var(--font-cafe-thai)]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hunt-stamp-title"
        className="relative w-full max-w-sm bg-[#f4ebe3] text-[#1a1410] shadow-[0_24px_50px_rgba(0,0,0,0.6)]"
      >
        <Pin />
        <div
          className={cn(
            TYPE,
            "flex items-center justify-between bg-[#a8323f] px-4 pt-3 pb-2.5 text-[13px] font-bold tracking-[0.16em] text-[#f4ebe3]"
          )}
        >
          <span>EVIDENCE FOUND</span>
          <span>
            EX. {label} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="relative px-5 pt-[22px] pb-5 text-center">
          <span
            data-stamp-mark
            className={cn(
              TYPE,
              "mx-auto flex size-[124px] -rotate-12 flex-col items-center justify-center rounded-full border-[5px] border-[#a8323f] font-bold text-[#a8323f] shadow-[inset_0_0_0_5px_#f4ebe3,inset_0_0_0_7px_#a8323f]"
            )}
            aria-hidden
          >
            <span className="text-base tracking-[0.1em]">FOUND</span>
            <span className="text-[40px] leading-none">{label}</span>
          </span>

          <h2
            id="hunt-stamp-title"
            className={cn(HAND, "mt-4 text-[26px] leading-[1.3] text-[#7a1f2a]")}
          >
            ประทับตราแล้ว!
          </h2>
          <p className="mt-1 text-base font-semibold break-words">
            {item.name || `หลักฐานชิ้นที่ ${number}`}
          </p>

          <div className="mt-3.5 flex items-center justify-center gap-2.5 text-sm text-[#3d3024]">
            <span>
              เก็บแล้ว {count} จาก {total}
            </span>
            <span className="flex gap-1.5" aria-hidden>
              {itemIds.map((id) => (
                <span
                  key={id}
                  className={cn(
                    "size-3.5 rounded-full",
                    stampedIds.includes(id)
                      ? "bg-[#e85a7a]"
                      : "border-2 border-dashed border-[#5c4636]"
                  )}
                />
              ))}
            </span>
          </div>

          <button
            type="button"
            autoFocus
            onClick={onPrimary}
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2.5 bg-[#e85a7a] px-4 text-lg font-semibold text-[#1a1410] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1a1410]"
          >
            สแกนชิ้นต่อไป
          </button>
          <button
            type="button"
            onClick={onBook}
            className="mt-2.5 flex min-h-[50px] w-full items-center justify-center border-2 border-[#1a1410] px-4 text-base font-semibold text-[#1a1410] transition hover:bg-[#1a1410] hover:text-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
          >
            ดูสมุดสะสม
          </button>
        </div>
      </div>
    </div>
  );
}
