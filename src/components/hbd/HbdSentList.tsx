"use client";

import { useState } from "react";
import { ChevronDown, MailQuestion } from "lucide-react";

import { cn } from "@/lib/utils";

/** How many names show before "ดูอีก N คน". */
const FIRST_PAGE = 30;

export type HbdSentListRow = {
  /** Send order, oldest = 1. */
  number: number;
  name: string;
  /** "22 Nov" (Bangkok). */
  date: string;
};

/** /hbd/2026/sent · count + names, newest first. */
export function HbdSentList({ rows }: { rows: HbdSentListRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, FIRST_PAGE);
  const rest = rows.length - shown.length;

  if (rows.length === 0) {
    return (
      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 ring-inset">
        <MailQuestion className="mt-0.5 size-5 flex-none text-r-text-2" aria-hidden />
        <div>
          <p className="text-[15px] text-r-text">ยังไม่มีการ์ดส่งมา</p>
          <p className="mt-1 text-[13px] leading-relaxed text-r-text-2">เป็นคนแรกที่อวยพรมายด์เลยไหม</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="รายชื่อฮันนี่ที่ส่งการ์ดแล้ว" className="mt-8">
      <p className="flex items-baseline gap-1.5">
        <span className="text-[1.75rem] leading-none font-semibold text-[#ff6b9a] tabular-nums">
          {rows.length}
        </span>
        <span className="text-sm text-r-text-2">คน</span>
      </p>

      <ol className="mt-4 overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 ring-inset">
        {shown.map((row) => (
          <li
            key={row.number}
            className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 last:border-b-0"
          >
            <span className="flex min-w-0 items-baseline gap-3">
              <span className="w-7 flex-none text-right text-[13px] text-r-text-3 tabular-nums">{row.number}</span>
              <span className="min-w-0 truncate text-[15px] text-r-text">{row.name}</span>
            </span>
            <span className="flex-none text-[13px] text-r-text-3">{row.date}</span>
          </li>
        ))}
      </ol>

      {rest > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            "mx-auto mt-3 flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm text-r-text-2 transition-colors hover:text-r-text",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc"
          )}
        >
          ดูอีก {rest} คน
          <ChevronDown className="size-4" aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
