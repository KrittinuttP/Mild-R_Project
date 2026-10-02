"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import {
  LiveScheduleError,
  LiveScheduleSkeleton,
} from "@/components/events/LiveScheduleSkeleton";
import { LiveWeekTable } from "@/components/events/LiveWeekTable";
import { buttonVariants } from "@/components/ui/button";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import { surroundingWeeksRangeYmd } from "@/lib/events";
import {
  CTA_OUTLINE_CLASS,
  DISPLAY_H2_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { LiveWeek } from "@/types/vtuber";

export type InitialLiveSchedule = {
  from: string;
  to: string;
  weeks: LiveWeek[];
};

type LiveTeaserProps = {
  initialLiveSchedule?: InitialLiveSchedule | null;
};

export function LiveTeaser({ initialLiveSchedule }: LiveTeaserProps) {
  const initialFrom = initialLiveSchedule?.from;
  const initialTo = initialLiveSchedule?.to;
  const teaserRange = useMemo(
    () =>
      initialFrom && initialTo
        ? { from: initialFrom, to: initialTo }
        : surroundingWeeksRangeYmd(),
    [initialFrom, initialTo]
  );
  const { weeks: teaserWeeks, status, error, retry } = useLiveSchedule(
    teaserRange,
    { initialWeeks: initialLiveSchedule?.weeks ?? null }
  );

  const displayWeeks = useMemo(() => {
    if (teaserWeeks.length > 0) return teaserWeeks;
    return [
      {
        id: `empty-${teaserRange.from}`,
        weekStart: teaserRange.from,
        slots: [],
      },
    ];
  }, [teaserWeeks, teaserRange.from]);

  return (
    <section
      id="live"
      className="relative scroll-mt-20 bg-[#140a0d] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_80%_0%,rgba(232,90,122,0.12),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-[#e85a7a]" aria-hidden />
            <p className={META_CLASS}>Live</p>
          </div>
          <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
            ตารางไลฟ์
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.06} className="mt-8 sm:mt-10">
          {status === "loading" ? (
            <LiveScheduleSkeleton variant="compact" />
          ) : status === "error" ? (
            <LiveScheduleError message={error} onRetry={retry} />
          ) : (
            <div className="transition-opacity duration-500 ease-out">
              <LiveWeekTable weeks={displayWeeks} compact blankEmptyDays weekRange={teaserRange} />
            </div>
          )}
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="mt-8 sm:mt-10">
          <Link
            href="/live"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              CTA_OUTLINE_CLASS
            )}
          >
            ดูตารางไลฟ์ทั้งหมด
            <ArrowUpRight className="size-4" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
