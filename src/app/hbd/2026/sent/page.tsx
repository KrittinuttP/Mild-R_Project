import type { Metadata } from "next";

import { HbdSentPage } from "@/components/hbd/HbdSentPage";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { mildRData } from "@/data/vtuber-data";
import { loadHbdSentRows } from "@/lib/hbd-sent";

export const metadata: Metadata = {
  title: "ฮันนี่ที่ส่งการ์ดแล้ว | Mild-R HBD 2026",
  description: "รายชื่อฮันนี่ที่ส่งการ์ดอวยพรวันเกิด Mild-R · 12 Dec 2026 มาแล้ว",
};

/** New cards show within a minute; sending, hiding or rejecting refreshes it at once. */
export const revalidate = 60;

export default async function Hbd2026SentPage() {
  const rows = await loadHbdSentRows();
  return (
    <>
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d] text-[#f7d7de]">
        <HbdSentPage
          rows={rows}
          back={{ href: "/hbd/2026", label: "คำอวยพร" }}
          sendHref="/hbd/2026/upload"
          className="py-16 sm:py-20"
        />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
