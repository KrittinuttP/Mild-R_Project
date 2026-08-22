"use client";

import { LiveScheduleBoard } from "@/components/events/LiveScheduleBoard";
import {
  LiveScheduleError,
  LiveScheduleSkeleton,
} from "@/components/events/LiveScheduleSkeleton";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import { cn } from "@/lib/utils";

export function LiveSchedulePanel() {
  const { weeks, status, error, retry } = useLiveSchedule();

  if (status === "loading") {
    return <LiveScheduleSkeleton variant="full" />;
  }

  if (status === "error") {
    return <LiveScheduleError message={error} onRetry={retry} />;
  }

  if (weeks.length === 0) {
    return (
      <div className="border border-dashed border-[#f3b8c4]/20 bg-[#1a0d12]/35 px-5 py-10 text-sm text-[#f3b8c4]/70">
        ยังไม่มีข้อมูลไลฟ์จากฐานข้อมูล
      </div>
    );
  }

  return (
    <div className={cn("transition-opacity duration-500 ease-out")}>
      <LiveScheduleBoard weeks={weeks} />
    </div>
  );
}
