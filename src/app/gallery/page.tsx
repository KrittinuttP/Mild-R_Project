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
  title: "Gallery Archive | Mild-R Fanclub",
  description: "คลังภาพ Archive เต็มของ Mild-R — เลื่อนดูและเปิดรูปใหญ่ได้",
};

export default function GalleryArchivePage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <GallerySection
          id="gallery"
          eyebrow="Archive"
          title="Visual archive"
          description="คลังภาพเต็ม — กดดูรูปใหญ่ โหลดเพิ่มได้เรื่อยๆ"
          items={mildRData.gallery}
          variant="archive"
          mode="full"
          backHref="/#gallery"
          backLabel="กลับตัวอย่างบนหน้าแรก"
          className="pt-28 sm:pt-32"
        />
        <div className="flex justify-center pb-20">
          <Link
            href="/fan-art"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "text-[#f3b8c4]/80 hover:text-[#fff5f7]"
            )}
          >
            ไปคลัง Fan art →
          </Link>
        </div>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
