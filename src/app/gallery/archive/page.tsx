import type { Metadata } from "next";

import { GallerySection } from "@/components/gallery/GallerySection";
import { mildRData } from "@/data/vtuber-data";
import { loadMomentPhotoItems } from "@/lib/moment-photos";
import { loadXGalleryItems } from "@/lib/x-gallery";

export const metadata: Metadata = {
  title: "Moments | Mild-R Fanclub",
  description: "ช่วงเวลาของ Mild-R รวมภาพบรรยากาศและภาพประจำตัว",
};

/**
 * Photos from Mild-R's X posts and admin uploads join the board; re-read at most
 * once an hour (an upload or hide in the admin refreshes the page at once).
 */
export const revalidate = 3600;

export default async function GalleryArchivePage() {
  // GalleryBoard sorts them: dated photos (X + uploads) newest first, gallery.json last.
  const [xItems, uploadItems] = await Promise.all([loadXGalleryItems(), loadMomentPhotoItems()]);
  const items = [...mildRData.gallery, ...uploadItems, ...xItems];

  return (
    <GallerySection
      id="visual-archive"
      eyebrow="Moments"
      title="ช่วงเวลาของ Mild-R"
      description="คลังภาพของ Mild-R"
      headingSize="h2"
      showTopFade={false}
      items={items}
      variant="archive"
      mode="full"
      className="pt-8 sm:pt-10"
    />
  );
}
