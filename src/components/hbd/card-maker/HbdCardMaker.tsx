"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, PenLine, Plus, TriangleAlert, X } from "lucide-react";

import { HbdCardCanvas } from "@/components/hbd/card-maker/HbdCardCanvas";
import {
  HBD_CARD_COLORS,
  HBD_CARD_FONT_IDS,
  HBD_CARD_FONTS,
  HBD_CARD_MESSAGE_MAX,
  HBD_CARD_NAME_MAX,
  HBD_CARD_SIZES,
  HBD_CARD_SMALL_TEXT,
  colorLabel,
  isInkAdjusted,
  measureHbdCardFont,
  normalizeCardMessage,
  renderHbdCardFile,
  type HbdCardStyle,
} from "@/lib/hbd-card-maker";
import { clampText, textLength } from "@/lib/hbd-upload";
import { R_CTA_OUTLINE_CLASS, R_CTA_PRIMARY_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";
const INPUT =
  "w-full rounded-xl bg-white/[0.04] px-4 text-base text-r-text ring-1 ring-white/[0.16] outline-none ring-inset placeholder:text-r-text-2/45 focus:ring-r-pri/60";
const PILL_ON = "bg-r-pri/16 text-[#ff6b9a] ring-[1.5px] ring-r-pri/75 ring-inset";
const PILL_OFF = "bg-white/[0.05] text-r-text-2 ring-1 ring-white/[0.12] ring-inset hover:bg-white/[0.08]";
const SWATCH_ON = "shadow-[0_0_0_2px_var(--r-bg),0_0_0_4px_#ff6b9a]";
const RAINBOW = "conic-gradient(#ff4d4d, #ffa64d, #ffe14d, #6be36b, #4dd8ff, #5a6bff, #d04dff, #ff4d4d)";
/** Font sizes of the "ก" buttons, so the size reads without a label. */
const SIZE_GLYPH = { s: "text-[12px]", m: "text-[15px]", l: "text-[19px]" } as const;

type Tab = "text" | "style";

export type HbdCardMakerResult = { file: File; message: string; name: string; style: HbdCardStyle };

type Props = {
  initial: { message: string; name: string; style: HbdCardStyle };
  onCancel: () => void;
  onDone: (result: HbdCardMakerResult) => void;
};

/**
 * "เขียนอวยพรบนเว็บ": a modal on desktop, a full screen that slides in on phones.
 * Mount it only while open; it locks page scroll and closes on Escape.
 */
export function HbdCardMaker({ initial, onCancel, onDone }: Props) {
  const ids = useId();
  const [message, setMessage] = useState(() => normalizeCardMessage(initial.message));
  const [name, setName] = useState(() => clampText(initial.name, HBD_CARD_NAME_MAX));
  const [style, setStyle] = useState<HbdCardStyle>(initial.style);
  /** Phones only: "ข้อความ" / "ตัวอักษร" under the card. Desktop shows both. */
  const [tab, setTab] = useState<Tab>("text");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const content = useMemo(() => ({ message, name, style }), [message, name, style]);
  const smallText = useMemo(
    () => message.trim().length > 0 && measureHbdCardFont(content) < HBD_CARD_SMALL_TEXT,
    [content, message]
  );
  const pickedColor = !HBD_CARD_COLORS.some((c) => c.hex === style.color);
  const inkAdjusted = isInkAdjusted(style.color);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      setShown(true);
      messageRef.current?.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function finish() {
    if (!message.trim()) {
      setError("กรุณาพิมพ์คำอวยพร");
      setTab("text");
      requestAnimationFrame(() => messageRef.current?.focus());
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const file = await renderHbdCardFile({ message: message.trim(), name: name.trim(), style });
      onDone({ file, message: message.trim(), name: name.trim(), style });
    } catch {
      setError("สร้างการ์ดไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const fontGrid = (
    <div role="radiogroup" aria-label="ฟอนต์" className="grid grid-cols-4 gap-1.5">
      {HBD_CARD_FONT_IDS.map((id) => {
        const font = HBD_CARD_FONTS[id];
        const on = style.font === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setStyle((v) => ({ ...v, font: id }))}
            className={cn(
              "flex h-[54px] min-w-0 flex-col items-center justify-center rounded-xl transition-colors lg:h-14",
              on ? PILL_ON : PILL_OFF,
              FOCUS
            )}
          >
            <span
              className="text-[17px] leading-tight text-[#ff8fb4] lg:text-lg"
              style={{ fontFamily: `"${font.family}", "IBM Plex Sans Thai", sans-serif`, fontWeight: font.weight }}
            >
              สุขสันต์
            </span>
            <span className="max-w-full truncate px-1 text-[11px] text-r-text-2">{font.label}</span>
          </button>
        );
      })}
    </div>
  );

  const sizeSeg = (
    <div role="radiogroup" aria-label="ขนาดตัวอักษร" className="flex gap-0.5 rounded-full bg-white/[0.05] p-[3px]">
      {HBD_CARD_SIZES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={style.size === s.id}
          aria-label={s.label}
          title={s.label}
          onClick={() => setStyle((v) => ({ ...v, size: s.id }))}
          className={cn(
            "flex h-[30px] min-w-[34px] items-center justify-center rounded-full leading-none",
            SIZE_GLYPH[s.id],
            style.size === s.id ? PILL_ON : "text-r-text-2 hover:text-r-text",
            FOCUS
          )}
        >
          ก
        </button>
      ))}
    </div>
  );

  const swatches = (
    <div
      role="radiogroup"
      aria-label="สีตัวอักษร"
      className="grid grid-cols-6 justify-items-center gap-y-3 lg:flex lg:justify-between"
    >
      {/* First: the fan's own color (native color picker, no library). */}
      <label
        title="เลือกสีเอง"
        className={cn(
          "relative flex size-[34px] cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-r-acc lg:size-7",
          pickedColor && SWATCH_ON
        )}
        style={{ background: pickedColor ? style.color : RAINBOW }}
      >
        {pickedColor ? (
          <span aria-hidden className="absolute -right-1 -bottom-1 size-3.5 rounded-full ring-2 ring-r-bg" style={{ background: RAINBOW }} />
        ) : (
          <span aria-hidden className="flex size-[22px] items-center justify-center rounded-full bg-r-bg text-r-text lg:size-4">
            <Plus className="size-3.5 lg:size-3" />
          </span>
        )}
        <input
          type="color"
          value={style.color}
          aria-label="เลือกสีเอง"
          onChange={(event) => setStyle((v) => ({ ...v, color: event.target.value.toLowerCase() }))}
          className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
        />
      </label>
      {HBD_CARD_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={style.color === c.hex}
          aria-label={c.label}
          title={c.label}
          onClick={() => setStyle((v) => ({ ...v, color: c.hex }))}
          className={cn(
            "size-[34px] rounded-full transition-shadow lg:size-7",
            style.color === c.hex ? SWATCH_ON : c.id === "black" && "shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.35)]",
            FOCUS
          )}
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );

  const styleGroup = (
    <div className="space-y-3 lg:rounded-2xl lg:bg-white/[0.03] lg:p-3.5 lg:ring-1 lg:ring-white/[0.08] lg:ring-inset">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.90625rem] text-r-text">
          ฟอนต์ <span className="text-[12px] text-r-text-3">· {HBD_CARD_FONTS[style.font].label}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-r-text-3">ขนาด</span>
          {sizeSeg}
        </div>
      </div>
      {fontGrid}
      <p className="pt-1 text-[0.90625rem] text-r-text">
        สี <span className="text-[12px] text-r-text-3">· {colorLabel(style.color)}</span>
      </p>
      {swatches}
      {inkAdjusted ? (
        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#ffc38a]">
          <TriangleAlert className="mt-0.5 size-3.5 flex-none" aria-hidden />
          สีนี้อ่อนไป อ่านยากบนการ์ด · ปรับให้เข้มขึ้นนิดหนึ่งแล้ว
        </p>
      ) : null}
    </div>
  );

  const tabs = (
    <div role="tablist" aria-label="แก้การ์ด" className="mb-4 flex gap-1 rounded-full bg-white/[0.05] p-1 lg:hidden">
      {(
        [
          ["text", "ข้อความ", PenLine],
          ["style", "ตัวอักษร", null],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`${ids}-tab-${id}`}
          aria-selected={tab === id}
          aria-controls={`${ids}-panel-${id}`}
          onClick={() => setTab(id)}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm",
            tab === id ? PILL_ON : "text-r-text-2",
            FOCUS
          )}
        >
          {Icon ? <Icon className="size-3.5" aria-hidden /> : <span aria-hidden className="text-[13px] font-semibold">Aa</span>}
          {label}
        </button>
      ))}
    </div>
  );

  const controls = (
    <div>
      {tabs}
      <div
        id={`${ids}-panel-text`}
        role="tabpanel"
        aria-labelledby={`${ids}-tab-text`}
        className={cn("space-y-4 lg:block", tab !== "text" && "max-lg:hidden")}
      >
        <div>
          <label htmlFor={`${ids}-name`} className="mb-1.5 block text-[0.90625rem] text-r-text">
            ชื่อที่แสดง <span className="text-[12px] text-r-text-3">· ใช้เป็นลายเซ็น และกรอกขั้นที่ 2 ให้ด้วย</span>
          </label>
          <input
            id={`${ids}-name`}
            type="text"
            value={name}
            placeholder="เช่น ฮันนี่"
            onChange={(event) => setName(clampText(event.target.value, HBD_CARD_NAME_MAX))}
            className={cn(INPUT, "h-12")}
            autoComplete="nickname"
          />
        </div>
        <div>
          <label htmlFor={`${ids}-msg`} className="mb-1.5 flex justify-between text-[0.90625rem] text-r-text">
            <span>
              คำอวยพร <span className="text-[12px] text-r-text-3">· ฝากถึงมายด์</span>
            </span>
            <span className="text-[12.5px] text-r-text-3 tabular-nums">
              {textLength(message)}/{HBD_CARD_MESSAGE_MAX}
            </span>
          </label>
          <textarea
            id={`${ids}-msg`}
            ref={messageRef}
            value={message}
            rows={4}
            placeholder="สุขสันต์วันเกิดนะมายด์…"
            aria-invalid={Boolean(error && !message.trim())}
            aria-describedby={error ? `${ids}-error` : undefined}
            onChange={(event) => setMessage(normalizeCardMessage(event.target.value))}
            className={cn(INPUT, "min-h-28 resize-none py-3 leading-relaxed aria-[invalid=true]:ring-[#ffa062]")}
          />
          {smallText ? (
            <p className="mt-1.5 text-[12.5px] text-r-text-3">ข้อความยาว ตัวอักษรบนการ์ดจะเล็กลงอัตโนมัติ</p>
          ) : null}
        </div>
      </div>
      <div
        id={`${ids}-panel-style`}
        role="tabpanel"
        aria-labelledby={`${ids}-tab-style`}
        className={cn("lg:mt-4 lg:block", tab !== "style" && "max-lg:hidden")}
      >
        {styleGroup}
      </div>
      {error ? (
        <p id={`${ids}-error`} role="alert" className="mt-3 text-[13px] text-[#ffa062]">
          {error}
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex justify-center transition-colors duration-200 lg:items-start lg:overflow-y-auto lg:p-6 lg:pt-[8vh]",
        shown ? "bg-r-bg/80 lg:backdrop-blur-sm" : "bg-transparent"
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className={cn(
          "relative flex w-full flex-col bg-r-bg transition duration-300 ease-out max-lg:h-[100dvh] lg:max-w-[1120px] lg:rounded-3xl lg:bg-[#1a0d12] lg:shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.1)]",
          shown ? "translate-x-0 opacity-100 lg:translate-y-0" : "max-lg:translate-x-full lg:translate-y-3 lg:opacity-0"
        )}
      >
        {/* Header: back on phones, title + close on desktop */}
        <div className="flex h-14 flex-none items-center gap-3 border-b border-white/10 px-1 lg:h-[72px] lg:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn("inline-flex h-11 items-center gap-1.5 px-3 text-sm text-r-text-2 lg:hidden", FOCUS)}
          >
            <ArrowLeft className="size-4" aria-hidden />
            กลับ
          </button>
          <span className="hidden size-[38px] flex-none items-center justify-center rounded-full bg-r-pri/14 text-r-pri lg:flex">
            <PenLine className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 max-lg:text-center max-lg:pr-16">
            <h2 id={`${ids}-title`} className="text-base text-r-text lg:text-[1.1875rem]">
              เขียนอวยพรบนเว็บ
            </h2>
            <p className="hidden text-[12.5px] text-r-text-3 lg:block">พิมพ์แล้วการ์ดเปลี่ยนตามทันที</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="ปิด"
            className={cn("hidden size-10 items-center justify-center rounded-full text-r-text-2 ring-1 ring-white/[0.12] ring-inset hover:text-r-text lg:flex", FOCUS)}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto lg:flex lg:gap-7 lg:overflow-visible lg:p-6">
          <div className="sticky top-0 z-[1] bg-r-bg px-4 pt-3 pb-3 lg:static lg:w-[56%] lg:flex-none lg:bg-transparent lg:p-0">
            <HbdCardCanvas
              content={content}
              className="rounded-xl shadow-[0_14px_34px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.1)] lg:rounded-2xl"
            />
            <p className="mt-2 hidden text-[13px] text-r-text-3 lg:block">ตัวอย่างสด · ตอนส่งระบบสร้างรูปขนาดเต็มให้</p>
          </div>
          <div className="px-4 pt-1 pb-28 lg:flex-1 lg:p-0">{controls}</div>
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-white/[0.08] bg-r-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 lg:flex lg:justify-end lg:gap-2.5 lg:rounded-b-3xl lg:bg-transparent lg:px-6 lg:py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(R_CTA_OUTLINE_CLASS, "hidden lg:inline-flex")}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={busy}
            className={cn(R_CTA_PRIMARY_CLASS, "w-full lg:w-auto lg:px-8")}
          >
            {busy ? "กำลังสร้างการ์ด…" : "ใช้การ์ดนี้"}
          </button>
        </div>
      </div>
    </div>
  );
}
