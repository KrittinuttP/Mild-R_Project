import type { Metadata } from "next";

import { HbdScroll } from "@/components/hbd/HbdScroll";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { loadApprovedHbdWishes } from "@/lib/hbd-submissions-store";

export const metadata: Metadata = {
  title: "Birthday Wishes | Mild-R Fanclub",
  description:
    "แกลเลอรีอวยพรวันเกิด Mild-R จากฮันนี่ — เลื่อนดูคำอวยพรทีละใบ",
};

export const revalidate = 30;

export default async function HbdPage() {
  const approved = await loadApprovedHbdWishes();
  const hbd = {
    ...mildRData.hbd,
    wishes: [
      ...mildRData.hbd.wishes.filter((wish) => !wish.fromUpload),
      ...approved,
    ],
  };

  return (
    <>
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
