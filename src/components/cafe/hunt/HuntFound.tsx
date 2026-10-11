"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { HAND, LABEL, Pin, SERIF, TYPE } from "@/components/cafe/board/pieces";
import { WALL_LINK } from "@/components/cafe/hunt/HuntFrame";
import { useHuntState } from "@/components/cafe/hunt/useHuntState";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import { EMPTY_HUNT_STATE, updateHuntState } from "@/lib/cafe-hunt-storage";
import { cn } from "@/lib/utils";

const BOOK_PATH = "/cafe/hunt";

type HuntFoundProps = {
  item: CafeHuntItem;
  /** 0-based position of this piece. */
  index: number;
  /** Every evidence id in order, for the progress dots. */
  itemIds: string[];
  /** Code from the QR link — already known to this visitor, safe to hold here. */
  token: string;
  caseNo?: string;
};

/** Page a QR code opens: shows the piece and the "stamp" button. */
export function HuntFound({ item, index, itemIds, token, caseNo }: HuntFoundProps) {
  const router = useRouter();
  const { state } = useHuntState();
  const current = state ?? EMPTY_HUNT_STATE;
  const [justStamped, setJustStamped] = useState(false);

  const total = itemIds.length;
  const number = index + 1;
  const label = String(number).padStart(2, "0");
  const stamped = Boolean(current.stamps[item.id]);
  const count = itemIds.filter((id) => current.stamps[id]).length;
  /** Scanned again after it was already collected on an earlier visit. */
  const collectedBefore = stamped && !justStamped;

  function stamp() {
    if (stamped) return;
    updateHuntState((previous) => ({
      ...previous,
      stamps: {
        ...previous.stamps,
        [item.id]: { token, at: new Date().toISOString() },
      },
    }));
    setJustStamped(true);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Let the stamp land before going back to the book.
    window.setTimeout(() => router.push(BOOK_PATH), reduced ? 0 : 800);
  }

  return (
    <>
      {caseNo ? <p className={LABEL}>{caseNo}</p> : null}
      <h1
        className={cn(
          SERIF,
          "mt-1 text-[2rem] leading-[1.05] font-medium text-[#f4ebe3]"
        )}
      >
        Evidence Found
      </h1>
      <p className={cn(HAND, "mt-1.5 text-[22px] text-[#f3b8c4]")}>
        พบหลักฐานชิ้นที่ {number}
      </p>

      <section
        aria-label={`ถุงหลักฐานชิ้นที่ ${number}`}
        className="relative mt-[26px] -rotate-[0.8deg] rounded-b-[14px] bg-[#f4ebe3] text-[#1a1410] shadow-[0_18px_34px_rgba(0,0,0,0.55)]"
      >
        <Pin />
        <div
          className={cn(
            TYPE,
            "flex items-center justify-between gap-3 bg-[#a8323f] px-4 pt-3 pb-2.5 text-[13px] font-bold tracking-[0.16em] text-[#f4ebe3]"
          )}
        >
          <span>EVIDENCE</span>
          <span>
            EX. {label} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="px-4 pt-4 pb-5">
          <div className="relative flex h-[150px] items-center justify-center border-2 border-dashed border-[#5c4636] bg-[#e4d8c4]">
            <svg
              viewBox="0 0 64 64"
              className="size-[62px] fill-none stroke-[#5c4636] stroke-[3] [stroke-linecap:round]"
              aria-hidden
            >
              <circle cx="27" cy="27" r="17" />
              <path d="M40 40 L57 57" />
            </svg>
            <span
              className={cn(
                TYPE,
                "absolute flex size-[104px] flex-col items-center justify-center rounded-full border-4 border-[#a8323f] font-bold text-[#a8323f] shadow-[inset_0_0_0_4px_#e4d8c4,inset_0_0_0_6px_#a8323f]",
                "transition duration-300 ease-out motion-reduce:transition-none",
                stamped
                  ? "scale-100 -rotate-12 opacity-95"
                  : "scale-150 -rotate-12 opacity-0"
              )}
              aria-hidden
            >
              <span className="text-sm tracking-[0.1em]">FOUND</span>
              <span className="text-[32px] leading-none">{label}</span>
            </span>
          </div>

          <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2 text-sm leading-normal">
            <dt className={cn(TYPE, "pt-0.5 text-xs tracking-[0.12em] text-[#5c4636] uppercase")}>
              Item
            </dt>
            <dd className="font-semibold break-words text-[#1a1410]">
              {item.name || `หลักฐานชิ้นที่ ${number}`}
            </dd>
            {item.place ? (
              <>
                <dt className={cn(TYPE, "pt-0.5 text-xs tracking-[0.12em] text-[#5c4636] uppercase")}>
                  Found
                </dt>
                <dd className="break-words text-[#3d3024]">{item.place}</dd>
              </>
            ) : null}
            {item.hint ? (
              <>
                <dt className={cn(TYPE, "pt-0.5 text-xs tracking-[0.12em] text-[#5c4636] uppercase")}>
                  Note
                </dt>
                <dd className={cn(HAND, "text-[17px] leading-[1.4] break-words text-[#7a1f2a]")}>
                  {item.hint}
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      </section>

      {collectedBefore ? (
        <p className="mt-[26px] border-l-4 border-[#b9e6e1] bg-[#14100c] px-3.5 py-3 text-[15px] leading-[1.6] text-[#d8d0c4]">
          เก็บชิ้นนี้ไปแล้ว ไม่ต้องประทับซ้ำ
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={stamp}
            disabled={stamped}
            className="mt-[26px] flex min-h-[60px] w-full items-center justify-center gap-2.5 bg-[#e85a7a] px-4 text-[19px] font-semibold text-[#1a1410] shadow-[0_12px_28px_rgba(232,90,122,0.35)] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#f4ebe3] disabled:bg-[#f3b8c4]"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-[22px] fill-none stroke-[#1a1410] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
              aria-hidden
            >
              <path d="M9 3 h6 v6 l3 5 H6 l3 -5 z" />
              <path d="M5 18 h14 M5 21 h14" />
            </svg>
            {stamped ? "ประทับตราแล้ว" : "ประทับตรา"}
          </button>
          <p className="mt-2.5 text-center text-[13px] leading-[1.6] text-[#c4b8a8]">
            กดแล้วตราจะถูกบันทึกลงมือถือเครื่องนี้
          </p>
        </>
      )}

      <div className="mt-[26px] border-t border-dashed border-[#c4a882]/45 pt-[18px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] text-[#f4ebe3]" aria-live="polite">
            เก็บแล้ว{" "}
            <strong className="font-semibold text-[#f3b8c4]">
              {count} จาก {total}
            </strong>{" "}
            ชิ้น
          </p>
          <div className="flex gap-2" aria-hidden>
            {itemIds.map((id) => (
              <span
                key={id}
                className={cn(
                  "size-4 rounded-full",
                  current.stamps[id]
                    ? "bg-[#e85a7a]"
                    : id === item.id
                      ? "border-2 border-[#f3b8c4]"
                      : "border-2 border-dashed border-[#5c4636]"
                )}
              />
            ))}
          </div>
        </div>
        <Link href={BOOK_PATH} className={cn(WALL_LINK, "mt-1.5")}>
          เปิดสมุดสะสม →
        </Link>
      </div>
    </>
  );
}
