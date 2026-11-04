import type { Metadata } from "next";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { BackLink } from "@/components/layout/BackLink";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaArchive } from "@/components/media/MediaArchive";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { R_BODY_CLASS, R_EYEBROW_CLASS, R_H1_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import { loadVideos } from "@/lib/videos";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Media | Mild-R Fanclub",
  description: "รวมคลิป Mild-R ทั้งวิดีโอ Shorts และ Premiere",
};

export default async function MediaPage() {
  const videos = await loadVideos({ includeMembers: true });

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-r-bg">
        <section className="relative px-5 pb-24 pt-28 text-r-text sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(242,67,125,0.14),transparent_55%),radial-gradient(ellipse_at_0%_10%,rgba(34,214,191,0.08),transparent_50%)]" />

          <div className="relative mx-auto max-w-6xl">
            <BackLink href="/#media" className="mb-8">
              กลับหน้าแรก
            </BackLink>
            <ScrollReveal>
              <p className={R_EYEBROW_CLASS}>Media</p>
              <h1 className={cn("mt-3", R_H1_CLASS)}>รับชมคลิป</h1>
              <p className={cn("mt-4 max-w-xl", R_BODY_CLASS)}>รวมคลิป Mild-R</p>
            </ScrollReveal>
            <MediaArchive videos={videos} />
          </div>
        </section>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
