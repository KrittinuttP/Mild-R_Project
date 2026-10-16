"use client";

import { useEffect } from "react";

import { LABEL, Stamp } from "@/components/cafe/board/pieces";
import { GOLD_BUTTON, KeyholePlate } from "@/components/cafe/hunt/HuntFrame";
import { cn } from "@/lib/utils";

const DARK_BUTTON =
  "flex min-h-[52px] w-full items-center justify-center bg-cafe-ink px-4 text-base font-semibold text-cafe-cream transition hover:bg-cafe-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold-deep";
const OUTLINE_BUTTON =
  "flex min-h-[50px] w-full items-center justify-center border-[1.5px] border-cafe-ink px-4 text-base font-semibold text-cafe-ink transition hover:bg-cafe-ink hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold-deep";

type HuntResetDialogProps = {
  total: number;
  /** The ticket image was downloaded on this browser. */
  saved: boolean;
  saving: boolean;
  /** Result of the last save attempt, shown under the save button. */
  saveMessage: string | null;
  onSave: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * "Play again" warning: everything kept on this phone will be cleared.
 * Until the ticket image is saved, saving it is the main action.
 */
export function HuntResetDialog({
  total,
  saved,
  saving,
  saveMessage,
  onSave,
  onConfirm,
  onCancel,
}: HuntResetDialogProps) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-cafe-deep/75 font-[family-name:var(--font-cafe-thai)] sm:items-center sm:p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hunt-reset-title"
        aria-describedby="hunt-reset-points"
        className="relative max-h-full w-full overflow-y-auto bg-cafe-cream px-[22px] pt-[26px] pb-[calc(28px+env(safe-area-inset-bottom))] text-cafe-ink shadow-[0_-14px_30px_rgba(0,0,0,0.45)] sm:max-w-md sm:pb-7"
      >
        <KeyholePlate className="-top-[15px] left-1/2 -translate-x-1/2" />
        <div className="flex items-center justify-between gap-3">
          <p className={cn(LABEL, "text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
            New case file
          </p>
          <Stamp className="rotate-3 border-2 border-cafe-wax px-2 py-0.5 text-[10px] text-cafe-wax">Warning</Stamp>
        </div>
        <h2
          id="hunt-reset-title"
          className="mt-1.5 text-[22px] leading-[1.35] font-bold text-cafe-wax"
        >
          เริ่มเล่นใหม่ ข้อมูลเดิมในเครื่องนี้จะหายไป
        </h2>

        <ul
          id="hunt-reset-points"
          className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[14.5px] leading-[1.6] text-cafe-ink-soft"
        >
          <li>
            <strong className="font-bold text-cafe-ink">
              ตราทั้ง {total} ชิ้นและใบยืนยันสิทธิ์
            </strong>{" "}
            ในเครื่องนี้จะถูกลบ กู้คืนไม่ได้
          </li>
          <li>สิทธิ์ลุ้นรับรางวัลที่ส่งไปแล้วยังอยู่ในระบบ ไม่หายไปด้วย</li>
          <li>1 บัญชีลุ้นได้ 1 สิทธิ์ เล่นรอบใหม่ต้องใช้บัญชีอื่นลงชื่อ</li>
        </ul>

        {saved ? (
          <p className="mt-4 flex items-center gap-2.5 border-l-4 border-cafe-forest bg-cafe-gold-pale/60 px-3 py-2.5 text-sm leading-[1.6] font-semibold text-cafe-forest">
            <svg
              viewBox="0 0 24 24"
              className="size-5 shrink-0 fill-none stroke-cafe-forest stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"
              aria-hidden
            >
              <path d="M4 12 l5 5 L20 6" />
            </svg>
            บันทึกรูปใบยืนยันสิทธิ์แล้ว
          </p>
        ) : (
          <div className="mt-4 border-2 border-cafe-wax/70 bg-cafe-blush px-3.5 py-3">
            <p className="text-[15px] leading-[1.5] font-bold text-cafe-wax">
              ยังไม่ได้บันทึกรูปใบยืนยันสิทธิ์
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-cafe-ink-soft">
              กรุณาบันทึกรูปเก็บไว้ก่อน ใช้แสดงกับทีมงานถ้าได้รางวัล
            </p>
            <button
              type="button"
              autoFocus
              onClick={onSave}
              disabled={saving}
              className={cn(GOLD_BUTTON, "mt-3 min-h-[52px] gap-2.5 text-base font-bold shadow-[0_6px_14px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,240,200,0.5)] focus-visible:outline-cafe-ink disabled:opacity-70")}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                aria-hidden
              >
                <path d="M12 4 v11 M7 11 l5 5 l5 -5 M5 20 h14" />
              </svg>
              {saving ? "กำลังสร้างรูป…" : "บันทึกรูปใบยืนยันสิทธิ์"}
            </button>
            {saveMessage ? (
              <p className="mt-2 text-[13px] leading-[1.6] text-cafe-ink-soft" aria-live="polite">
                {saveMessage}
              </p>
            ) : null}
          </div>
        )}

        <button
          type="button"
          autoFocus={saved}
          onClick={onConfirm}
          className={cn("mt-[22px]", saved ? DARK_BUTTON : OUTLINE_BUTTON)}
        >
          ล้างข้อมูลและเริ่มเล่นใหม่
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-1.5 flex min-h-11 w-full items-center justify-center text-[15px] font-semibold text-cafe-ink-muted underline underline-offset-4 transition hover:text-cafe-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold-deep"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
