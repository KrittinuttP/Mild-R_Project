"use client";

import { useId, useState, type FormEvent } from "react";

import { Pin, TYPE } from "@/components/cafe/board/pieces";
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
  "mt-1.5 block h-[52px] w-full rounded-none border-2 border-[#1a1410] bg-[#fffaf3] px-3.5 text-base text-[#1a1410] placeholder:text-[#5c4636]/70 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]";
const FIELD_LABEL = "block text-[15px] font-semibold text-[#1a1410]";
const HELP = "mt-1.5 text-[13px] leading-[1.6] text-[#3d3024]";

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
      className="relative bg-[#f4ebe3] px-[18px] pt-6 pb-[22px] text-[#1a1410] shadow-[0_18px_34px_rgba(0,0,0,0.55)]"
    >
      <Pin />
      <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636] uppercase")}>
        Form LD-01 · Prize Draw Entry
      </p>
      <h2 className="mt-1.5 text-2xl leading-[1.2] font-semibold">
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
                "flex min-h-[52px] cursor-pointer items-center gap-2.5 border-2 border-[#1a1410] px-3.5 text-base has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#e85a7a]",
                contactChannel === option.value
                  ? "bg-[#f3b8c4]"
                  : "bg-[#fffaf3]"
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
                className="size-5 accent-[#a8323f]"
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
          className={cn(FIELD, TYPE)}
        />
        <p className={HELP}>
          ทีมงานจะทักไปที่บัญชีนี้ถ้าคุณได้รางวัล ตรวจตัวสะกดให้ถูก
        </p>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-[1.6] text-[#3d3024]">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-px size-[22px] shrink-0 accent-[#a8323f]"
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
          className="mt-4 border-l-4 border-[#a8323f] bg-[#f3b8c4]/50 px-3 py-2 text-sm leading-[1.6] font-semibold text-[#7a1f2a]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="mt-[22px] flex min-h-14 w-full items-center justify-center bg-[#e85a7a] px-4 text-lg font-semibold text-[#1a1410] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1a1410] disabled:opacity-70"
      >
        {sending ? "กำลังส่ง…" : "ส่งชื่อลุ้นรับรางวัล"}
      </button>
      <p className="mt-3 text-center text-[13px] leading-[1.6] text-[#5c4636]">
        1 บัญชีลุ้นได้ 1 สิทธิ์ ส่งแล้วแก้ไขไม่ได้
      </p>
    </form>
  );
}
