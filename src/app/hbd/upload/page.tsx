import type { Metadata } from "next";

import { HbdUploadClient } from "@/components/hbd/HbdUploadClient";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "ส่งการ์ดอวยพร | Mild-R HBD 2026",
  description:
    "อัปโหลดการ์ดอวยพรวันเกิด Mild-R · 12.12.2026 — จากฮันนี่ถึง mutant สาวของเรา",
};

export default function HbdUploadPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d] text-[#f7d7de]">
        <HbdUploadClient />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
