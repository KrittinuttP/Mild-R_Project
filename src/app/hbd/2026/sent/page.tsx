import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MailPlus } from "lucide-react";

import { HbdSentList, type HbdSentListRow } from "@/components/hbd/HbdSentList";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { mildRData } from "@/data/vtuber-data";
import { loadHbdSentNames } from "@/lib/hbd-submissions-store";
import { R_CTA_PRIMARY_CLASS, R_EYEBROW_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ฮันนี่ที่ส่งการ์ดแล้ว | Mild-R HBD 2026",
  description: "รายชื่อฮันนี่ที่ส่งการ์ดอวยพรวันเกิด Mild-R · 12 Dec 2026 มาแล้ว",
};

/** New cards show within a minute; sending, hiding or rejecting refreshes it at once. */
export const revalidate = 60;

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";

/** "22 Nov", Bangkok time (formatted here so server and browser agree). */
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Bangkok",
});

export default async function Hbd2026SentPage() {
  const names = await loadHbdSentNames();
  const rows: HbdSentListRow[] = names.map((row, index) => ({
    // Oldest card = 1, so a name keeps its number as new cards arrive.
    number: names.length - index,
    name: row.name,
    date: DAY_MONTH.format(new Date(row.sentAt)),
  }));

  return (
    <>
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d] text-[#f7d7de]">
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-5 sm:py-20">
          <Link
            href="/hbd/2026"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/20 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
              FOCUS
            )}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            คำอวยพร
          </Link>

          <header className="mt-6">
            <p className={R_EYEBROW_CLASS}>Birthday · 12 Dec 2026</p>
            <h1
              className={cn(
                DISPLAY,
                "mt-2.5 text-[1.875rem] leading-tight font-normal text-r-text sm:text-[2.125rem]"
              )}
            >
              ฮันนี่ที่ส่งการ์ดแล้ว
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-r-text-2">
              เจอชื่อตัวเองในรายชื่อ <span className="whitespace-nowrap">แปลว่าการ์ดส่งถึงแล้ว</span>
            </p>
          </header>

          <HbdSentList rows={rows} />

          <Link href="/hbd/2026/upload" className={cn(R_CTA_PRIMARY_CLASS, "mt-8 w-full")}>
            <MailPlus className="size-4" aria-hidden />
            {rows.length ? "ยังไม่ได้ส่ง? ส่งการ์ดอวยพร" : "ส่งการ์ดอวยพร"}
          </Link>
        </div>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
