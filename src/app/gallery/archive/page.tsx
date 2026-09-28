import type { Metadata } from "next";
import { Images } from "lucide-react";

import { GallerySection } from "@/components/gallery/GallerySection";
import { GallerySubNav } from "@/components/gallery/GallerySubNav";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Visual Archive | Mild-R Fanclub",
  description: "คลังภาพ Archive ของ Mild-R",
};

export default function GalleryArchivePage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#12080c]">
        <GallerySubNav active="archive" />
        <GallerySection
          id="visual-archive"
          eyebrow="Archive"
          icon={Images}
          title="Visual archive"
          description="คลังภาพของ Mild-R"
          items={mildRData.gallery}
          variant="archive"
          mode="full"
          className="pt-10 sm:pt-12"
        />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
