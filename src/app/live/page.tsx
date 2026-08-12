import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LiveScheduleBoard } from "@/components/events/LiveScheduleBoard";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import {
  loadLiveStreams,
  mergeLiveWeeksWithStreams,
} from "@/lib/live-streams";

export const metadata: Metadata = {
  title: "Live Schedule | Mild-R Fanclub",
  description:
    "ตารางไลฟ์ Mild-R — สัปดาห์นี้และปฏิทินรายเดือน รวมคลิปจาก YouTube",
};

export const revalidate = 300; // soft nav / ISR · F5 → client refetch /api/live/schedule

export default async function LivePage() {
  const streams = await loadLiveStreams();
  const weeks = mergeLiveWeeksWithStreams([], streams);

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_75%_0%,rgba(232,90,122,0.16),transparent_55%)]" />

          <div className="relative mx-auto max-w-6xl">
            <p className="text-[0.7rem] tracking-[0.28em] text-[#f3b8c4]/75 uppercase sm:text-sm">
              Live
            </p>
            <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              ตารางไลฟ์
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#f7d7de]/85 sm:text-base">
              ข้อมูลจาก YouTube ผ่าน Supabase — สัปดาห์ปัจจุบันด้านบน ·
              ปฏิทินรายเดือนด้านล่าง · ช่องอื่นจะระบุชื่อช่อง
            </p>

            <div className="mt-12 sm:mt-16">
              {weeks.length > 0 ? (
                <LiveScheduleBoard weeks={weeks} />
              ) : (
                <div className="border border-dashed border-[#f3b8c4]/20 bg-[#1a0d12]/35 px-5 py-10 text-sm text-[#f3b8c4]/70">
                  ยังไม่มีข้อมูลไลฟ์จากฐานข้อมูล
                </div>
              )}
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 sm:mt-16">
              <Link
                href="/#live"
                className="inline-flex items-center gap-2 text-sm text-[#f3b8c4]/75 transition hover:text-[#fff5f7]"
              >
                <ArrowLeft className="size-4" />
                กลับหน้าแรก
              </Link>
              <Link
                href="/live/ops/trends"
                className="text-[0.6rem] tracking-[0.28em] text-[#f3b8c4]/20 uppercase transition hover:text-[#f3b8c4]/45"
                aria-label="Internal view trends"
              >
                trends
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
