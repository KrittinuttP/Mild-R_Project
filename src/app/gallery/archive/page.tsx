import type { Metadata } from "next";
import { Images } from "lucide-react";

import { GallerySection } from "@/components/gallery/GallerySection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Visual Archive | Mild-R Fanclub",
  description: "คลังภาพ Archive ของ Mild-R",
};

export default function GalleryArchivePage() {
  return (
    <GallerySection
      id="visual-archive"
      eyebrow="Archive"
      icon={Images}
      title="Visual archive"
      description="คลังภาพของ Mild-R"
      headingSize="h2"
      showTopFade={false}
      items={mildRData.gallery}
      variant="archive"
      mode="full"
      className="pt-8 sm:pt-10"
    />
  );
}
