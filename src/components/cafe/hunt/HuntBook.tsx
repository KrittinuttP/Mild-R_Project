"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import {
  CorkBoard,
  HAND,
  LABEL,
  Pin,
  SERIF,
  Stamp,
  TYPE,
} from "@/components/cafe/board/pieces";
import { HuntEntryForm } from "@/components/cafe/hunt/HuntEntryForm";
import { StampMark } from "@/components/cafe/hunt/HuntFrame";
import { HuntNotice } from "@/components/cafe/hunt/HuntNotice";
import { HuntTicket } from "@/components/cafe/hunt/HuntTicket";
import { useHuntState } from "@/components/cafe/hunt/useHuntState";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import { EMPTY_HUNT_STATE } from "@/lib/cafe-hunt-storage";
import { cn } from "@/lib/utils";

/** Browsers inside chat / social apps keep their own storage, apart from Safari or Chrome. */
const IN_APP_BROWSER = /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|TikTok|Twitter/i;

const noSubscription = () => () => {};
const isInAppBrowser = () => IN_APP_BROWSER.test(window.navigator.userAgent);

const TURNS = [-10, 7, -4, 11, -7];
const TILTS = [-0.5, 0.6, -0.4, 0.5, -0.6];

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} น.`;
}

type HuntBookProps = {
  huntTitle: string;
  cafeTitle: string;
  drawAt: string;
  items: CafeHuntItem[];
  caseNo?: string;
};

/** Stamp book: every piece, what is still missing, then the form or the ticket. */
export function HuntBook({ huntTitle, cafeTitle, drawAt, items, caseNo }: HuntBookProps) {
  const { state, broken } = useHuntState();
  const current = state ?? EMPTY_HUNT_STATE;
  const inApp = useSyncExternalStore(noSubscription, isInAppBrowser, () => false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const closeNotice = useCallback(() => setNoticeOpen(false), []);

  const total = items.length;
  const count = items.filter((item) => current.stamps[item.id]).length;
  const complete = total > 0 && count === total;
  const entry = current.entry;

  const heading = entry
    ? "ได้สิทธิ์ลุ้นวงล้อแล้ว"
    : complete
      ? "เก็บหลักฐานครบแล้ว"
      : "สมุดสะสมหลักฐาน";
  const progress = complete
    ? "ครบทุกชิ้น"
    : count === 0
      ? "ยังไม่ได้เริ่ม"
      : `เหลืออีก ${total - count} ชิ้น`;

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {caseNo ? <p className={LABEL}>{caseNo}</p> : null}
          <h1 className={cn(HAND, "mt-1 text-[27px] leading-[1.25] text-[#f4ebe3]")}>
            {heading}
          </h1>
          {complete && !entry ? (
            <p className="mt-1 text-[15px] leading-[1.6] text-[#c4b8a8]">
              กรอกข้อมูลด้านล่างเพื่อรับสิทธิ์ลุ้นวงล้อ
            </p>
          ) : null}
          {entry ? (
            <p className="mt-1 text-[15px] leading-[1.6] text-[#c4b8a8]">
              ขอบคุณที่ช่วยเก็บหลักฐานจนครบ นักสืบฮันนี่
            </p>
          ) : null}
        </div>
        {complete || entry ? (
          <Stamp tone="wall" className="mb-1 shrink-0 rotate-6 text-center text-sm leading-[1.15]">
            Case
            <br />
            {entry ? "Closed" : "Solved"}
          </Stamp>
        ) : (
          <div className="shrink-0 text-right" aria-live="polite">
            <p className={cn(SERIF, "text-[38px] leading-none text-[#f3b8c4]")}>
              {count}
              <span className="text-xl text-[#c4b8a8]"> / {total}</span>
            </p>
            <p className="mt-1 text-[13px] text-[#c4b8a8]">{progress}</p>
          </div>
        )}
      </div>

      {broken ? (
        <p
          role="alert"
          className="mt-5 border-l-4 border-[#f2c230] bg-[#14100c] px-3.5 py-3 text-sm leading-[1.6] text-[#f4ebe3]"
        >
          เครื่องนี้บันทึกตราประทับไม่ได้ ตราจะหายเมื่อปิดหน้านี้
          ลองปิดโหมดไม่ระบุตัวตน หรือเปิดด้วยเบราว์เซอร์หลักของเครื่องแล้วสแกนใหม่
        </p>
      ) : null}
      {inApp && !entry ? (
        <p className="mt-5 border-l-4 border-[#f2c230] bg-[#14100c] px-3.5 py-3 text-sm leading-[1.6] text-[#f4ebe3]">
          ตอนนี้เปิดอยู่ในเบราว์เซอร์ของแอป ตราจะไม่รวมกับที่สแกนด้วยกล้องมือถือ
          แนะนำให้เปิดลิงก์นี้ใน Safari หรือ Chrome แล้วใช้ตัวเดียวจนครบ
        </p>
      ) : null}

      {count === 0 ? (
        <section
          aria-label="วิธีเล่น"
          className="relative mt-5 -rotate-[0.6deg] bg-[#f4ebe3] px-4 pt-4 pb-3.5 text-[#1a1410] shadow-[0_14px_26px_rgba(0,0,0,0.45)]"
        >
          <Pin />
          <h2 className={cn(HAND, "text-[19px] text-[#7a1f2a]")}>
            สแกนจุดไหนก่อนก็ได้
          </h2>
          <ol className="mt-2 list-decimal pl-5 text-sm leading-[1.7] text-[#3d3024]">
            <li>หา QR ให้ครบ {total} จุดในงาน ไม่ต้องเรียงลำดับ</li>
            <li>
              สแกนแล้วกด{" "}
              <strong className="font-semibold text-[#1a1410]">ประทับตรา</strong>{" "}
              ตราจะขึ้นในสมุดนี้
            </li>
            <li>ครบ {total} ชิ้น กรอกชื่อเพื่อลุ้นวงล้อ</li>
          </ol>
        </section>
      ) : null}

      {entry ? (
        <div className="mt-[30px]">
          <HuntTicket
            entry={entry}
            huntTitle={huntTitle}
            cafeTitle={cafeTitle}
            drawAt={drawAt}
          />
        </div>
      ) : complete ? (
        <div className="mt-[30px]">
          <HuntEntryForm
            tokens={items.map((item) => current.stamps[item.id]?.token ?? "")}
          />
        </div>
      ) : null}

      <CorkBoard className="mt-[30px] p-3.5">
        <ul aria-label={`หลักฐานทั้ง ${total} ชิ้น`} className="flex flex-col gap-2.5">
          {items.map((item, index) => {
            const stamp = current.stamps[item.id];
            const number = index + 1;
            const label = String(number).padStart(2, "0");
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 bg-[#f4ebe3] px-3 py-2.5 text-[#1a1410] shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
                style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
              >
                <StampMark
                  number={number}
                  found={Boolean(stamp)}
                  turn={TURNS[index % TURNS.length]}
                />
                <div className="min-w-0">
                  <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636]")}>
                    EX. {label} ·{" "}
                    {stamp ? `เก็บแล้ว ${formatTime(stamp.at)}` : "ยังไม่พบ"}
                  </p>
                  {stamp ? (
                    <p className="mt-0.5 text-[15px] leading-[1.4] font-semibold break-words">
                      {item.name || `หลักฐานชิ้นที่ ${number}`}
                    </p>
                  ) : (
                    <p className={cn(HAND, "mt-0.5 text-base leading-[1.35] break-words text-[#7a1f2a]")}>
                      {item.hint ? `คำใบ้: ${item.hint}` : "สแกน QR ของจุดนี้เพื่อเก็บ"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CorkBoard>

      {entry ? null : (
        <section
          aria-label="คำเตือนเรื่องเก็บข้อมูล"
          className="mt-5 flex gap-3 border-l-4 border-[#e85a7a] bg-[#14100c] px-3.5 py-3"
        >
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 size-[22px] shrink-0 fill-none stroke-[#f3b8c4] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            aria-hidden
          >
            <path d="M12 3 L22 20 H2 Z" />
            <path d="M12 10 v5 M12 17.5 v0.5" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm leading-[1.6] text-[#d8d0c4]">
              ตราเก็บไว้ในมือถือเครื่องนี้เท่านั้น
              อย่าล้างประวัติหรือเปลี่ยนเบราว์เซอร์จนกว่าจะส่งฟอร์ม
            </p>
            <button
              type="button"
              onClick={() => setNoticeOpen(true)}
              className="mt-0.5 inline-flex min-h-11 items-center text-sm font-semibold text-[#f3b8c4] underline underline-offset-4 transition hover:text-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]"
            >
              อ่านคำเตือนทั้งหมด
            </button>
          </div>
        </section>
      )}

      {complete || entry ? null : (
        <section
          aria-label="สิทธิ์ลุ้นวงล้อ"
          className="mt-4 flex items-center gap-3.5 border border-dashed border-[#c4a882]/55 p-3.5"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[26px] shrink-0 fill-none stroke-[#c4a882] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" />
          </svg>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#f4ebe3]">
              ครบ {total} ชิ้นแล้วจะได้ลุ้นวงล้อ
            </p>
            <p className="mt-0.5 text-[13px] leading-[1.6] text-[#c4b8a8]">
              ฟอร์มจะเปิดให้กรอกทันทีที่ตราครบ
            </p>
          </div>
        </section>
      )}

      {noticeOpen ? <HuntNotice required={false} onClose={closeNotice} /> : null}
    </>
  );
}
