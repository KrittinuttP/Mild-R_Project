import { Images, Palette } from "lucide-react";

import { GallerySection } from "@/components/gallery/GallerySection";
import { LiveCoverArchive } from "@/components/gallery/LiveCoverArchive";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

/** Darker than the Live section above so the Archive group reads as its own block. */
const ARCHIVE_BG_CLASS = "bg-[#0c0508]";

type GalleryProps = {
  data: VtuberProfile;
};

/** Home preview: Archive (Visual archive + Live covers), then Fan art. */
export function Gallery({ data }: GalleryProps) {
  return (
    <>
      <GallerySection
        id="gallery"
        eyebrow="Archive"
        icon={Images}
        title="Visual archive"
        description="คลังภาพของ Mild-R"
        items={data.gallery}
        variant="archive"
        mode="preview"
        viewAllHref="/gallery/archive"
        showTopFade={false}
        className={cn(ARCHIVE_BG_CLASS, "border-t border-[#f3b8c4]/10")}
      />
      <LiveCoverArchive
        mode="preview"
        viewAllHref="/gallery/live"
        className={ARCHIVE_BG_CLASS}
      />
      <GallerySection
        id="fan-art"
        eyebrow="Gallery"
        icon={Palette}
        title="Fan art"
        description="แฟนอาร์ต Mild-R จากฮันนี่"
        items={data.fanArt}
        variant="fan-art"
        mode="preview"
        viewAllHref="/gallery/fanart"
      />
    </>
  );
}
