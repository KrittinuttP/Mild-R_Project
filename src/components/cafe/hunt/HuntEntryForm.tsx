"use client";

import { useId, useState, type FormEvent } from "react";

import { LABEL, SERIF } from "@/components/cafe/board/pieces";
import { GOLD_BUTTON, KeyholePlate } from "@/components/cafe/hunt/HuntFrame";
import { updateHuntState } from "@/lib/cafe-hunt-storage";
import {
  formatHandleInput,
  handleForChannel,
  LUCKY_DRAW_LIMITS,
  validateLuckyDrawContact,
  type LuckyDrawChannel,
} from "@/lib/lucky-draw";
import { cn } from "@/lib/utils";

const FIELD =
  "mt-1.5 block h-[52px] w-full rounded-none border-[1.5px] border-cafe-ink-soft bg-cafe-cream-light px-3.5 text-base text-cafe-ink placeholder:text-cafe-ink-muted/80 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold-deep";
const FIELD_LABEL = "block text-[15px] font-bold text-cafe-ink";
const HELP = "mt-1.5 text-[13px] leading-[1.6] text-cafe-ink-muted";

const CHANNELS: {
  value: LuckyDrawChannel;
  label: string;
  handleLabel: string;
  placeholder: string;
}[] = [
  {
    value: "discord",
    label: "Discord",
    handleLabel: "ชื่อบัญชี Discord",
    placeholder: "เช่น honey_01",
  },
  {
    value: "x",
    label: "X",
    handleLabel: "ชื่อบัญชี X",
    placeholder: "เช่น @honey_01",
  },
];

type HuntEntryFormProps = {
  /** One code per collected piece — the server checks them again. */
  tokens: string[];
};

/** Lucky-wheel sign-up, shown once every piece has been stamped. */
export function HuntEntryForm({ tokens }: HuntEntryFormProps) {
  const nameId = useId();
  const handleId = useId();
  const errorId = useId();

  const [contactName, setContactName] = useState("");
  const [contactChannel, setContactChannel] =
    useState<LuckyDrawChannel>("discord");
  const [contactHandle, setContactHandle] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const channel =
    CHANNELS.find((option) => option.value === contactChannel) ?? CHANNELS[0];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;

    const contact = validateLuckyDrawContact({
      contactName,
      contactChannel,
      contactHandle,
    });
    if (!contact.ok) {
      setError(contact.error);
      return;
    }
    if (!consent) {
      setError("กรุณาติ๊กยินยอมให้ใช้ข้อมูลติดต่อ");
      return;
    }

    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/cafe/hunt/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contact.value,
          consent: true,
          proof: { tokens },
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }

      // A second entry for the same account is refused above (409).
      updateHuntState((state) => ({
        ...state,
        entry: { ...contact.value, at: new Date().toISOString() },
      }));
    } catch {
      setError("เครือข่ายมีปัญหา กรุณาลองอีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-describedby={error ? errorId : undefined}
      className="relative bg-cafe-cream px-[18px] pt-6 pb-[22px] text-cafe-ink shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
    >
      <KeyholePlate className="-top-3 left-[22px]" />
      <p className={cn(LABEL, "pl-[34px] text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
        Form LD-01 · Prize Draw Entry
      </p>
      <h2 className="mt-1 pl-[34px] text-[22px] leading-[1.25] font-bold">
        ใบลงชื่อลุ้นรับรางวัล
      </h2>

      <div className="mt-5">
        <label htmlFor={nameId} className={FIELD_LABEL}>
          ชื่อผู้ติดต่อ
        </label>
        <input
          id={nameId}
          name="contactName"
          type="text"
          autoComplete="nickname"
          maxLength={LUCKY_DRAW_LIMITS.nameMax}
          placeholder="เช่น ฮันนี่"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          className={FIELD}
        />
        <p className={HELP}>
          ชื่อที่ทีมงานจะใช้เรียกและประกาศเมื่อคุณได้รางวัล
          ใช้ชื่อเล่นหรือชื่อในโซเชียลได้ ไม่ต้องเป็นชื่อจริง
        </p>
      </div>

      <fieldset className="mt-5 min-w-0">
        <legend className={FIELD_LABEL}>ช่องทางติดต่อ</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2.5">
          {CHANNELS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex min-h-[52px] cursor-pointer items-center gap-2.5 px-3.5 text-base has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cafe-gold-deep",
                contactChannel === option.value
                  ? "border-2 border-cafe-gold-deep bg-cafe-gold-pale font-semibold"
                  : "border-[1.5px] border-cafe-ink-soft bg-cafe-cream-light"
              )}
            >
              <input
                type="radio"
                name="contactChannel"
                value={option.value}
                checked={contactChannel === option.value}
                onChange={() => {
                  setContactChannel(option.value);
                  setContactHandle((handle) => handleForChannel(handle, option.value));
                }}
                className="size-5 accent-cafe-gold-deep"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor={handleId} className={FIELD_LABEL}>
          {channel.handleLabel}
        </label>
        <input
          id={handleId}
          name="contactHandle"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={LUCKY_DRAW_LIMITS.handleMax}
          placeholder={channel.placeholder}
          value={contactHandle}
          onFocus={() => setContactHandle((handle) => handleForChannel(handle, contactChannel))}
          onChange={(event) =>
            setContactHandle(formatHandleInput(event.target.value, contactChannel))
          }
          className={cn(FIELD, SERIF, "text-[15px]")}
        />
        <p className={HELP}>
          ทีมงานจะทักไปที่บัญชีนี้ถ้าคุณได้รางวัล ตรวจตัวสะกดให้ถูก
        </p>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-[1.6] text-cafe-ink-soft">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-px size-[22px] shrink-0 accent-cafe-gold-deep"
        />
        <span>
          ยินยอมให้เก็บชื่อและช่องทางติดต่อนี้
          เพื่อใช้สุ่มรางวัลและติดต่อผู้ได้รางวัลเท่านั้น
        </span>
      </label>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-4 border-l-4 border-cafe-wax bg-cafe-blush px-3 py-2 text-sm leading-[1.6] font-semibold text-cafe-wax"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className={cn(GOLD_BUTTON, "mt-[22px] min-h-14 text-lg font-bold shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,240,200,0.5)] focus-visible:outline-cafe-ink disabled:opacity-70")}
      >
        {sending ? "กำลังส่ง…" : "ส่งชื่อลุ้นรับรางวัล"}
      </button>
      <p className="mt-3 text-center text-[13px] leading-[1.6] text-cafe-ink-muted">
        1 บัญชีลุ้นได้ 1 สิทธิ์ ส่งแล้วแก้ไขไม่ได้
      </p>
    </form>
  );
}
