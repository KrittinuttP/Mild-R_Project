"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { LiveWeek } from "@/types/vtuber";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

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
    <Section id="live">
      <ScrollReveal>
        <SectionHeader eyebrow="Live" title="ตารางไลฟ์" />
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
    </Section>
  );
}
