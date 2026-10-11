"use client";

import { useEffect, type ReactNode } from "react";

import { HAND, Pin, Stamp, TYPE } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

const STRONG = "font-semibold text-[#1a1410]";

const POINTS: ReactNode[] = [
  <>
    ใช้ <strong className={STRONG}>เบราว์เซอร์เดิม</strong> สแกนให้ครบทุกจุด
    แนะนำให้สแกนด้วยกล้องมือถือ
  </>,
  <>
    <strong className={STRONG}>อย่าล้างประวัติ</strong>{" "}
    หรือข้อมูลเว็บไซต์ระหว่างเล่น
  </>,
  <>
    <strong className={STRONG}>อย่าใช้โหมดไม่ระบุตัวตน</strong>{" "}
    ปิดหน้าต่างแล้วตราจะหาย
  </>,
  <>เว็บไม่เก็บข้อมูลส่วนตัวของคุณ จนกว่าคุณจะกรอกฟอร์มลุ้นวงล้อเอง</>,
];

type HuntNoticeProps = {
  /** First visit: the only way out is to accept. Later: a plain close. */
  required: boolean;
  onClose: () => void;
};

/** "Stamps are saved on this phone only" — shown before anything is saved. */
export function HuntNotice({ required, onClose }: HuntNoticeProps) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !required) onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [required, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#050607]/65 font-[family-name:var(--font-cafe-thai)] sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hunt-notice-title"
        className="relative max-h-full w-full overflow-y-auto bg-[#f4ebe3] px-[22px] pt-[26px] pb-[calc(28px+env(safe-area-inset-bottom))] text-[#1a1410] shadow-[0_-18px_40px_rgba(0,0,0,0.6)] sm:max-w-md sm:pb-7"
      >
        <Pin />
        <div className="flex items-center justify-between gap-3">
          <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636] uppercase")}>
            Read before you start
          </p>
          <Stamp className="rotate-3">Notice</Stamp>
        </div>
        <h2
          id="hunt-notice-title"
          className={cn(HAND, "mt-2.5 text-[25px] leading-[1.3] text-[#7a1f2a]")}
        >
          ตราประทับจะถูกเก็บไว้ในมือถือเครื่องนี้
        </h2>

        <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-[1.6] text-[#3d3024]">
          {POINTS.map((point, index) => (
            <li key={index} className="flex gap-3">
              <span
                className={cn(
                  TYPE,
                  "flex size-[26px] shrink-0 items-center justify-center rounded-full border-2 border-[#1a1410] text-sm font-bold text-[#1a1410]"
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-[22px] flex min-h-[52px] w-full items-center justify-center bg-[#1a1410] px-4 text-base font-semibold text-[#f4ebe3] transition hover:bg-[#3d3024] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
        >
          {required ? "เข้าใจแล้ว เริ่มเก็บหลักฐาน" : "ปิด"}
        </button>
        {required ? (
          <p className="mt-3 text-center text-[13px] text-[#5c4636]">
            อ่านคำเตือนนี้ซ้ำได้ที่หน้าสมุดสะสม
          </p>
        ) : null}
      </div>
    </div>
  );
}
