"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { CollabBadge } from "@/components/events/CollabBadge";
import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import {
  LiveDayChannelBadges,
  LiveSlotTime,
  LiveSourceBadges,
  preferOwnChannelSlots,
} from "@/components/events/LiveSlotMeta";
import { LiveWeekTable } from "@/components/events/LiveWeekTable";
import { OfflineBadge } from "@/components/events/OfflineBadge";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  availableLiveYears,
  findDefaultWeekIndex,
  flattenLiveSlots,
  formatISODate,
  formatThaiDate,
  formatThaiShortDate,
  isInCurrentWeek,
  isSameMonth,
  monthGridDates,
  parseISODate,
  slotsByDateMap,
  sortLiveWeeks,
  startOfWeekSunday,
  thaiMonthName,
  thaiWeekdayShort,
  weekDayDates,
} from "@/lib/events";
import { sortLiveSlotsForCalendar } from "@/lib/live-stream-utils";
import { cn } from "@/lib/utils";
import {
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
} from "@/lib/youtube";
import type { LiveSlot, LiveWeek } from "@/types/vtuber";

type LiveScheduleBoardProps = {
  weeks: LiveWeek[];
};

function slotCoverUrl(slot: LiveSlot) {
  if (slot.coverUrl) return slot.coverUrl;
  const videoId = getYoutubeVideoId(slot.url);
  return videoId ? getYoutubeThumbnailUrl(videoId) : null;
}

function WeekSlotCard({
  slot,
  onOpen,
}: {
  slot: LiveSlot;
  onOpen: () => void;
}) {
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const guestTone = !own && collab;
  const cancelled = slot.status === "cancelled";
  const cover = slotCoverUrl(slot);
  const title = slot.titleLocal ?? slot.title;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex w-full cursor-pointer gap-3 overflow-hidden rounded-xl border bg-[#1a0d12]/55 p-2 text-left transition sm:gap-3.5 sm:p-2.5",
          cancelled
            ? "border-[#8a7f88]/30 opacity-85 hover:border-[#8a7f88]/50"
            : guestTone
              ? "border-[#d4a574]/30 hover:border-[#d4a574]/50 hover:bg-[#d4a574]/10"
              : "border-[#f3b8c4]/14 hover:border-[#e85a7a]/40 hover:bg-[#e85a7a]/10"
        )}
      >
        <div className="relative aspect-video w-[6.5rem] shrink-0 overflow-hidden rounded-lg bg-[#10070b] sm:w-36">
          {cover ? (
            <ProtectedImage
              src={cover}
              alt=""
              wrapClassName="absolute inset-0 block"
              className={cn(
                "h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]",
                cancelled && "opacity-70 grayscale-[0.35]"
              )}
            />
          ) : (
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(232,90,122,0.22),transparent_55%),linear-gradient(160deg,#1c0d12,#10070b)]"
              aria-hidden
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <LiveSlotTime
              time={slot.time}
              timePrevious={slot.timePrevious}
              timeUpdated={slot.timeUpdated}
              className="text-xs"
              accentClassName={
                cancelled
                  ? "text-[#d8d0d4]"
                  : guestTone
                    ? "text-[#e8c49a]"
                    : "text-[#e85a7a]"
              }
            />
            {cancelled ? (
              <span className="rounded-full border border-[#8a7f88]/45 px-2 py-0.5 text-[0.55rem] tracking-[0.12em] text-[#d8d0d4] uppercase">
                ยกเลิก
              </span>
            ) : collab || slot.isMember ? (
              <LiveSourceBadges
                isCollab={collab}
                isMember={slot.isMember}
                showChannel={false}
                size="sm"
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-snug font-medium whitespace-normal break-words text-[#fff5f7]">
            {title}
          </p>
          {slot.titleLocal ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-[#f3b8c4]/55">
              {slot.title}
            </p>
          ) : null}
        </div>

        {slot.url ? (
          <ExternalLink className="mt-1 size-3.5 shrink-0 self-start opacity-35" />
        ) : null}
      </button>
    </li>
  );
}

function calendarSlotTimeLabel(slot: LiveSlot) {
  return slot.timeUpdated ?? slot.time;
}

/** Monthly calendar cell — ghost styling for cancelled streams. */
function CalendarMonthSlot({
  slot,
  iso,
  crowded,
  mobile,
  onSelect,
}: {
  slot: LiveSlot;
  iso: string;
  crowded?: boolean;
  mobile?: boolean;
  onSelect: () => void;
}) {
  const cancelled = slot.status === "cancelled";
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const guestTone = !own && collab && !cancelled;
  const time = calendarSlotTimeLabel(slot);
  const label = slot.titleLocal ?? slot.title;

  if (mobile) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-0.5 border-l-2 py-px pl-1 text-left",
          cancelled
            ? "border-dashed border-[#8a7f88]/70 opacity-75"
            : guestTone
              ? "border-[#d4a574]"
              : "border-[#e85a7a]/70"
        )}
        title={`${time} · ${label}${cancelled ? " (ยกเลิก)" : ""}`}
      >
        <span
          className={cn(
            "truncate text-[0.55rem] tabular-nums leading-none",
            cancelled
              ? "text-[#d8d0d4] line-through decoration-[#8a7f88]/80"
              : guestTone
                ? "text-[#e8c49a]"
                : "text-[#e85a7a]"
          )}
        >
          {time}
        </span>
        {cancelled ? (
          <span className="shrink-0 text-[0.5rem] leading-none text-[#8a7f88]" aria-hidden>
            ×
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={cn(
        "min-w-0 w-full cursor-pointer border-l-2 pl-1 text-left leading-tight transition",
        crowded && "overflow-hidden",
        cancelled
          ? "border-dashed border-[#8a7f88]/70 opacity-75 hover:bg-[#8a7f88]/08"
          : guestTone
            ? "border-[#d4a574] text-[#fff5f7] hover:bg-white/5"
            : "border-[#e85a7a]/55 text-[#f7d7de]/90 hover:bg-white/5"
      )}
      title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${time} · ${label}${cancelled ? " (ยกเลิก)" : ""}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {cancelled ? (
          <span className="text-[0.55rem] tabular-nums tracking-wide text-[#d8d0d4] line-through decoration-[#8a7f88]/80 sm:text-[0.62rem]">
            {time}
          </span>
        ) : (
          <LiveSlotTime
            time={slot.time}
            timePrevious={slot.timePrevious}
            timeUpdated={slot.timeUpdated}
            className="text-[0.55rem] sm:text-[0.62rem]"
            accentClassName={guestTone ? "text-[#e8c49a]" : "text-[#e85a7a]"}
          />
        )}
        {!cancelled && (collab || slot.isMember) ? (
          <LiveSourceBadges
            isCollab={collab}
            isMember={slot.isMember}
            showChannel={false}
            size="sm"
          />
        ) : null}
        {cancelled ? (
          <span className="rounded-full border border-[#8a7f88]/45 px-1 py-px text-[0.48rem] tracking-[0.1em] text-[#d8d0d4] uppercase">
            ยกเลิก
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "mt-0.5 block text-[0.58rem] sm:text-[0.68rem]",
          crowded ? "truncate" : "line-clamp-3 whitespace-normal break-words",
          cancelled && "text-[#d8d0d4]/85 line-through decoration-[#8a7f88]/70"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function LiveScheduleBoard({ weeks }: LiveScheduleBoardProps) {
  const sortedWeeks = useMemo(() => sortLiveWeeks(weeks), [weeks]);
  const allSlots = useMemo(() => flattenLiveSlots(weeks), [weeks]);
  const byDate = useMemo(() => slotsByDateMap(allSlots), [allSlots]);

  const today = useMemo(() => new Date(), []);
  const todayIso = formatISODate(today);
  const thisWeekSundayIso = formatISODate(startOfWeekSunday(today));
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

  const selectedWeekDays = useMemo(() => {
    if (!selectedDate) return [] as string[];
    return weekDayDates(
      formatISODate(startOfWeekSunday(parseISODate(selectedDate)))
    );
  }, [selectedDate]);

  const selectedWeekRangeLabel =
    selectedWeekDays.length === 7
      ? `${formatThaiShortDate(selectedWeekDays[0])} – ${formatThaiShortDate(selectedWeekDays[6])}`
      : null;

  const selectedWeekSlotCount = useMemo(() => {
    let n = 0;
    for (const iso of selectedWeekDays) {
      n += byDate.get(iso)?.length ?? 0;
    }
    return n;
  }, [selectedWeekDays, byDate]);

  /** End of week containing the latest live date — Offline only up through this day */
  const offlineCutoffIso = useMemo(() => {
    let latest: string | null = null;
    for (const slot of allSlots) {
      if (!latest || slot.date > latest) latest = slot.date;
    }
    if (!latest) return null;
    const week = weekDayDates(
      formatISODate(startOfWeekSunday(parseISODate(latest)))
    );
    return week[6] ?? latest;
  }, [allSlots]);

  const showOfflineForDay = (iso: string) =>
    Boolean(offlineCutoffIso && iso <= offlineCutoffIso);

  /** Exclusive kind counts for the visible calendar month: Member > Collab > Solo */
  const monthKindStats = useMemo(() => {
    let member = 0;
    let collab = 0;
    let solo = 0;
    for (const slot of allSlots) {
      if (!isSameMonth(slot.date, year, month)) continue;
      if (slot.isMember) member += 1;
      else if (slot.kind === "collab") collab += 1;
      else solo += 1;
    }
    return { member, collab, solo, total: member + collab + solo };
  }, [allSlots, year, month]);

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
    const sunday = startOfWeekSunday(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
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

        <div className="mt-8 flex items-center justify-between gap-2 border border-[#f3b8c4]/12 bg-[#1a0d12]/40 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            <button
              type="button"
              aria-label="เดือนก่อน"
              onClick={goPrevMonth}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-8 shrink-0 rounded-none text-[#fff5f7] sm:size-9"
              )}
            >
              <ChevronLeft className="size-4" />
            </button>

            <label className="min-w-0 flex-1 sm:flex-none">
              <span className="sr-only">เดือน</span>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="w-full min-w-0 rounded-lg border border-[#f3b8c4]/25 bg-[#140a0d] px-1.5 py-1.5 font-[family-name:var(--font-display)] text-sm tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/50 sm:min-w-[8.5rem] sm:px-2 sm:text-base"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index} value={index}>
                    {thaiMonthName(index)}
                  </option>
                ))}
              </select>
            </label>

            <label className="shrink-0">
              <span className="sr-only">ปี</span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-[4.75rem] rounded-lg border border-[#f3b8c4]/25 bg-[#140a0d] px-1.5 py-1.5 font-[family-name:var(--font-display)] text-sm tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/50 sm:w-auto sm:min-w-[6.5rem] sm:px-2 sm:text-base"
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
                "size-8 shrink-0 rounded-none text-[#fff5f7] sm:size-9"
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <p className="hidden shrink-0 text-sm text-[#f3b8c4]/55 md:block">
            {thaiMonthName(month)} {year}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border border-[#f3b8c4]/12 bg-[#1a0d12]/35 px-3 py-2.5 sm:gap-3 sm:px-4">
          <p className="text-[0.62rem] tracking-[0.16em] text-[#f3b8c4]/50 uppercase">
            สถิติเดือนนี้
            <span className="ml-1.5 tabular-nums text-[#f3b8c4]/70">
              {monthKindStats.total}
            </span>
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9b8cff]/45 bg-[#9b8cff]/12 px-2.5 py-0.5 text-[0.62rem] tracking-[0.12em] text-[#cfc6ff] uppercase">
            Member
            <span className="tabular-nums">{monthKindStats.member}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3b8c4]/35 bg-[#e85a7a]/10 px-2.5 py-0.5 text-[0.62rem] tracking-[0.12em] text-[#f3b8c4] uppercase">
            Solo
            <span className="tabular-nums">{monthKindStats.solo}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a574]/50 bg-[#d4a574]/12 px-2.5 py-0.5 text-[0.62rem] tracking-[0.12em] text-[#e8c49a] uppercase">
            Collab
            <span className="tabular-nums">{monthKindStats.collab}</span>
          </span>
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
            const daySlots = preferOwnChannelSlots(
              sortLiveSlotsForCalendar(byDate.get(iso) ?? [])
            );
            const isToday = iso === todayIso;
            const inWeek = isInCurrentWeek(iso, today);
            const weekRowStart = iso === thisWeekSundayIso;
            const selected = selectedDate === iso;
            const dayNum = parseISODate(iso).getDate();
            const visibleSlots = daySlots.slice(0, 2);
            const extraCount = Math.max(0, daySlots.length - visibleSlots.length);
            const crowded = daySlots.length > 1;

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
                  "relative flex cursor-pointer flex-col items-stretch bg-[#140a0d] text-left transition",
                  // Mobile: square cells
                  "aspect-square gap-0.5 overflow-hidden p-1",
                  // Desktop: prior height rules
                  "sm:aspect-auto sm:gap-1.5 sm:p-1.5 md:p-2",
                  crowded
                    ? "sm:h-[7.5rem] sm:overflow-hidden md:h-[8.5rem]"
                    : "sm:min-h-[7.5rem] md:min-h-[8.5rem]",
                  !inMonth && "bg-[#10070b]/80 opacity-50",
                  inWeek && "border-y border-[#e85a7a]/30",
                  weekRowStart &&
                    "before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-[3px] before:bg-[#e85a7a] before:content-['']",
                  selected && "z-[1] ring-2 ring-inset ring-[#e85a7a]/70",
                  isToday && !selected && "bg-[#e85a7a]/10",
                  "hover:bg-[#e85a7a]/08"
                )}
              >
                {/* —— Mobile compact —— */}
                <div className="flex h-full min-h-0 flex-col sm:hidden">
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center self-start text-[0.7rem] tabular-nums",
                      isToday
                        ? "rounded-md bg-[#e85a7a] font-semibold text-white"
                        : "text-[#f7d7de]/85"
                    )}
                  >
                    {dayNum}
                  </span>

                  {daySlots.length > 0 ? (
                    <div className="mt-auto flex min-h-0 flex-col gap-0.5">
                      {visibleSlots.map((slot) => (
                        <CalendarMonthSlot
                          key={slot.id}
                          slot={slot}
                          iso={iso}
                          mobile
                          onSelect={() => {
                            selectDay(iso);
                            setActiveSlot(slot);
                          }}
                        />
                      ))}
                      {extraCount > 0 ? (
                        <span className="pl-1 text-[0.5rem] leading-none text-[#f3b8c4]/50">
                          +{extraCount}
                        </span>
                      ) : null}
                    </div>
                  ) : showOfflineForDay(iso) ? (
                    <div className="mt-auto border-l-2 border-[#6ec9b0]/70 py-px pl-1">
                      <span className="text-[0.5rem] tracking-[0.1em] text-[#6ec9b0]/85 uppercase">
                        Off
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* —— Desktop / tablet —— */}
                <div className="hidden h-full min-h-0 flex-col gap-1 sm:flex sm:gap-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-1 self-start">
                    <span
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center text-[0.7rem] tabular-nums sm:size-6 sm:text-xs",
                        isToday
                          ? "rounded-md bg-[#e85a7a] font-semibold text-white"
                          : "text-[#f7d7de]/85"
                      )}
                    >
                      {dayNum}
                    </span>
                    <LiveDayChannelBadges
                      slots={daySlots}
                      size="sm"
                      className="justify-start"
                    />
                  </div>

                  {daySlots.length > 0 ? (
                    <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-hidden sm:gap-1">
                      {visibleSlots.map((slot) => (
                        <CalendarMonthSlot
                          key={slot.id}
                          slot={slot}
                          iso={iso}
                          crowded={crowded}
                          onSelect={() => {
                            selectDay(iso);
                            setActiveSlot(slot);
                          }}
                        />
                      ))}
                      {extraCount > 0 ? (
                        <span className="shrink-0 pl-1 text-[0.55rem] text-[#f3b8c4]/55 sm:text-[0.62rem]">
                          +{extraCount} อีก
                        </span>
                      ) : null}
                    </div>
                  ) : showOfflineForDay(iso) ? (
                    <div className="flex w-full flex-col items-center pt-0.5">
                      <OfflineBadge size="sm" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.58rem] tracking-[0.12em] text-[#f3b8c4]/50 uppercase sm:text-[0.62rem]">
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[#f3b8c4]/55">
            <span className="h-3 w-0.5 shrink-0 bg-[#e85a7a]" aria-hidden />
            Solo
          </span>
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[#f3b8c4]/55">
            <span className="h-3 w-0.5 shrink-0 bg-[#d4a574]" aria-hidden />
            Collab
          </span>
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[#f3b8c4]/55">
            <span
              className="h-3 w-0.5 shrink-0 border-l border-dashed border-[#8a7f88]"
              aria-hidden
            />
            ยกเลิก
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#f3b8c4]/12 bg-[#1a0d12]/40">
          {selectedDate ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#f3b8c4]/12 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[0.62rem] tracking-[0.2em] text-[#f3b8c4]/55 uppercase">
                    สัปดาห์ที่เลือก
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-[#fff5f7]">
                    {selectedWeekRangeLabel}
                  </p>
                  <p className="mt-1 text-xs text-[#f3b8c4]/60">
                    วันโฟกัส {formatThaiDate(selectedDate)}
                    {selectedWeekSlotCount > 0
                      ? ` · ${selectedWeekSlotCount} ไลฟ์`
                      : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedDate === todayIso ? (
                    <span className="rounded-lg border border-[#e85a7a]/40 px-2 py-0.5 text-[0.55rem] tracking-[0.14em] text-[#e85a7a] uppercase">
                      วันนี้
                    </span>
                  ) : null}
                  {isInCurrentWeek(selectedDate, today) ? (
                    <span className="rounded-lg border border-[#f3b8c4]/25 px-2 py-0.5 text-[0.55rem] tracking-[0.14em] text-[#f3b8c4]/75 uppercase">
                      สัปดาห์นี้
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="divide-y divide-[#f3b8c4]/10">
                {selectedWeekDays.map((iso) => {
                  const daySlots = preferOwnChannelSlots(
                    sortLiveSlotsForCalendar(byDate.get(iso) ?? [])
                  );
                  const date = parseISODate(iso);
                  const isFocus = iso === selectedDate;
                  const isToday = iso === todayIso;

                  return (
                    <section
                      key={iso}
                      className={cn(
                        "px-4 py-4 sm:px-5",
                        isFocus && "bg-[#e85a7a]/06"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectDay(iso)}
                        className="flex w-full cursor-pointer flex-wrap items-center gap-2 text-left"
                      >
                        <span
                          className={cn(
                            "inline-flex min-w-[2.5rem] items-center justify-center rounded-md px-2 py-1 text-sm tabular-nums",
                            isToday
                              ? "bg-[#e85a7a] font-semibold text-white"
                              : isFocus
                                ? "bg-[#e85a7a]/20 text-[#fff5f7]"
                                : "text-[#f7d7de]/90"
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <span className="text-[0.7rem] tracking-[0.16em] text-[#f3b8c4]/65 uppercase">
                          {thaiWeekdayShort(date)}
                        </span>
                        <span className="text-xs text-[#f3b8c4]/50">
                          {formatThaiShortDate(iso)}
                        </span>
                        <LiveDayChannelBadges
                          slots={daySlots}
                          size="sm"
                          className="justify-start"
                        />
                        {isFocus ? (
                          <span className="ml-auto text-[0.55rem] tracking-[0.14em] text-[#e85a7a]/90 uppercase">
                            เลือกอยู่
                          </span>
                        ) : null}
                      </button>

                      {daySlots.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {daySlots.map((slot) => (
                            <WeekSlotCard
                              key={slot.id}
                              slot={slot}
                              onOpen={() => {
                                selectDay(iso);
                                setActiveSlot(slot);
                              }}
                            />
                          ))}
                        </ul>
                      ) : showOfflineForDay(iso) ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[#6ec9b0]/25 bg-[#6ec9b0]/06 px-3 py-3">
                          <OfflineBadge size="sm" />
                          <span className="text-xs text-[#a8e6d4]/75">
                            ไม่มีไลฟ์วันนี้
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[#f3b8c4]/35">—</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="px-4 py-8 text-sm text-[#f3b8c4]/55 sm:px-5">
              เลือกวันในปฏิทินเพื่อดูไลฟ์ทั้งสัปดาห์
            </p>
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
