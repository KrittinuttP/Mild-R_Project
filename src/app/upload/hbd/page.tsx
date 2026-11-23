import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ListChecks } from "lucide-react";

import { GATE_SPARKLES, Sparkles } from "@/components/hbd/HbdScroll";
import { HbdStandaloneBar } from "@/components/hbd/HbdStandaloneBar";
import { mildRData } from "@/data/vtuber-data";
import { loadHbdSentNames } from "@/lib/hbd-submissions-store";
import { heroNameFont } from "@/lib/hero-fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "การ์ดอวยพรวันเกิด | Mild-R HBD 2026",
  description:
    "ส่งการ์ดอวยพรวันเกิด Mild-R · 12 Dec 2026 หรือเช็กรายชื่อฮันนี่ที่ส่งการ์ดแล้ว",
};

/** The count changes as cards arrive; sending or an admin change refreshes it at once. */
export const revalidate = 60;

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-r-pri";

/**
 * Standalone entry (the link shared with fans): same gate look as /hbd/2026
 * with two ways on, send a card or check the list. No link to the main site.
 */
export default async function StandaloneHbdChooserPage() {
  const sent = (await loadHbdSentNames()).length;
  const { hbd } = mildRData;

  return (
    <>
      <HbdStandaloneBar />
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center text-r-text sm:min-h-[calc(100dvh-4rem)] sm:px-10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_42%,rgba(242,67,125,0.24),transparent_70%)]"
          aria-hidden
        />
        <Sparkles items={GATE_SPARKLES} />

        <div className="relative flex flex-col items-center">
          <p className="inline-flex h-[26px] items-center rounded-full bg-r-pri/14 px-3 text-[0.7rem] tracking-[0.2em] text-r-text-2 uppercase">
            {hbd.occasionLabel ?? "Birthday"}
            {hbd.year ? ` · ${hbd.year}` : null}
          </p>
          <h1
            className={cn(
              heroNameFont.variable,
              "mt-4 font-r-name text-[3rem] leading-[1.05] font-extrabold sm:mt-5 sm:text-[4.25rem] md:text-[5rem]"
            )}
          >
            {hbd.title}
          </h1>
          {hbd.titleLocal ? (
            <p className="mt-3 text-xl text-r-text-2 sm:text-2xl">{hbd.titleLocal}</p>
          ) : null}

          <p className="mt-10 text-[0.9375rem] text-[#f7d7de] sm:text-base">
            {sent > 0 ? (
              <>
                ฮันนี่ส่งการ์ดมาแล้ว{" "}
                <span className="font-semibold text-[#ff6b9a] tabular-nums">{sent}</span> คน
              </>
            ) : (
              "ยังไม่มีการ์ดอวยพร · มาเป็นคนแรกที่ส่งการ์ดกัน"
            )}
          </p>
          <div className="mt-6">
            <Link href="/upload/hbd/send" prefetch={false} className={cn("hbd-start", FOCUS)}>
              <span className="hbd-start__shine" aria-hidden />
              <Heart className="hbd-beat size-[18px] fill-current" aria-hidden />
              ส่งการ์ดอวยพร
            </Link>
          </div>
          {sent > 0 ? (
            <Link
              href="/upload/hbd/sent"
              prefetch={false}
              className={cn(
                "mt-5 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm text-r-text-2 ring-1 ring-r-text-2/35 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
                FOCUS
              )}
            >
              <ListChecks className="size-4" aria-hidden />
              ฮันนี่ที่ส่งการ์ดแล้ว
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}
