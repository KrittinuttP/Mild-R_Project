"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { CollabBadge } from "@/components/events/CollabBadge";
import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import { LiveWeekTable } from "@/components/events/LiveWeekTable";
import { buttonVariants } from "@/components/ui/button";
import {
  availableLiveYears,
  findDefaultWeekIndex,
  flattenLiveSlots,
  formatISODate,
  formatThaiDate,
  isInCurrentWeek,
  isSameMonth,
  monthGridDates,
  parseISODate,
  slotsByDateMap,
  sortLiveWeeks,
  startOfWeekMonday,
  thaiMonthName,
  thaiWeekdayShort,
} from "@/lib/events";
import { cn } from "@/lib/utils";
import type { LiveSlot, LiveWeek } from "@/types/vtuber";

type LiveScheduleBoardProps = {
  weeks: LiveWeek[];
};

function SlotListItem({
  slot,
  onOpen,
}: {
  slot: LiveSlot;
  onOpen: () => void;
}) {
  const collab = slot.kind === "collab";

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-start gap-3 border bg-[#1a0d12]/50 px-3 py-3 text-left transition",
          collab
            ? "border-[#d4a574]/30 hover:border-[#d4a574]/50 hover:bg-[#d4a574]/10"
            : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/35 hover:bg-[#e85a7a]/10"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-xs tabular-nums",
                collab ? "text-[#e8c49a]" : "text-[#e85a7a]"
              )}
            >
              {slot.time}
            </span>
            {collab ? <CollabBadge /> : null}
          </div>
          <p className="mt-0.5 text-sm font-medium text-[#fff5f7]">
            {slot.titleLocal ?? slot.title}
          </p>
          {slot.note ? (
            <p className="mt-1 text-xs text-[#f3b8c4]/50">{slot.note}</p>
          ) : null}
        </div>
        {slot.url ? (
          <ExternalLink className="size-3.5 shrink-0 opacity-40" />
        ) : null}
      </button>
    </li>
  );
}

export function LiveScheduleBoard({ weeks }: LiveScheduleBoardProps) {
  const sortedWeeks = useMemo(() => sortLiveWeeks(weeks), [weeks]);
  const allSlots = useMemo(() => flattenLiveSlots(weeks), [weeks]);
  const byDate = useMemo(() => slotsByDateMap(allSlots), [allSlots]);

  const today = useMemo(() => new Date(), []);
  const todayIso = formatISODate(today);
  const thisWeekMondayIso = formatISODate(startOfWeekMonday(today));
  const years = useMemo(
    () => availableLiveYears(allSlots, today.getFullYear()),
    [allSlots, today]
  );

  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso);
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);

  const thisWeekIndex = findDefaultWeekIndex(sortedWeeks, today);
  const thisWeek = sortedWeeks[thisWeekIndex];
  const thisWeekOnly = thisWeek ? [thisWeek] : [];

  const grid = useMemo(
    () => monthGridDates(year, month),
    [year, month]
  );

  const selectedSlots = selectedDate
    ? (byDate.get(selectedDate) ?? []).slice().sort((a, b) =>
        a.time.localeCompare(b.time)
      )
    : [];

  const goPrevMonth = () => {
    if (month === 0) {
      const nextYear = year - 1;
      if (years.length && nextYear < years[0]) return;
      setYear(nextYear);
      setMonth(11);
      return;
    }
    setMonth(month - 1);
  };

  const goNextMonth = () => {
    if (month === 11) {
      const nextYear = year + 1;
      if (years.length && nextYear > years[years.length - 1]) return;
      setYear(nextYear);
      setMonth(0);
      return;
    }
    setMonth(month + 1);
  };

  const selectDay = (iso: string) => {
    const date = parseISODate(iso);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setSelectedDate(iso);
  };

  const jumpToThisWeek = () => {
    selectDay(todayIso);
  };

  const weekdayHeaders = useMemo(() => {
    const monday = startOfWeekMonday(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return thaiWeekdayShort(d);
    });
  }, [today]);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ── This week ── */}
      <section className="relative overflow-hidden border border-[#e85a7a]/25 bg-gradient-to-br from-[#1c0d12] via-[#140a0d] to-[#12080c]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e85a7a]/70 to-transparent" />
        <div className="pointer-events-none absolute -top-16 right-0 size-48 bg-[radial-gradient(circle,rgba(232,90,122,0.18),transparent_65%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-full w-1 bg-gradient-to-b from-[#e85a7a] via-[#e85a7a]/50 to-transparent" />

        <div className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 border border-[#e85a7a]/45 bg-[#e85a7a]/15 px-2.5 py-1 text-[0.58rem] tracking-[0.18em] text-[#e85a7a] uppercase">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#e85a7a]" />
                  สัปดาห์ปัจจุบัน
                </span>
                <p className="text-[0.65rem] tracking-[0.22em] text-[#f3b8c4]/60 uppercase">
                  This week
                </p>
              </div>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
                ไลฟ์สัปดาห์นี้
              </h2>
              <p className="mt-2 max-w-md text-sm text-[#f7d7de]/70">
                ตารางไลฟ์ของสัปดาห์ที่กำลังดำเนินอยู่
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#f3b8c4]/55">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#e85a7a]" />
                <span className="text-[#e85a7a]/90">Solo</span>
              </span>
              <CollabBadge />
            </div>
          </div>

          <div className="mt-8 sm:mt-10">
            {thisWeekOnly.length > 0 ? (
              <LiveWeekTable weeks={thisWeekOnly} />
            ) : (
              <p className="text-sm text-[#f3b8c4]/65">
                ยังไม่มีตารางสำหรับสัปดาห์นี้
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Month calendar ── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.7rem] tracking-[0.28em] text-[#f3b8c4]/75 uppercase sm:text-sm">
              Calendar
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
              ปฏิทินรายเดือน
            </h2>
            <p className="mt-2 max-w-md text-sm text-[#f7d7de]/75">
              เลือกปีและเดือนเพื่อย้อนดูตาราง · ไฮไลต์วันนี้และสัปดาห์ปัจจุบัน
            </p>
          </div>
          <button
            type="button"
            onClick={jumpToThisWeek}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-none border-[#e85a7a]/35 bg-transparent text-[#e85a7a] hover:bg-[#e85a7a]/10"
            )}
          >
            ไปสัปดาห์นี้
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-[#f3b8c4]/12 bg-[#1a0d12]/40 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="เดือนก่อน"
              onClick={goPrevMonth}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-9 rounded-none text-[#fff5f7]"
              )}
            >
              <ChevronLeft className="size-4" />
            </button>

            <label className="flex items-center gap-2 text-xs tracking-[0.14em] text-[#f3b8c4]/65 uppercase">
              <span className="sr-only sm:not-sr-only">เดือน</span>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="min-w-[7.5rem] rounded-lg border border-[#f3b8c4]/25 bg-[#140a0d] px-2 py-1.5 font-[family-name:var(--font-display)] text-sm tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/50 sm:min-w-[8.5rem] sm:text-base"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index} value={index}>
                    {thaiMonthName(index)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs tracking-[0.14em] text-[#f3b8c4]/65 uppercase">
              <span className="sr-only sm:not-sr-only">ปี</span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="min-w-[6.5rem] rounded-lg border border-[#f3b8c4]/25 bg-[#140a0d] px-2 py-1.5 font-[family-name:var(--font-display)] text-sm tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/50 sm:text-base"
              >
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              aria-label="เดือนถัดไป"
              onClick={goNextMonth}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-9 rounded-none text-[#fff5f7]"
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <p className="hidden text-sm text-[#f3b8c4]/55 md:block">
            {thaiMonthName(month)} {year}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px border border-[#f3b8c4]/12 bg-[#f3b8c4]/12">
          {weekdayHeaders.map((label) => (
            <div
              key={label}
              className="bg-[#140a0d] px-1 py-2 text-center text-[0.62rem] tracking-[0.16em] text-[#f3b8c4]/55 uppercase"
            >
              {label}
            </div>
          ))}

          {grid.map((iso) => {
            const inMonth = isSameMonth(iso, year, month);
            const daySlots = (byDate.get(iso) ?? [])
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time));
            const isToday = iso === todayIso;
            const inWeek = isInCurrentWeek(iso, today);
            const weekRowStart = iso === thisWeekMondayIso;
            const selected = selectedDate === iso;
            const dayNum = parseISODate(iso).getDate();
            const visibleSlots = daySlots.slice(0, 2);
            const extraCount = Math.max(0, daySlots.length - visibleSlots.length);

            return (
              <div
                key={iso}
                role="button"
                tabIndex={0}
                onClick={() => selectDay(iso)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectDay(iso);
                  }
                }}
                className={cn(
                  "relative flex min-h-[5.5rem] cursor-pointer flex-col items-stretch gap-1 bg-[#140a0d] p-1 text-left transition sm:min-h-[7.5rem] sm:gap-1.5 sm:p-1.5 md:min-h-[8.5rem] md:p-2",
                  !inMonth && "bg-[#10070b]/80 opacity-50",
                  inWeek && "border-y border-[#e85a7a]/30",
                  weekRowStart &&
                    "before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-[3px] before:bg-[#e85a7a] before:content-['']",
                  selected && "z-[1] ring-2 ring-inset ring-[#e85a7a]/70",
                  isToday && !selected && "bg-[#e85a7a]/10",
                  "hover:bg-[#e85a7a]/08"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center self-start text-[0.7rem] tabular-nums sm:size-6 sm:text-xs",
                    isToday
                      ? "rounded-md bg-[#e85a7a] font-semibold text-white"
                      : "text-[#f7d7de]/85"
                  )}
                >
                  {dayNum}
                </span>

                {daySlots.length > 0 ? (
                  <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5 sm:gap-1">
                    {visibleSlots.map((slot) => {
                      const collab = slot.kind === "collab";
                      const label = slot.titleLocal ?? slot.title;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectDay(iso);
                            setActiveSlot(slot);
                          }}
                          className={cn(
                            "block w-full truncate border-l-2 pl-1 text-left leading-tight transition hover:bg-white/5",
                            collab
                              ? "border-[#d4a574] text-[#fff5f7]"
                              : "border-[#e85a7a]/55 text-[#f7d7de]/90"
                          )}
                          title={`${slot.time} · ${label}`}
                        >
                          <span className="flex flex-wrap items-center gap-1">
                            <span
                              className={cn(
                                "text-[0.55rem] tabular-nums sm:text-[0.62rem]",
                                collab ? "text-[#e8c49a]" : "text-[#e85a7a]"
                              )}
                            >
                              {slot.time}
                            </span>
                            {collab ? (
                              <CollabBadge className="hidden px-1 py-px text-[0.45rem] leading-none sm:inline-flex" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.58rem] sm:text-[0.68rem]">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                    {extraCount > 0 ? (
                      <span className="pl-1 text-[0.55rem] text-[#f3b8c4]/55 sm:text-[0.62rem]">
                        +{extraCount} อีก
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 border border-[#f3b8c4]/12 bg-[#1a0d12]/35 p-4 sm:p-5">
          {selectedDate ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-[#fff5f7]">
                  {formatThaiDate(selectedDate)}
                </p>
                {selectedDate === todayIso ? (
                  <span className="border border-[#e85a7a]/40 px-2 py-0.5 text-[0.55rem] tracking-[0.14em] text-[#e85a7a] uppercase">
                    วันนี้
                  </span>
                ) : null}
                {isInCurrentWeek(selectedDate, today) ? (
                  <span className="border border-[#f3b8c4]/25 px-2 py-0.5 text-[0.55rem] tracking-[0.14em] text-[#f3b8c4]/75 uppercase">
                    สัปดาห์นี้
                  </span>
                ) : null}
              </div>

              {selectedSlots.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {selectedSlots.map((slot) => (
                    <SlotListItem
                      key={slot.id}
                      slot={slot}
                      onOpen={() => setActiveSlot(slot)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#f3b8c4]/55">ไม่มีไลฟ์วันนี้</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#f3b8c4]/55">เลือกวันในปฏิทิน</p>
          )}
        </div>
      </section>

      <LiveDetailModal
        slot={activeSlot}
        open={activeSlot !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSlot(null);
        }}
      />
    </div>
  );
}
