import type { Metadata } from "next";
import { Palette } from "lucide-react";

import { GallerySection } from "@/components/gallery/GallerySection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Fan Art | Mild-R Fanclub",
  description: "คลังแฟนอาร์ตของ Mild-R จากฮันนี่",
};

export default function GalleryFanArtPage() {
  return (
    <GallerySection
      id="fan-art"
      eyebrow="Gallery"
      icon={Palette}
      title="Fan art"
      description="แฟนอาร์ต Mild-R จากฮันนี่"
      headingSize="h2"
      showTopFade={false}
      items={mildRData.fanArt}
      variant="fan-art"
      mode="full"
      className="bg-[#12080c] pt-8 sm:pt-10"
    />
  );
}
