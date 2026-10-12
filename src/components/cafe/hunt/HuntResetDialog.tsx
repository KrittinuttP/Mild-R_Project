"use client";

import { useEffect } from "react";

import { HAND, Pin, Stamp, TYPE } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

const DARK_BUTTON =
  "flex min-h-[52px] w-full items-center justify-center bg-[#1a1410] px-4 text-base font-semibold text-[#f4ebe3] transition hover:bg-[#3d3024] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]";
const OUTLINE_BUTTON =
  "flex min-h-[50px] w-full items-center justify-center border-2 border-[#1a1410] px-4 text-base font-semibold text-[#1a1410] transition hover:bg-[#1a1410] hover:text-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]";

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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#050607]/65 font-[family-name:var(--font-cafe-thai)] sm:items-center sm:p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hunt-reset-title"
        aria-describedby="hunt-reset-points"
        className="relative max-h-full w-full overflow-y-auto bg-[#f4ebe3] px-[22px] pt-[26px] pb-[calc(28px+env(safe-area-inset-bottom))] text-[#1a1410] shadow-[0_-18px_40px_rgba(0,0,0,0.6)] sm:max-w-md sm:pb-7"
      >
        <Pin />
        <div className="flex items-center justify-between gap-3">
          <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636] uppercase")}>
            New case file
          </p>
          <Stamp className="rotate-3">Warning</Stamp>
        </div>
        <h2
          id="hunt-reset-title"
          className={cn(HAND, "mt-2.5 text-[25px] leading-[1.3] text-[#7a1f2a]")}
        >
          เริ่มเล่นใหม่ ข้อมูลเดิมในเครื่องนี้จะหายไป
        </h2>

        <ul
          id="hunt-reset-points"
          className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.6] text-[#3d3024]"
        >
          <li>
            <strong className="font-semibold text-[#1a1410]">
              ตราทั้ง {total} ชิ้นและใบยืนยันสิทธิ์
            </strong>{" "}
            ในเครื่องนี้จะถูกลบ กู้คืนไม่ได้
          </li>
          <li>สิทธิ์ลุ้นรับรางวัลที่ส่งไปแล้วยังอยู่ในระบบ ไม่หายไปด้วย</li>
          <li>1 บัญชีลุ้นได้ 1 สิทธิ์ เล่นรอบใหม่ต้องใช้บัญชีอื่นลงชื่อ</li>
        </ul>

        {saved ? (
          <p className="mt-4 flex items-center gap-2.5 border-l-4 border-[#0f4f55] bg-[#b9e6e1]/60 px-3 py-2.5 text-sm leading-[1.6] font-semibold text-[#0f4f55]">
            <svg
              viewBox="0 0 24 24"
              className="size-5 shrink-0 fill-none stroke-[#0f4f55] stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"
              aria-hidden
            >
              <path d="M4 12 l5 5 L20 6" />
            </svg>
            บันทึกรูปใบยืนยันสิทธิ์แล้ว
          </p>
        ) : (
          <div className="mt-4 border-2 border-[#a8323f] bg-[#f3b8c4]/45 px-3.5 py-3">
            <p className="text-[15px] leading-[1.5] font-semibold text-[#7a1f2a]">
              ยังไม่ได้บันทึกรูปใบยืนยันสิทธิ์
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-[#3d3024]">
              กรุณาบันทึกรูปเก็บไว้ก่อน ใช้แสดงกับทีมงานถ้าได้รางวัล
            </p>
            <button
              type="button"
              autoFocus
              onClick={onSave}
              disabled={saving}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2.5 bg-[#e85a7a] px-4 text-base font-semibold text-[#1a1410] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1a1410] disabled:opacity-70"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5 fill-none stroke-[#1a1410] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                aria-hidden
              >
                <path d="M12 4 v11 M7 11 l5 5 l5 -5 M5 20 h14" />
              </svg>
              {saving ? "กำลังสร้างรูป…" : "บันทึกรูปใบยืนยันสิทธิ์"}
            </button>
            {saveMessage ? (
              <p className="mt-2 text-[13px] leading-[1.6] text-[#3d3024]" aria-live="polite">
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
          className="mt-1.5 flex min-h-11 w-full items-center justify-center text-[15px] font-semibold text-[#5c4636] underline underline-offset-4 transition hover:text-[#1a1410] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
