import { Images, Palette } from "lucide-react";

import { FanArtEmpty } from "@/components/gallery/FanArtEmpty";
import { GallerySection } from "@/components/gallery/GallerySection";
import { LiveCoverArchive } from "@/components/gallery/LiveCoverArchive";
import type { FanArtItem, VtuberProfile } from "@/types/vtuber";
import { SectionGlow } from "@/components/common/SectionGlow";

type GalleryProps = {
  data: VtuberProfile;
  /** Approved fan art from the upload form (lib/fanart-submissions-store). */
  fanArt: FanArtItem[];
};

/** Home preview: Moments + Live covers, then Fan art. */
export function Gallery({ data, fanArt }: GalleryProps) {
  return (
    <div className="relative">
      <SectionGlow />
      <div aria-hidden className="r-hairline absolute inset-x-0 top-0" />
      <GallerySection
        id="gallery"
        eyebrow="Moments"
        icon={Images}
        title="ช่วงเวลาของ Mild-R"
        description="คลังภาพของ Mild-R"
        items={data.gallery}
        variant="archive"
        mode="preview"
        viewAllHref="/gallery/archive"
        showTopFade={false}
        className="bg-transparent"
      />
      <LiveCoverArchive
        mode="preview"
        viewAllHref="/gallery/live"
        className="bg-transparent"
      />
      <GallerySection
        id="fan-art"
        eyebrow="Fan art"
        icon={Palette}
        title="แฟนอาร์ต"
        description="แฟนอาร์ต Mild-R จากฮันนี่"
        items={fanArt}
        variant="fan-art"
        mode="preview"
        viewAllHref="/gallery/fanart"
        empty={<FanArtEmpty />}
        showTopFade={false}
        className="bg-transparent"
      />
    </div>
  );
}
