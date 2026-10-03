import type { Metadata } from "next";
import { Images } from "lucide-react";

import { GallerySection } from "@/components/gallery/GallerySection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Moments | Mild-R Fanclub",
  description: "ช่วงเวลาของ Mild-R รวมภาพบรรยากาศและภาพประจำตัว",
};

export default function GalleryArchivePage() {
  return (
    <GallerySection
      id="visual-archive"
      eyebrow="Moments"
      icon={Images}
      title="ช่วงเวลาของ Mild-R"
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
