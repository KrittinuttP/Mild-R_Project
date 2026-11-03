import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LiveSchedulePanel } from "@/components/events/LiveSchedulePanel";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { R_EYEBROW_CLASS } from "@/lib/site-ui";

export const metadata: Metadata = {
  title: "Live Schedule | Mild-R Fanclub",
  description: "ตารางไลฟ์ Mild-R",
};

/** Live data loads client-side via /api/live/schedule (CDN-cached ~1 min). */
export const dynamic = "force-dynamic";

export default function LivePage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-r-bg">
        <section className="relative px-5 pb-24 pt-28 text-r-text sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(242,67,125,0.14),transparent_55%),radial-gradient(ellipse_at_0%_10%,rgba(34,214,191,0.08),transparent_50%)]" />

          <div className="relative mx-auto max-w-6xl">
            <Link
              href="/#live"
              className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-r-text-2 ring-1 ring-r-text-2/30 ring-inset transition-colors hover:bg-r-pri/10 hover:text-r-text hover:ring-r-pri/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              กลับหน้าแรก
            </Link>
            <p className={R_EYEBROW_CLASS}>Live</p>
            <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[2.25rem] leading-tight font-normal text-r-text sm:text-5xl">
              ตารางไลฟ์
            </h1>

            <div className="mt-12 sm:mt-16">
              <LiveSchedulePanel />
            </div>

            <div className="mt-12 flex justify-end sm:mt-16">
              <Link
                href="/live/ops/trends"
                className="text-[0.6rem] tracking-[0.28em] text-r-text-2/25 uppercase transition hover:text-r-text-2/50"
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
