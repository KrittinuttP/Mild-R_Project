"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

import { LABEL, SERIF } from "@/components/cafe/board/pieces";
import {
  BrassPin,
  GOLD_BUTTON,
  WALL_LINK,
  WALL_NOTE,
  WaxSeal,
} from "@/components/cafe/hunt/HuntFrame";
import { HuntResetDialog } from "@/components/cafe/hunt/HuntResetDialog";
import {
  renderTicketImage,
  saveTicketImage,
} from "@/components/cafe/hunt/ticket-image";
import {
  markHuntTicketSaved,
  resetHuntPlay,
  type HuntEntry,
} from "@/lib/cafe-hunt-storage";
import type { LuckyDrawChannel } from "@/lib/lucky-draw";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL: Record<LuckyDrawChannel, string> = {
  discord: "Discord",
  x: "X",
};

function formatSentAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // Gregorian year: the event materials use 2026, not the Buddhist year.
  const day = date.toLocaleDateString("th-TH-u-ca-gregory", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} · ${time} น.`;
}

type HuntTicketProps = {
  entry: HuntEntry;
  huntTitle: string;
  cafeTitle: string;
  drawAt: string;
  /** Number of pieces, for the "play again" warning. */
  total: number;
  /** The ticket image was downloaded on this browser before. */
  saved: boolean;
};

/** Confirmation shown after the form was accepted, with "save as image". */
export function HuntTicket({
  entry,
  huntTitle,
  cafeTitle,
  drawAt,
  total,
  saved,
}: HuntTicketProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const closeReset = useCallback(() => setResetOpen(false), []);

  function playAgain() {
    resetHuntPlay();
    window.scrollTo({ top: 0 });
  }

  const channel = CHANNEL_LABEL[entry.contactChannel];
  const sentAt = formatSentAt(entry.at);

  async function saveImage() {
    if (!rootRef.current || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const blob = await renderTicketImage(
        {
          huntTitle,
          cafeTitle,
          contactName: entry.contactName,
          channelLabel: channel,
          contactHandle: entry.contactHandle,
          sentAt,
          drawAt,
        },
        rootRef.current
      );
      saveTicketImage(blob, "mild-r-cafe-prize-ticket.png");
      markHuntTicketSaved();
      setMessage("ดาวน์โหลดรูปแล้ว ดูได้ในโฟลเดอร์ดาวน์โหลดของเครื่อง");
    } catch {
      setMessage("บันทึกรูปไม่ได้ในเบราว์เซอร์นี้ ให้จับภาพหน้าจอใบนี้แทน");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section
        ref={rootRef}
        aria-label="ใบยืนยันสิทธิ์ลุ้นรับรางวัล"
        className="relative -rotate-[0.6deg] bg-cafe-cream text-cafe-ink shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
      >
        <BrassPin className="-top-[9px] left-1/2 size-[18px] -translate-x-1/2" />
        <div className="px-[18px] pt-[22px] pb-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn(LABEL, "text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
                Prize Draw Ticket
              </p>
              <h2 className="mt-1 text-[22px] leading-[1.2] font-bold">
                ใบยืนยันสิทธิ์
              </h2>
            </div>
            <WaxSeal top="ENTERED" label="✓" turn={-9} className="-mt-1.5 -mr-1 size-[76px]" />
          </div>

          <dl className="mt-[18px] grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[15px] leading-normal">
            <dt className="pt-0.5 text-[13px] text-cafe-ink-muted">ชื่อผู้ติดต่อ</dt>
            <dd className="font-semibold [overflow-wrap:anywhere]">
              {entry.contactName}
            </dd>
            <dt className="pt-0.5 text-[13px] text-cafe-ink-muted">ช่องทาง</dt>
            <dd className="font-semibold">{channel}</dd>
            <dt className="pt-0.5 text-[13px] text-cafe-ink-muted">ชื่อบัญชี</dt>
            <dd className={cn(SERIF, "text-[15px] font-bold [overflow-wrap:anywhere]")}>
              {entry.contactHandle}
            </dd>
            <dt className="pt-0.5 text-[13px] text-cafe-ink-muted">ส่งเมื่อ</dt>
            <dd className="font-semibold">{sentAt}</dd>
          </dl>
        </div>

        <div className="relative border-t-2 border-dashed border-cafe-ink-soft/35" aria-hidden>
          <span className="absolute -top-3 -left-[11px] size-[22px] rounded-full bg-cafe-ground" />
          <span className="absolute -top-3 -right-[11px] size-[22px] rounded-full bg-cafe-ground" />
        </div>

        <div className="px-[18px] pt-4 pb-5">
          <p className="text-[12.5px] font-semibold text-cafe-gold-deep">ประกาศผลรางวัล</p>
          <p className="mt-0.5 text-base leading-normal font-bold">
            {drawAt || "รอประกาศจากทีมงาน"}
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-cafe-ink-muted">
            ถ้าได้รางวัล ทีมงานจะทักไปที่บัญชี {channel} ข้างบน
          </p>
        </div>
      </section>

      <p className={cn(WALL_NOTE, "mt-[26px] flex gap-3 border-cafe-gold-soft")}>
        ชื่อของคุณถูกบันทึกในระบบแล้ว ปิดหน้านี้หรือล้างประวัติได้ สิทธิ์ไม่หาย
      </p>

      <button
        type="button"
        onClick={saveImage}
        disabled={saving}
        className={cn(GOLD_BUTTON, "mt-[22px] min-h-[56px] gap-2.5 text-[17px] font-bold disabled:opacity-70")}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[22px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          aria-hidden
        >
          <path d="M12 4 v11 M7 11 l5 5 l5 -5 M5 20 h14" />
        </svg>
        {saving ? "กำลังสร้างรูป…" : "บันทึกรูปใบยืนยันสิทธิ์"}
      </button>
      <p className="mt-2 text-center text-[12.5px] leading-[1.6] text-cafe-muted" aria-live="polite">
        {message ?? "เก็บรูปไว้แสดงกับทีมงานถ้าได้รางวัล"}
      </p>

      <Link
        href="/cafe"
        className="mt-4 flex min-h-[50px] items-center justify-center border-[1.5px] border-cafe-gold/65 px-4 text-[15.5px] font-semibold text-cafe-cream transition hover:bg-cafe-gold/15 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
      >
        กลับหน้าคาเฟ่
      </Link>

      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setResetOpen(true);
        }}
        className={cn(WALL_LINK, "mx-auto mt-4 flex gap-2 px-2")}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[18px] shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          aria-hidden
        >
          <path d="M4 12 a8 8 0 1 0 2.6 -5.9 M4 4 v4.5 h4.5" />
        </svg>
        เริ่มเล่นใหม่
      </button>

      {resetOpen ? (
        <HuntResetDialog
          total={total}
          saved={saved}
          saving={saving}
          saveMessage={message}
          onSave={saveImage}
          onConfirm={playAgain}
          onCancel={closeReset}
        />
      ) : null}
    </>
  );
}
