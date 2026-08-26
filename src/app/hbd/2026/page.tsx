import type { Metadata } from "next";

import { HbdScroll } from "@/components/hbd/HbdScroll";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SectionScrollRestore } from "@/components/layout/SectionScrollRestore";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { loadApprovedHbdWishes } from "@/lib/hbd-submissions-store";

export const metadata: Metadata = {
  title: "คำอวยพรวันเกิด | Mild-R Fanclub",
  description:
    "คำอวยพรวันเกิด Mild-R จากฮันนี่ — สุขสันต์วันเกิดในโอกาส 12.12.2026",
};

/** Always fetch approved wishes fresh — avoid stale ISR after admin approve */
export const dynamic = "force-dynamic";

export default async function Hbd2026Page() {
  const approved = await loadApprovedHbdWishes();
  const hbd = {
    ...mildRData.hbd,
    wishes: approved,
  };

  return (
    <>
      <SectionScrollRestore />
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <HbdScroll data={mildRData} hbd={hbd} />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
