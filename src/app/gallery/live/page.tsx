import type { Metadata } from "next";

import { GallerySubNav } from "@/components/gallery/GallerySubNav";
import { LiveCoverArchive } from "@/components/gallery/LiveCoverArchive";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Live Covers | Mild-R Fanclub",
  description: "รวมปกไลฟ์ Mild-R",
};

export default function GalleryLivePage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#12080c]">
        <GallerySubNav active="live" />
        <LiveCoverArchive
          headingSize="h1"
          showDivider={false}
          className="pt-10 sm:pt-12"
        />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
