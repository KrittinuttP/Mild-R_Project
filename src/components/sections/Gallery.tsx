import { GallerySection } from "@/components/gallery/GallerySection";
import type { VtuberProfile } from "@/types/vtuber";

type GalleryProps = {
  data: VtuberProfile;
};

/** Home preview: Archive then Fan art, each with View all. */
export function Gallery({ data }: GalleryProps) {
  return (
    <>
      <GallerySection
        id="gallery"
        eyebrow="Archive"
        title="Visual archive"
        description="คลังภาพหลักของ Mild-R — ดูตัวอย่างด้านล่าง หรือเปิดคลังเต็มเพื่อเลื่อนต่อได้เรื่อยๆ"
        items={data.gallery}
        variant="archive"
        mode="preview"
        viewAllHref="/gallery"
      />
      <GallerySection
        id="fan-art"
        eyebrow="Fan art"
        title="จากฮันนี่"
        description="ผลงานแฟนอาร์ตและคอมมูนิตี้ — เครดิตศิลปินชัดเจน กด View all เพื่อดูคลังเต็ม"
        items={data.fanArt}
        variant="fan-art"
        mode="preview"
        viewAllHref="/fan-art"
      />
    </>
  );
}
