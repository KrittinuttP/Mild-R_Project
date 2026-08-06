import type { Metadata } from "next";

import { EventsPageClient } from "@/components/events/EventsPageClient";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Events | Mild-R Fanclub",
  description:
    "รายการอีเวนต์ของ Mild-R — กำลังมาและผ่านมาแล้ว",
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
            <p className="text-[0.7rem] tracking-[0.28em] text-[#f3b8c4]/75 uppercase sm:text-sm">
              Events
            </p>
            <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              อีเวนต์
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#f7d7de]/85 sm:text-base">
              รวมอีเวนต์พิเศษ คาเฟ่ คอลแลบ และกิจกรรมอื่นๆ ทั้งที่กำลังมาและผ่านมาแล้ว
              — แยกจากตารางไลฟ์รายสัปดาห์
            </p>

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
