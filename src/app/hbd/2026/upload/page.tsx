import type { Metadata } from "next";

import { HbdUploadClient } from "@/components/hbd/HbdUploadClient";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { loadHbdSentNames } from "@/lib/hbd-submissions-store";

export const metadata: Metadata = {
  title: "ส่งการ์ดอวยพร | Mild-R HBD 2026",
  description:
    "อัปโหลดการ์ดอวยพรวันเกิด Mild-R · 12 Dec 2026 — จากฮันนี่ถึง mutant สาวของเรา",
};

/** The sent count on the list button; a send or an admin change refreshes it at once. */
export const revalidate = 60;

export default async function Hbd2026UploadPage() {
  const sentCount = (await loadHbdSentNames()).length;
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d] text-[#f7d7de]">
        <HbdUploadClient sentCount={sentCount} />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
