"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

import { Pin, Stamp, TYPE } from "@/components/cafe/board/pieces";
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
        className="relative -rotate-1 bg-[#f4ebe3] text-[#1a1410] shadow-[0_18px_34px_rgba(0,0,0,0.55)]"
      >
        <Pin />
        <div className="px-[18px] pt-[22px] pb-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636] uppercase")}>
                Prize Draw Ticket
              </p>
              <h2 className="mt-1 text-[22px] leading-[1.2] font-semibold">
                ใบยืนยันสิทธิ์
              </h2>
            </div>
            <Stamp className="shrink-0 rotate-[7deg] text-[15px]">Entered</Stamp>
          </div>

          <dl className="mt-[18px] grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[15px] leading-normal">
            <dt className="pt-0.5 text-[13px] text-[#5c4636]">ชื่อผู้ติดต่อ</dt>
            <dd className="font-semibold [overflow-wrap:anywhere]">
              {entry.contactName}
            </dd>
            <dt className="pt-0.5 text-[13px] text-[#5c4636]">ช่องทาง</dt>
            <dd>{channel}</dd>
            <dt className="pt-0.5 text-[13px] text-[#5c4636]">ชื่อบัญชี</dt>
            <dd className={cn(TYPE, "text-base [overflow-wrap:anywhere]")}>
              {entry.contactHandle}
            </dd>
            <dt className="pt-0.5 text-[13px] text-[#5c4636]">ส่งเมื่อ</dt>
            <dd>{sentAt}</dd>
          </dl>
        </div>

        <div className="relative border-t-2 border-dashed border-[#5c4636]" aria-hidden>
          <span className="absolute -top-3 -left-[11px] size-[22px] rounded-full bg-[#0a0c0e]" />
          <span className="absolute -top-3 -right-[11px] size-[22px] rounded-full bg-[#0a0c0e]" />
        </div>

        <div className="px-[18px] pt-4 pb-5">
          <p className="text-[13px] text-[#5c4636]">ประกาศผลรางวัล</p>
          <p className="mt-0.5 text-base leading-normal font-semibold">
            {drawAt || "รอประกาศจากทีมงาน"}
          </p>
          <p className="mt-2 text-sm leading-[1.6] text-[#3d3024]">
            ถ้าได้รางวัล ทีมงานจะทักไปที่บัญชี {channel} ข้างบน
          </p>
        </div>
      </section>

      <p className="mt-[26px] flex gap-3 border-l-4 border-[#b9e6e1] bg-[#14100c] px-3.5 py-3 text-sm leading-[1.6] text-[#d8d0c4]">
        ชื่อของคุณถูกบันทึกในระบบแล้ว ปิดหน้านี้หรือล้างประวัติได้ สิทธิ์ไม่หาย
      </p>

      <button
        type="button"
        onClick={saveImage}
        disabled={saving}
        className="mt-[22px] flex min-h-[54px] w-full items-center justify-center gap-2.5 bg-[#e85a7a] px-4 text-[17px] font-semibold text-[#1a1410] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#f4ebe3] disabled:opacity-70"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[22px] fill-none stroke-[#1a1410] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          aria-hidden
        >
          <path d="M12 4 v11 M7 11 l5 5 l5 -5 M5 20 h14" />
        </svg>
        {saving ? "กำลังสร้างรูป…" : "บันทึกรูปใบยืนยันสิทธิ์"}
      </button>
      <p className="mt-2 text-center text-[13px] leading-[1.6] text-[#c4b8a8]" aria-live="polite">
        {message ?? "เก็บรูปไว้แสดงกับทีมงานถ้าได้รางวัล"}
      </p>

      <Link
        href="/cafe"
        className="mt-3 flex min-h-[52px] items-center justify-center border-2 border-[#f4ebe3] px-4 text-base font-semibold text-[#f4ebe3] transition hover:bg-[#f4ebe3] hover:text-[#1a1410] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
      >
        กลับหน้าคาเฟ่
      </Link>

      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setResetOpen(true);
        }}
        className="mx-auto mt-4 flex min-h-11 items-center gap-2 px-2 text-[15px] font-semibold text-[#f3b8c4] underline underline-offset-4 transition hover:text-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
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
