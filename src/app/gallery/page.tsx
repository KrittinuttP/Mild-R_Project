import type { Metadata } from "next";

import { parseGalleryCategory } from "@/components/gallery/gallery-categories";
import { GalleryTabs } from "@/components/gallery/GalleryTabs";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Gallery | Mild-R Fanclub",
  description: "คลังภาพ ปกไลฟ์ และแฟนอาร์ตของ Mild-R",
};

type GalleryPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { tab } = await searchParams;
  const initialTab = parseGalleryCategory(Array.isArray(tab) ? tab[0] : tab);

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#12080c]">
        <GalleryTabs
          initialTab={initialTab}
          gallery={mildRData.gallery}
          fanArt={mildRData.fanArt}
        />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
