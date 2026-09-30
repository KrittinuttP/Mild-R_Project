import type { Metadata } from "next";

import { LiveCoverArchive } from "@/components/gallery/LiveCoverArchive";

export const metadata: Metadata = {
  title: "Live Covers | Mild-R Fanclub",
  description: "รวมปกไลฟ์ Mild-R",
};

export default function GalleryLivePage() {
  return <LiveCoverArchive showDivider={false} className="pt-8 sm:pt-10" />;
}
