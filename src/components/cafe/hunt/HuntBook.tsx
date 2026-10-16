"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { LABEL, SERIF } from "@/components/cafe/board/pieces";
import { NAME_ART } from "@/components/cafe/hunt/HuntCelebrate";
import { HuntEntryForm } from "@/components/cafe/hunt/HuntEntryForm";
import {
  GOLD_BUTTON,
  KeyholePlate,
  WALL_NOTE,
  WaxSeal,
} from "@/components/cafe/hunt/HuntFrame";
import { HuntNote, type HuntNoteVariant } from "@/components/cafe/hunt/HuntNote";
import { HuntNotice } from "@/components/cafe/hunt/HuntNotice";
import { HuntThreadStrip } from "@/components/cafe/hunt/HuntThreadStrip";
import { HuntScanner } from "@/components/cafe/hunt/HuntScanner";
import { HuntStampModal } from "@/components/cafe/hunt/HuntStampModal";
import { HuntTicket } from "@/components/cafe/hunt/HuntTicket";
import { useHuntState } from "@/components/cafe/hunt/useHuntState";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import { addHuntStamp, EMPTY_HUNT_STATE } from "@/lib/cafe-hunt-storage";
import { cn } from "@/lib/utils";

/** Browsers inside chat / social apps keep their own storage, apart from Safari or Chrome. */
const IN_APP_BROWSER = /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|TikTok|Twitter/i;

const noSubscription = () => () => {};
const isInAppBrowser = () => IN_APP_BROWSER.test(window.navigator.userAgent);

const BOOK_PATH = "/cafe/hunt";
/** Marks the history entry pushed while the camera is open (Back closes it). */
const SCAN_QUERY = "scan";

function scannerInUrl() {
  return new URLSearchParams(window.location.search).has(SCAN_QUERY);
}

/** How the visitor got here when a phone camera app opened a QR link. */
export type HuntArrival =
  | { kind: "found"; index: number; token: string }
  | { kind: "invalid" };

type HuntBookProps = {
  /** Set by /cafe/hunt/[code]: stamp (or report) once the notice is accepted. */
  arrival?: HuntArrival;
  huntTitle: string;
  cafeTitle: string;
  drawAt: string;
  items: CafeHuntItem[];
  caseNo?: string;
};

/** Stamp book: every piece, what is still missing, then the form or the ticket. */
export function HuntBook({
  arrival,
  huntTitle,
  cafeTitle,
  drawAt,
  items,
  caseNo,
}: HuntBookProps) {
  const { state, broken } = useHuntState();
  const current = state ?? EMPTY_HUNT_STATE;
  const inApp = useSyncExternalStore(noSubscription, isInAppBrowser, () => false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const closeNotice = useCallback(() => setNoticeOpen(false), []);
  const [scannerOpen, setScannerOpen] = useState(false);
  /** Piece stamped on arrival from a camera-app scan; result window open while set. */
  const [arrivalStamp, setArrivalStamp] = useState<number | null>(null);
  const [bookNote, setBookNote] = useState<{
    variant: HuntNoteVariant;
    number?: number;
  } | null>(null);
  const arrivalHandled = useRef(false);
  const scrollTopAfterClose = useRef(false);

  // The camera gets its own history entry, so the phone's Back gesture
  // closes it instead of leaving the book.
  const openScanner = useCallback(() => {
    setBookNote(null);
    if (!scannerInUrl()) window.history.pushState(null, "", `?${SCAN_QUERY}`);
    setScannerOpen(true);
  }, []);

  const closeScanner = useCallback((next?: "form") => {
    scrollTopAfterClose.current = next === "form";
    if (scannerInUrl()) {
      window.history.back();
    } else {
      setScannerOpen(false);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (scannerInUrl()) return;
      setScannerOpen(false);
      if (scrollTopAfterClose.current) {
        scrollTopAfterClose.current = false;
        // The entry form sits at the top once every piece is in.
        window.setTimeout(() => window.scrollTo({ top: 0 }), 0);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Arrived from a phone camera app: stamp straight away (after the storage
  // notice on a first visit), then show the book's own address so Back and
  // reload do not repeat the scan.
  const noticeAccepted = Boolean(state?.noticeAcceptedAt);
  useEffect(() => {
    if (!arrival || arrivalHandled.current || !noticeAccepted) return;
    arrivalHandled.current = true;
    window.history.replaceState(null, "", BOOK_PATH);

    const item = arrival.kind === "found" ? items[arrival.index] : undefined;
    if (arrival.kind === "found" && item) {
      if (addHuntStamp(item.id, arrival.token) === "new") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once, after the visitor accepted the notice
        setArrivalStamp(arrival.index);
      } else {
        setBookNote({ variant: "already", number: arrival.index + 1 });
      }
      return;
    }
    setBookNote({ variant: "invalid" });
  }, [arrival, items, noticeAccepted]);

  const total = items.length;
  const count = items.filter((item) => current.stamps[item.id]).length;
  const complete = total > 0 && count === total;
  const entry = current.entry;

  // One piece left: fetch the celebration art now so it is ready on the last scan.
  useEffect(() => {
    if (total > 0 && count === total - 1) new window.Image().src = NAME_ART;
  }, [count, total]);

  const heading = entry
    ? "ได้สิทธิ์ลุ้นรับรางวัลแล้ว"
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
          <h1 className="mt-1.5 text-[28px] leading-[1.25] font-bold text-cafe-cream">
            {heading}
          </h1>
          {complete && !entry ? (
            <p className="mt-1 text-[14px] leading-[1.6] text-cafe-muted">
              กรอกข้อมูลด้านล่างเพื่อรับสิทธิ์ลุ้นรับรางวัล
            </p>
          ) : null}
          {entry ? (
            <p className="mt-1 text-[14px] leading-[1.6] text-cafe-muted">
              ขอบคุณที่ช่วยเก็บหลักฐานจนครบ ผู้ช่วยนักสืบฮันนี่
            </p>
          ) : null}
        </div>
        {entry ? null : complete ? (
          // The ticket below carries the ENTERED seal once the form is sent.
          <WaxSeal top="SOLVED" label="✓" turn={8} className="mb-1.5 size-[84px]" />
        ) : (
          <div className="shrink-0 text-right" aria-live="polite">
            <p className={cn(SERIF, "text-[40px] leading-none font-bold whitespace-nowrap text-cafe-gold-soft")}>
              {count}
              <span className="text-lg font-normal text-cafe-muted"> / {total}</span>
            </p>
            <p className="mt-1.5 text-[13px] text-cafe-muted">{progress}</p>
          </div>
        )}
      </div>

      {bookNote ? (
        <HuntNote
          variant={bookNote.variant}
          number={bookNote.number}
          onClose={() => setBookNote(null)}
          className="mt-6"
        />
      ) : null}

      {broken ? (
        <p
          role="alert"
          className={cn(WALL_NOTE, "mt-5")}
        >
          เครื่องนี้บันทึกตราประทับไม่ได้ ตราจะหายเมื่อปิดหน้านี้
          ลองปิดโหมดไม่ระบุตัวตน หรือเปิดด้วยเบราว์เซอร์หลักของเครื่องแล้วสแกนใหม่
        </p>
      ) : null}
      {inApp && !entry ? (
        <p className={cn(WALL_NOTE, "mt-5")}>
          ตอนนี้เปิดอยู่ในเบราว์เซอร์ของแอป ตราจะไม่รวมกับที่สแกนด้วยกล้องมือถือ
          แนะนำให้เปิดลิงก์นี้ใน Safari หรือ Chrome แล้วใช้ตัวเดียวจนครบ
        </p>
      ) : null}

      {count === 0 ? (
        <section
          aria-labelledby="hunt-steps-title"
          className="relative mt-[26px] -rotate-[0.5deg] bg-cafe-cream px-[18px] pt-5 pb-[18px] text-cafe-ink shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
        >
          <KeyholePlate className="-top-3 left-[22px]" />
          <p className={cn(LABEL, "pl-[34px] text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
            How to play
          </p>
          <h2 id="hunt-steps-title" className="mt-0.5 pl-[34px] text-[19px] font-bold">
            ขั้นตอนการร่วมกิจกรรม
          </h2>
          <ol className="mt-2.5 flex flex-col gap-[9px] text-sm leading-[1.65] text-cafe-ink-soft">
            {[
              <>
                ตามหา <strong className="font-bold text-cafe-ink">QR หลักฐาน {total} จุด</strong>{" "}
                ที่ซ่อนอยู่ในร้าน สแกนจุดไหนก่อนก็ได้
              </>,
              <>
                กด <strong className="font-bold text-cafe-ink">สแกน QR หลักฐาน</strong>{" "}
                ด้านล่าง เล็งกล้องไปที่ QR ระบบจะประทับตราให้ทันที
              </>,
              <>
                ครบ {total} ตรา กรอกชื่อเพื่อ{" "}
                <strong className="font-bold text-cafe-ink">ลุ้นรับรางวัล</strong>
              </>,
            ].map((step, index) => (
              <li key={index} className="flex gap-[11px]">
                <span
                  className={cn(
                    SERIF,
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-cafe-gold-deep text-[11px] font-bold text-cafe-gold-deep"
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
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
            total={total}
            saved={Boolean(current.ticketSavedAt)}
          />
        </div>
      ) : complete ? (
        <div className="mt-[30px]">
          <HuntEntryForm
            tokens={items.map((item) => current.stamps[item.id]?.token ?? "")}
          />
        </div>
      ) : null}

      <HuntThreadStrip items={items} stamps={current.stamps} />

      {entry ? null : (
        <section
          aria-label="คำเตือนเรื่องเก็บข้อมูล"
          className={cn(WALL_NOTE, "mt-[22px] flex gap-3")}
        >
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 size-5 shrink-0 fill-none stroke-cafe-gold-soft stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            aria-hidden
          >
            <path d="M12 3 L22 20 H2 Z" />
            <path d="M12 10 v5 M12 17.5 v0.5" />
          </svg>
          <div className="min-w-0">
            <p>
              ตราเก็บไว้ในมือถือเครื่องนี้เท่านั้น
              อย่าล้างประวัติหรือเปลี่ยนเบราว์เซอร์จนกว่าจะส่งชื่อ
            </p>
            <button
              type="button"
              onClick={() => setNoticeOpen(true)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-gold-soft underline underline-offset-4 transition hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
            >
              อ่านคำเตือนทั้งหมด
            </button>
          </div>
        </section>
      )}

      {complete || entry ? null : (
        <section
          aria-label="สิทธิ์ลุ้นรับรางวัล"
          className="mt-3.5 flex items-center gap-[13px] border border-dashed border-cafe-gold/55 px-3.5 py-[13px]"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6 shrink-0 fill-none stroke-cafe-gold stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" />
          </svg>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-cafe-cream">
              {count === 0
                ? `ครบ ${total} ตรา ได้ลุ้นรับรางวัล`
                : `อีก ${total - count} ตรา ได้ลุ้นรับรางวัล`}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-[1.6] text-cafe-muted">
              ฟอร์มลงชื่อจะเปิดทันทีที่ตราครบ
            </p>
          </div>
        </section>
      )}

      {complete || entry ? null : (
        // Sticks to the bottom of the screen while the book scrolls; ends with the book.
        <div className="sticky bottom-0 z-30 -mx-5 mt-6 bg-[linear-gradient(rgba(15,42,36,0),var(--color-cafe-ground)_40%)] px-5 pt-10 pb-[max(22px,env(safe-area-inset-bottom))] sm:-mx-8 sm:px-8">
          <button
            type="button"
            onClick={openScanner}
            className={cn(GOLD_BUTTON, "min-h-[58px] text-lg font-bold")}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6 shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
              aria-hidden
            >
              <path d="M4 8 V5 a1 1 0 0 1 1 -1 h3 M16 4 h3 a1 1 0 0 1 1 1 v3 M20 16 v3 a1 1 0 0 1 -1 1 h-3 M8 20 H5 a1 1 0 0 1 -1 -1 v-3" />
              <path d="M8 8 h3 v3 H8 z M13 13 h3 v3 h-3 z M13 8 h3 M8 13 v3 h3" />
            </svg>
            สแกน QR หลักฐาน
          </button>
          <p className="mt-2.5 text-center text-[12.5px] leading-[1.6] text-cafe-muted">
            เปิดกล้องในหน้านี้ ตราจะอยู่ในเบราว์เซอร์เดียวกันเสมอ
          </p>
        </div>
      )}

      {scannerOpen ? (
        <HuntScanner items={items} onClose={closeScanner} />
      ) : null}
      {arrivalStamp !== null && items[arrivalStamp] ? (
        <HuntStampModal
          item={items[arrivalStamp]}
          index={arrivalStamp}
          stampedIds={items
            .filter((item) => current.stamps[item.id])
            .map((item) => item.id)}
          itemIds={items.map((item) => item.id)}
          onPrimary={() => {
            setArrivalStamp(null);
            if (complete) {
              window.scrollTo({ top: 0 });
            } else {
              openScanner();
            }
          }}
          onBook={() => setArrivalStamp(null)}
        />
      ) : null}
      {noticeOpen ? <HuntNotice required={false} onClose={closeNotice} /> : null}
    </>
  );
}
