"use client";

import { LiveScheduleBoard } from "@/components/events/LiveScheduleBoard";

export function LiveSchedulePanel() {
  return (
    <div className="transition-opacity duration-500 ease-out">
      <LiveScheduleBoard />
    </div>
  );
}
