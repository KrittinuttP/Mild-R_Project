import type { Metadata } from "next";

import { LABEL, SERIF, TYPE } from "@/components/cafe/board/pieces";
import { WALL_NOTE } from "@/components/cafe/hunt/HuntFrame";
import { HuntFrame } from "@/components/cafe/hunt/HuntFrame";
import { QrCodeSvg } from "@/components/cafe/hunt/QrCodeSvg";
import { cafeHunt } from "@/lib/cafe-hunt";
import { cafeHuntTokens } from "@/lib/cafe-hunt-tokens";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `QR ${cafeHunt.title}`,
  robots: { index: false, follow: false, nocache: true },
};

/** Site address the QR links start with; trailing slash removed. */
function siteUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return value || null;
}

type QrCard = {
  key: string;
  kicker: string;
  title: string;
  url: string;
  /** What should happen when this one is scanned (test cards only). */
  expect?: string;
};

/**
 * Every evidence QR on one page — to test scanning, and to show or print the
 * codes at the event. Open to everyone by decision of the event team; the
 * page is unlisted (no links to it, not indexed).
 */
export default function CafeHuntQrPage() {
  const base = siteUrl();
  const tokens = cafeHuntTokens();

  const evidence: QrCard[] =
    base && tokens
      ? cafeHunt.items.map((item, index) => ({
          key: item.id,
          kicker: `EX. ${String(index + 1).padStart(2, "0")}`,
          title: item.name || `หลักฐานชิ้นที่ ${index + 1}`,
          url: `${base}/cafe/hunt/${encodeURIComponent(tokens[index])}`,
        }))
      : [];

  const tests: QrCard[] = base
    ? [
        {
          key: "test-other",
          kicker: "TEST · NOT EVIDENCE",
          title: "QR ที่ไม่ใช่ของกิจกรรม",
          url: `${base}/cafe`,
          expect:
            "สแกนด้วยปุ่มในหน้าเว็บ: ขึ้น \"QR นี้ไม่ใช่จุดหลักฐาน\" · แอปกล้อง: เปิดหน้าคาเฟ่",
        },
        {
          key: "test-invalid",
          kicker: "TEST · WRONG CODE",
          title: "QR รหัสผิด",
          url: `${base}/cafe/hunt/not-a-real-evidence-code`,
          expect: "เปิดหน้า \"QR นี้ใช้ไม่ได้\" ไม่มีตราเพิ่ม",
        },
      ]
    : [];

  return (
    <HuntFrame width="wide">
      <div className="max-w-3xl print:hidden">
        <p className={LABEL}>Evidence Hunt · QR Sheet</p>
        <h1 className="mt-1.5 text-[28px] leading-[1.25] font-bold text-cafe-cream">
          QR จุดหลักฐานทั้งหมด
        </h1>
        <p className="mt-2 text-sm leading-[1.7] text-cafe-muted">
          ลิงก์ใน QR สร้างจาก <code className={TYPE}>NEXT_PUBLIC_SITE_URL</code>
          {base ? (
            <>
              {" "}
              ตอนนี้คือ <code className={cn(TYPE, "text-cafe-gold-soft")}>{base}</code>
            </>
          ) : null}{" "}
          ปุ่มสแกนในหน้าเว็บอ่านเฉพาะรหัสในลิงก์ ถึงโดเมนเปลี่ยน QR เดิมก็ยังสแกนได้
          ส่วนแอปกล้องของมือถือจะเปิดตามโดเมนที่อยู่ใน QR
        </p>
      </div>

      {!base ? (
        <p role="alert" className={cn(WALL_NOTE, "mt-6 max-w-3xl")}>
          ยังไม่ได้ตั้ง <code className={TYPE}>NEXT_PUBLIC_SITE_URL</code> ในไฟล์ .env
          จึงสร้าง QR ไม่ได้ ตั้งค่าแล้วเปิด npm run dev ใหม่
        </p>
      ) : null}
      {base && !tokens ? (
        <p role="alert" className={cn(WALL_NOTE, "mt-6 max-w-3xl")}>
          ยังไม่ได้ตั้ง <code className={TYPE}>CAFE_HUNT_TOKENS</code> ให้ครบ{" "}
          {cafeHunt.items.length} รหัส (รหัสละอย่างน้อย 16 ตัวอักษร ไม่ซ้ำกัน)
          จึงยังไม่มี QR หลักฐาน มีแค่ QR สำหรับเทสกรณีผิดด้านล่าง
        </p>
      ) : null}

      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 print:mt-0 print:block">
        {[...evidence, ...tests].map((card) => (
          <li
            key={card.key}
            className="flex flex-col bg-cafe-cream p-5 text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)] print:break-after-page print:bg-white print:shadow-none"
          >
            <p className={cn(SERIF, "text-[11px] font-bold tracking-[0.18em] text-cafe-wax uppercase")}>
              {card.kicker}
            </p>
            <h2 className="mt-1 text-xl leading-[1.3] font-bold">{card.title}</h2>
            <QrCodeSvg
              value={card.url}
              label={`QR ${card.kicker} ${card.title}`}
              className="mx-auto mt-4 block aspect-square w-full max-w-[320px]"
            />
            <p className={cn(TYPE, "mt-3 text-center text-xs break-all text-cafe-ink-soft")}>
              {card.url}
            </p>
            {card.expect ? (
              <p className="mt-3 border-t border-dashed border-cafe-ink-soft/40 pt-3 text-sm leading-[1.6] text-cafe-ink-soft">
                ผลที่ควรได้: {card.expect}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </HuntFrame>
  );
}
