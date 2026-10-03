import type { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { GalleryCategoryTabs } from "@/components/gallery/GalleryCategoryTabs";
import { BackLink } from "@/components/layout/BackLink";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { DISPLAY_H1_CLASS, META_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

/** Shared hub for /gallery/{archive,live,fanart}: hero + category tabs stay mounted across tabs. */
export default function GalleryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#12080c]">
        <div className="bg-[#12080c] px-5 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <BackLink href="/#gallery" className="mb-8">
              กลับหน้าแรก
            </BackLink>
            <ScrollReveal>
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-4 text-[#e85a7a]" aria-hidden />
                <p className={META_CLASS}>Gallery</p>
              </div>
              <h1 className={cn("mt-3", DISPLAY_H1_CLASS)}>แกลเลอรี</h1>
            </ScrollReveal>
            <GalleryCategoryTabs />
          </div>
        </div>
        {children}
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
