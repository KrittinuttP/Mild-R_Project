import type { Metadata } from "next";
import { EventsPageClient } from "@/components/events/EventsPageClient";
import { BackLink } from "@/components/layout/BackLink";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { getEventsBoard, mildRData } from "@/data/vtuber-data";
import { R_EYEBROW_CLASS, R_H1_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events | Mild-R Fanclub",
  description: "อีเวนต์ของ Mild-R",
};

/** Re-derive upcoming / ongoing / ended from the Bangkok date. */
export const revalidate = 3600;

export default function EventsPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-r-bg">
        <section className="relative px-5 pb-24 pt-28 text-r-text sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(242,67,125,0.14),transparent_55%),radial-gradient(ellipse_at_0%_10%,rgba(34,214,191,0.08),transparent_50%)]" />

          <div className="relative mx-auto max-w-6xl">
            <BackLink href="/#events" className="mb-8">
              กลับหน้าแรก
            </BackLink>
            <p className={R_EYEBROW_CLASS}>Events</p>
            <h1 className={cn("mt-3 max-w-2xl", R_H1_CLASS)}>
              อีเวนต์
            </h1>

            <div className="mt-12 sm:mt-16">
              <EventsPageClient board={getEventsBoard()} />
            </div>
          </div>
        </section>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
