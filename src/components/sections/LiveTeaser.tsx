"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { LiveWeekTable, LiveWeekTableSkeleton } from "@/components/events/LiveWeekTable";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import { surroundingWeeksRangeYmd } from "@/lib/events";
import { R_CTA_OUTLINE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { LiveWeek } from "@/types/vtuber";

export type InitialLiveSchedule = {
  from: string;
  to: string;
  weeks: LiveWeek[];
};

type LiveTeaserProps = {
  initialLiveSchedule?: InitialLiveSchedule | null;
  /** Kept for callers. Channel chips on the /live table come from each slot. */
  ownChannelLabel: string;
};

/** Home · ตารางไลฟ์: the /live week table, recolored to the homepage CI. */
export function LiveTeaser({ initialLiveSchedule }: LiveTeaserProps) {
  const initialFrom = initialLiveSchedule?.from;
  const initialTo = initialLiveSchedule?.to;
  const teaserRange = useMemo(
    () => (initialFrom && initialTo ? { from: initialFrom, to: initialTo } : surroundingWeeksRangeYmd()),
    [initialFrom, initialTo]
  );
  const { weeks: teaserWeeks, status, error, retry } = useLiveSchedule(teaserRange, {
    initialWeeks: initialLiveSchedule?.weeks ?? null,
  });

  const displayWeeks = useMemo(() => {
    if (teaserWeeks.length > 0) return teaserWeeks;
    return [{ id: `empty-${teaserRange.from}`, weekStart: teaserRange.from, slots: [] }];
  }, [teaserWeeks, teaserRange.from]);

  return (
    <Section id="live">
      <ScrollReveal>
        <SectionHeader eyebrow="Live" title="ตารางไลฟ์" />
      </ScrollReveal>

      <ScrollReveal delay={0.06} className="mt-6">
        {status === "loading" ? (
          <LiveWeekTableSkeleton />
        ) : status === "error" ? (
          <div role="alert" className="r-card rounded-3xl px-5 py-10 text-center sm:px-8">
            <p className="font-[family-name:var(--font-display)] text-lg text-r-text sm:text-xl">โหลดตารางไลฟ์ไม่สำเร็จ</p>
            {error ? <p className="mt-2 text-sm text-r-text-3">{error}</p> : null}
            <button type="button" onClick={retry} className={cn(R_CTA_OUTLINE_CLASS, "mt-5")}>
              ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <LiveWeekTable weeks={displayWeeks} weekRange={teaserRange} blankEmptyDays tone="aplus" />
        )}
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="mt-6">
        <Link href="/live" className={R_CTA_OUTLINE_CLASS}>
          ดูตารางไลฟ์ทั้งหมด
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </ScrollReveal>
    </Section>
  );
}
