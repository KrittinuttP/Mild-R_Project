import type { Metadata } from "next";

import { EventsPageClient } from "@/components/events/EventsPageClient";
import { BackLink } from "@/components/layout/BackLink";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { DISPLAY_H1_CLASS, META_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events | Mild-R Fanclub",
  description: "อีเวนต์ของ Mild-R",
};

export default function EventsPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.18),transparent_55%)]" />

          <div className="relative mx-auto max-w-6xl">
            <BackLink href="/#events" className="mb-8">
              กลับหน้าแรก
            </BackLink>
            <p className={META_CLASS}>Events</p>
            <h1 className={cn("mt-4 max-w-2xl", DISPLAY_H1_CLASS)}>
              อีเวนต์
            </h1>

            <div className="mt-12 sm:mt-16">
              <EventsPageClient board={mildRData.events} />
            </div>
          </div>
        </section>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
