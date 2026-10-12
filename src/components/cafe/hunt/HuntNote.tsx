import { Pin, Stamp, TYPE } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

export type HuntNoteVariant = "already" | "invalid" | "other" | "unreachable";

const NOTE: Record<
  HuntNoteVariant,
  { title: string; body: string; edge: string; titleColor: string }
> = {
  already: {
    title: "เก็บชิ้นนี้ไปแล้ว",
    body: "หลักฐานชิ้นนี้อยู่ในสมุดแล้ว ไปหาจุดอื่นต่อได้เลย",
    edge: "border-l-[#0f4f55]",
    titleColor: "text-[#0f4f55]",
  },
  invalid: {
    title: "QR นี้ใช้ไม่ได้",
    body: "รหัสไม่ตรงกับจุดหลักฐาน ลองสแกนใหม่ ถ้ายังไม่ได้ให้แจ้งทีมงาน",
    edge: "border-l-[#a8323f]",
    titleColor: "text-[#7a1f2a]",
  },
  other: {
    title: "QR นี้ไม่ใช่จุดหลักฐาน",
    body: "มองหา QR ที่มีป้าย EVIDENCE แล้วเล็งใหม่ได้เลย",
    edge: "border-l-[#5c4636]",
    titleColor: "text-[#7a1f2a]",
  },
  unreachable: {
    title: "ตรวจหลักฐานไม่ได้",
    body: "เช็คอินเทอร์เน็ต แล้วสแกน QR เดิมอีกครั้ง",
    edge: "border-l-[#f2c230]",
    titleColor: "text-[#1a1410]",
  },
};

type HuntNoteProps = {
  variant: HuntNoteVariant;
  /** 1-based evidence number, shown as a small stamp for `already`. */
  number?: number;
  /** Shows a close button (book page). The scanner hides notes by timer. */
  onClose?: () => void;
  className?: string;
};

/** Pinned paper note for scan results that do not stamp anything. */
export function HuntNote({ variant, number, onClose, className }: HuntNoteProps) {
  const note = NOTE[variant];
  return (
    <div
      role="status"
      className={cn(
        "relative -rotate-[0.6deg] border-l-[6px] bg-[#f4ebe3] px-4 py-3.5 text-[#1a1410] shadow-[0_16px_30px_rgba(0,0,0,0.55)]",
        note.edge,
        className
      )}
    >
      <Pin />
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className={cn("text-base leading-[1.4] font-semibold", note.titleColor)}>
            {note.title}
          </p>
          <p className="mt-0.5 text-sm leading-[1.6] text-[#3d3024]">
            {variant === "already" && number
              ? `หลักฐานชิ้นที่ ${number} อยู่ในสมุดแล้ว ไปหาจุดอื่นต่อได้เลย`
              : note.body}
          </p>
        </div>
        {variant === "already" && number ? (
          <span
            className={cn(
              TYPE,
              "flex size-11 shrink-0 -rotate-[10deg] items-center justify-center rounded-full border-[3px] border-[#a8323f] text-[15px] font-bold text-[#a8323f]"
            )}
            aria-hidden
          >
            {String(number).padStart(2, "0")}
          </span>
        ) : variant === "invalid" ? (
          <Stamp className="shrink-0 rotate-6 text-[11px]">Void</Stamp>
        ) : variant === "other" ? (
          <Stamp className="shrink-0 rotate-6 text-center text-[11px] leading-[1.15]">
            Not
            <br />
            Evidence
          </Stamp>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดข้อความ"
            className="-mt-1.5 -mr-2 flex size-11 shrink-0 items-center justify-center text-[#5c4636] transition hover:text-[#1a1410] focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[#e85a7a]"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current stroke-[2.2] [stroke-linecap:round]"
              aria-hidden
            >
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
