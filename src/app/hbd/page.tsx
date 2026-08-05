import type { Metadata } from "next";

import { HbdScroll } from "@/components/hbd/HbdScroll";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Birthday Wishes | Mild-R Fanclub",
  description:
    "แกลเลอรีอวยพรวันเกิด Mild-R จากฮันนี่ — เลื่อนดูคำอวยพรทีละใบ",
};

export default function HbdPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <HbdScroll data={mildRData} hbd={mildRData.hbd} />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
