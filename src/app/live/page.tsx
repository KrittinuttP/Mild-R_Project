import type { Metadata } from "next";
import Link from "next/link";

import { LiveSchedulePanel } from "@/components/events/LiveSchedulePanel";
import { BackLink } from "@/components/layout/BackLink";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { META_CLASS, DISPLAY_H1_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Live Schedule | Mild-R Fanclub",
  description: "ตารางไลฟ์ Mild-R",
};

/** Live data loads client-side via /api/live/schedule (always fresh). */
export const dynamic = "force-dynamic";

export default function LivePage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_75%_0%,rgba(232,90,122,0.16),transparent_55%)]" />

          <div className="relative mx-auto max-w-6xl">
            <BackLink href="/#live" className="mb-8">
              กลับหน้าแรก
            </BackLink>
            <p className={META_CLASS}>Live</p>
            <h1 className={cn("mt-4 max-w-2xl", DISPLAY_H1_CLASS)}>
              ตารางไลฟ์
            </h1>

            <div className="mt-12 sm:mt-16">
              <LiveSchedulePanel />
            </div>

            <div className="mt-12 flex justify-end sm:mt-16">
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
