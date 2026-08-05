import type { Metadata } from "next";
import Link from "next/link";

import { GallerySection } from "@/components/gallery/GallerySection";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { buttonVariants } from "@/components/ui/button";
import { mildRData } from "@/data/vtuber-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Fan Art | Mild-R Fanclub",
  description:
    "คลังแฟนอาร์ตของ Mild-R จากฮันนี่ — ดูผลงานพร้อมเครดิตศิลปิน",
};

export default function FanArtPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <GallerySection
          id="fan-art"
          eyebrow="Fan art"
          title="จากฮันนี่"
          description="คลังแฟนอาร์ตเต็ม — เครดิตศิลปินชัดเจน กดดูรูปใหญ่และโหลดเพิ่มได้"
          items={mildRData.fanArt}
          variant="fan-art"
          mode="full"
          backHref="/#fan-art"
          backLabel="กลับตัวอย่างบนหน้าแรก"
          className="pt-28 sm:pt-32"
        />
        <div className="flex justify-center pb-20">
          <Link
            href="/gallery"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "text-[#f3b8c4]/80 hover:text-[#fff5f7]"
            )}
          >
            ← ไปคลัง Archive
          </Link>
        </div>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
