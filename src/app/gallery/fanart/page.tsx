import type { Metadata } from "next";
import { Palette } from "lucide-react";

import { GallerySection } from "@/components/gallery/GallerySection";
import { GallerySubNav } from "@/components/gallery/GallerySubNav";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Fan Art | Mild-R Fanclub",
  description: "คลังแฟนอาร์ตของ Mild-R จากฮันนี่",
};

export default function GalleryFanArtPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#10070b]">
        <GallerySubNav active="fanart" className="bg-[#10070b]" />
        <GallerySection
          id="fan-art"
          eyebrow="Gallery"
          icon={Palette}
          title="Fan art"
          description="แฟนอาร์ต Mild-R จากฮันนี่"
          items={mildRData.fanArt}
          variant="fan-art"
          mode="full"
          className="pt-10 sm:pt-12"
        />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
