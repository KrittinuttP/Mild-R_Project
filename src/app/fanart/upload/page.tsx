import type { Metadata } from "next";

import { FanartUploadClient } from "@/components/fanart/FanartUploadClient";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "ส่งแฟนอาร์ต | Mild-R",
  description: "อัปโหลดแฟนอาร์ต Mild-R ให้ทีมงานตรวจก่อนเก็บเข้าคลัง",
};

export default function FanartUploadPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d] text-[#f7d7de]">
        <FanartUploadClient />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
