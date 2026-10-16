import { Pin, Stamp } from "@/components/cafe/board/pieces";
import { WaxSeal } from "@/components/cafe/hunt/HuntFrame";
import { cn } from "@/lib/utils";

export type HuntNoteVariant = "already" | "invalid" | "other" | "unreachable";

const NOTE: Record<
  HuntNoteVariant,
  { title: string; body: string; edge: string; titleColor: string }
> = {
  already: {
    title: "เก็บชิ้นนี้ไปแล้ว",
    body: "หลักฐานชิ้นนี้อยู่ในสมุดแล้ว ไปหาจุดอื่นต่อได้เลย",
    edge: "border-l-cafe-forest",
    titleColor: "text-cafe-forest",
  },
  invalid: {
    title: "QR นี้ใช้ไม่ได้",
    body: "รหัสไม่ตรงกับจุดหลักฐาน ลองสแกนใหม่ ถ้ายังไม่ได้ให้แจ้งทีมงาน",
    edge: "border-l-cafe-wax",
    titleColor: "text-cafe-wax",
  },
  other: {
    title: "QR นี้ไม่ใช่จุดหลักฐาน",
    body: "มองหา QR ที่มีป้าย EVIDENCE แล้วเล็งใหม่ได้เลย",
    edge: "border-l-cafe-gold-deep",
    titleColor: "text-cafe-wax",
  },
  unreachable: {
    title: "ตรวจหลักฐานไม่ได้",
    body: "เช็คอินเทอร์เน็ต แล้วสแกน QR เดิมอีกครั้ง",
    edge: "border-l-cafe-gold",
    titleColor: "text-cafe-ink",
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
        "relative -rotate-[0.6deg] border-l-[6px] bg-cafe-cream px-4 py-3.5 text-cafe-ink shadow-[0_16px_30px_rgba(0,0,0,0.55)]",
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
          <p className="mt-0.5 text-sm leading-[1.6] text-cafe-ink-soft">
            {variant === "already" && number
              ? `หลักฐานชิ้นที่ ${number} อยู่ในสมุดแล้ว ไปหาจุดอื่นต่อได้เลย`
              : note.body}
          </p>
        </div>
        {variant === "already" && number ? (
          <WaxSeal
            label={String(number).padStart(2, "0")}
            turn={-10}
            className="size-12"
          />
        ) : variant === "invalid" ? (
          <Stamp className="shrink-0 rotate-6 border-cafe-wax text-[11px] text-cafe-wax">Void</Stamp>
        ) : variant === "other" ? (
          <Stamp className="shrink-0 rotate-6 border-cafe-wax text-center text-[11px] leading-[1.15] text-cafe-wax">
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
            className="-mt-1.5 -mr-2 flex size-11 shrink-0 items-center justify-center text-cafe-ink-muted transition hover:text-cafe-ink focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-cafe-gold-deep"
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
