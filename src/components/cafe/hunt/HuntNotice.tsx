"use client";

import { useEffect, type ReactNode } from "react";

import { LABEL, SERIF, Stamp } from "@/components/cafe/board/pieces";
import { GOLD_BUTTON, KeyholePlate } from "@/components/cafe/hunt/HuntFrame";
import { cn } from "@/lib/utils";

const STRONG = "font-bold text-cafe-ink";

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
  <>เว็บไม่เก็บข้อมูลส่วนตัวของคุณ จนกว่าคุณจะกรอกฟอร์มลุ้นรับรางวัลเอง</>,
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-cafe-deep/75 font-[family-name:var(--font-cafe-thai)] sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hunt-notice-title"
        className="relative max-h-full w-full overflow-y-auto bg-cafe-cream px-[22px] pt-[26px] pb-[calc(28px+env(safe-area-inset-bottom))] text-cafe-ink shadow-[0_-14px_30px_rgba(0,0,0,0.45)] sm:max-w-md sm:pb-7"
      >
        <KeyholePlate className="-top-[15px] left-1/2 -translate-x-1/2" />
        <div className="flex items-center justify-between gap-3">
          <p className={cn(LABEL, "text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
            Read before you start
          </p>
          <Stamp className="rotate-3 border-2 border-cafe-wax px-2 py-0.5 text-[10px] text-cafe-wax">Notice</Stamp>
        </div>
        <h2
          id="hunt-notice-title"
          className="mt-1.5 text-[23px] leading-[1.35] font-bold text-cafe-wax"
        >
          ตราประทับจะถูกเก็บไว้ในมือถือเครื่องนี้
        </h2>

        <ul className="mt-4 flex flex-col gap-3 text-[14.5px] leading-[1.65] text-cafe-ink-soft">
          {POINTS.map((point, index) => (
            <li key={index} className="flex gap-3">
              <span
                className={cn(
                  SERIF,
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-cafe-gold-deep text-[11px] font-bold text-cafe-gold-deep"
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
          className={cn(GOLD_BUTTON, "mt-[22px] min-h-[54px] text-base font-bold shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,240,200,0.5)] focus-visible:outline-cafe-ink")}
        >
          {required ? "เข้าใจแล้ว เริ่มเก็บหลักฐาน" : "ปิด"}
        </button>
        {required ? (
          <p className="mt-3 text-center text-[13px] text-cafe-ink-muted">
            อ่านคำเตือนนี้ซ้ำได้ที่หน้าสมุดสะสม
          </p>
        ) : null}
      </div>
    </div>
  );
}
