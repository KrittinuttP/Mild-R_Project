"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { CollabBadge } from "@/components/events/CollabBadge";
import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import {
  LiveCancelledBadge,
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
  LiveScheduleError,
  LiveScheduleSkeleton,
} from "@/components/events/LiveScheduleSkeleton";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import {
  BADGE_SOFT_CLASS,
  CTA_OUTLINE_CLASS,
  DISPLAY_H2_CLASS,
  GLASS_CARD_CLASS,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_PILL_SM,
  LIVE_BADGE_SOFT,
} from "@/lib/site-ui";
import {
  calendarYearOptions,
  findDefaultWeekIndex,
  flattenLiveSlots,
  formatISODate,
  formatThaiShortDate,
  isInCurrentWeek,
  isSameMonth,
  mergeLiveWeekLists,
  monthGridDates,
  monthRangeWithPadYmd,
  parseISODate,
  slotsByDateMap,
  sortLiveWeeks,
  startOfWeekSunday,
  thaiMonthName,
  thaiWeekdayShort,
  thisWeekRangeYmd,
  weekDayDates,
} from "@/lib/events";
import { sortLiveSlotsForCalendar } from "@/lib/live-stream-utils";
import { cn } from "@/lib/utils";
import {
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
} from "@/lib/youtube";
import type { LiveSlot } from "@/types/vtuber";

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
          "group flex w-full cursor-pointer gap-3 overflow-hidden rounded-3xl border bg-[#1a0c12]/60 p-3 text-left transition sm:gap-4 sm:p-3.5",
          cancelled
            ? "border-[#8a7f88]/30 opacity-85 hover:border-[#8a7f88]/50"
            : guestTone
              ? "border-[#d4a574]/30 hover:border-[#d4a574]/50 hover:bg-[#d4a574]/10"
              : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
        )}
      >
        <div className="relative aspect-video w-[6.5rem] shrink-0 overflow-hidden rounded-2xl bg-[#10070b] sm:w-36">
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
              <LiveCancelledBadge />
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

/** Mobile month cell — time only (no badges). */
function MobileCalendarTimeSlot({
  slot,
  onSelect,
}: {
  slot: LiveSlot;
  onSelect: () => void;
}) {
  const cancelled = slot.status === "cancelled";
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const guestTone = !own && collab && !cancelled;
  const time = calendarSlotTimeLabel(slot);
  const label = slot.titleLocal ?? slot.title;

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

function CalendarMonthSlot({
  slot,
  crowded,
  onSelect,
}: {
  slot: LiveSlot;
  crowded?: boolean;
  onSelect: () => void;
}) {
  const cancelled = slot.status === "cancelled";
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const guestTone = !own && collab && !cancelled;
  const time = calendarSlotTimeLabel(slot);
  const label = slot.titleLocal ?? slot.title;

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
            compactChannel
          />
        ) : null}
        {cancelled ? <LiveCancelledBadge compact /> : null}
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

export function LiveScheduleBoard() {
  const today = useMemo(() => new Date(), []);
  const todayIso = formatISODate(today);
  const thisWeekSundayIso = formatISODate(startOfWeekSunday(today));

  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso);
  const [activeSlot, setActiveSlot] = useState<LiveSlot | null>(null);
  const weekDetailRef = useRef<HTMLDivElement>(null);

  const thisWeekRange = useMemo(() => thisWeekRangeYmd(today), [today]);
  // Fetch only: selected month ± 7 days (not tied to grid shape)
  const monthRange = useMemo(
    () => monthRangeWithPadYmd(year, month, 7),
    [year, month]
  );

  const thisWeekQuery = useLiveSchedule(thisWeekRange);
  const monthQuery = useLiveSchedule(monthRange);

  const weeks = useMemo(
    () => mergeLiveWeekLists(thisWeekQuery.weeks, monthQuery.weeks),
    [thisWeekQuery.weeks, monthQuery.weeks]
  );
  const allSlots = useMemo(() => flattenLiveSlots(weeks), [weeks]);
  // Place fetched slots onto calendar cells by matching date
  const byDate = useMemo(() => slotsByDateMap(allSlots), [allSlots]);

  const years = useMemo(
    () => calendarYearOptions(today.getFullYear()),
    [today]
  );

  const thisWeekIndex = findDefaultWeekIndex(thisWeekQuery.weeks, today);
  const thisWeek = sortLiveWeeks(thisWeekQuery.weeks)[thisWeekIndex];
  const thisWeekOnly = thisWeek ? [thisWeek] : [];

  const initialLoading =
    (thisWeekQuery.status === "loading" || monthQuery.status === "loading") &&
    weeks.length === 0 &&
    thisWeekQuery.status !== "error" &&
    monthQuery.status !== "error";

  const fatalError =
    weeks.length === 0 &&
    thisWeekQuery.status === "error" &&
    monthQuery.status === "error";

  const calendarLoading =
    monthQuery.status === "loading" && monthQuery.weeks.length === 0;

  // Calendar UI only: selected month + pad days to complete weeks
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

  /** End of week containing the latest live date — offline only up through this day */
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

  /** Calendar cell tap: select day; 1 slot → open detail; many → scroll to list (mobile). */
  const selectCalendarDay = (iso: string, daySlots: LiveSlot[]) => {
    selectDay(iso);
    if (daySlots.length === 1) {
      setActiveSlot(daySlots[0]);
      return;
    }
    if (daySlots.length > 1 && typeof window !== "undefined") {
      const narrow = window.matchMedia("(max-width: 639px)").matches;
      if (narrow) {
        requestAnimationFrame(() => {
          weekDetailRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }
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

  const retryAll = () => {
    thisWeekQuery.retry();
    monthQuery.retry();
  };

  if (initialLoading) {
    return <LiveScheduleSkeleton variant="full" />;
  }

  if (fatalError) {
    return (
      <LiveScheduleError
        message={thisWeekQuery.error ?? monthQuery.error}
        onRetry={retryAll}
      />
    );
  }

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ── This week ── */}
      <section className="relative">
        <div className="pointer-events-none absolute -top-10 right-0 size-44 bg-[radial-gradient(circle,rgba(232,90,122,0.14),transparent_65%)]" />

        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={DISPLAY_H2_CLASS}>
              ไลฟ์สัปดาห์นี้
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#f3b8c4]/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#e85a7a]" />
              <span className="text-[#e85a7a]/90">Solo</span>
            </span>
            <CollabBadge />
          </div>
        </div>

        <div className="relative mt-8 sm:mt-10">
          {thisWeekQuery.status === "loading" && thisWeekOnly.length === 0 ? (
            <LiveScheduleSkeleton variant="compact" />
          ) : thisWeekOnly.length > 0 ? (
            <LiveWeekTable weeks={thisWeekOnly} />
          ) : (
            <p className="text-sm text-[#f3b8c4]/65">ยังไม่มีไลฟ์สัปดาห์นี้</p>
          )}
        </div>
      </section>

      {/* ── Month calendar ── */}
      {/* ── Month calendar ── */}
      <section className="relative">
        {calendarLoading ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 animate-pulse rounded-3xl bg-[#140a0d]/35"
            aria-hidden
          />
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className={DISPLAY_H2_CLASS}>
              ปฏิทินรายเดือน
            </h2>
          </div>
          <button
            type="button"
            onClick={jumpToThisWeek}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              CTA_OUTLINE_CLASS
            )}
          >
            ไปสัปดาห์นี้
          </button>
        </div>

        <div
          className={cn(
            GLASS_CARD_CLASS,
            "mt-8 overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#f3b8c4]/10 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                aria-label="เดือนก่อน"
                onClick={goPrevMonth}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "size-8 shrink-0 rounded-2xl text-[#fff5f7] sm:size-9"
                )}
              >
                <ChevronLeft className="size-4" />
              </button>

              <label className="min-w-0 flex-1 sm:flex-none">
                <span className="sr-only">เดือน</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="w-full min-w-0 rounded-2xl border border-[#f3b8c4]/25 bg-[#140a0d] px-2 py-2 font-[family-name:var(--font-display)] text-sm tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/50 sm:min-w-[8.5rem] sm:px-3 sm:text-base"
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
                  className="w-[4.75rem] rounded-2xl border border-[#f3b8c4]/25 bg-[#140a0d] px-2 py-2 font-[family-name:var(--font-display)] text-sm tracking-normal text-[#fff5f7] outline-none focus:border-[#e85a7a]/50 sm:w-auto sm:min-w-[6.5rem] sm:px-3 sm:text-base"
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
                  "size-8 shrink-0 rounded-2xl text-[#fff5f7] sm:size-9"
                )}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <p className="hidden shrink-0 text-sm text-[#f3b8c4]/55 md:block">
              {thaiMonthName(month)} {year}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 border-b border-[#f3b8c4]/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <p className="mr-auto text-xs tracking-[0.14em] text-[#f3b8c4]/55 uppercase sm:text-sm">
              เดือนนี้
              <span className="ml-1.5 tabular-nums text-[#f3b8c4]/75">
                {monthKindStats.total}
              </span>
            </p>
            {/* Mobile: compact counts — full pills from sm+ */}
            <div className="flex items-center gap-2.5 text-[0.65rem] tabular-nums tracking-wide sm:hidden">
              <span className="inline-flex items-center gap-1 text-[#cfc6ff]">
                <span className="size-1.5 rounded-full bg-[#9b8cff]" aria-hidden />
                {monthKindStats.member}
              </span>
              <span className="inline-flex items-center gap-1 text-[#f3b8c4]/80">
                <span className="size-1.5 rounded-full bg-[#e85a7a]" aria-hidden />
                {monthKindStats.solo}
              </span>
              <span className="inline-flex items-center gap-1 text-[#e8c49a]">
                <span className="size-1.5 rounded-full bg-[#d4a574]" aria-hidden />
                {monthKindStats.collab}
              </span>
            </div>
            <span
              className={cn(
                LIVE_BADGE_PILL_SM,
                LIVE_BADGE_MEMBER,
                "hidden gap-1.5 sm:inline-flex"
              )}
            >
              Member
              <span className="tabular-nums">{monthKindStats.member}</span>
            </span>
            <span
              className={cn(
                LIVE_BADGE_PILL_SM,
                LIVE_BADGE_SOFT,
                "hidden gap-1.5 sm:inline-flex"
              )}
            >
              Solo
              <span className="tabular-nums">{monthKindStats.solo}</span>
            </span>
            <span
              className={cn(
                LIVE_BADGE_PILL_SM,
                LIVE_BADGE_COLLAB,
                "hidden gap-1.5 sm:inline-flex"
              )}
            >
              Collab
              <span className="tabular-nums">{monthKindStats.collab}</span>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-px bg-[#f3b8c4]/08 p-px">
            {weekdayHeaders.map((label) => (
              <div
                key={label}
                className="bg-[#1a0c12]/80 px-1 py-2 text-center text-xs tracking-[0.14em] text-[#f3b8c4]/55 uppercase sm:text-sm"
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
                onClick={() => selectCalendarDay(iso, daySlots)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectCalendarDay(iso, daySlots);
                  }
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col items-stretch bg-[#140a0d]/55 text-left transition",
                  "aspect-square gap-0.5 overflow-hidden p-1",
                  "sm:aspect-auto sm:gap-1.5 sm:p-1.5 md:p-2",
                  crowded
                    ? "sm:h-[7.5rem] sm:overflow-hidden md:h-[8.5rem]"
                    : "sm:min-h-[7.5rem] md:min-h-[8.5rem]",
                  !inMonth && "opacity-40",
                  inWeek && !isToday && !selected && "bg-[#f3b8c4]/04",
                  weekRowStart &&
                    "before:absolute before:inset-y-1 before:left-0 before:z-10 before:w-[2px] before:rounded-full before:bg-[#f3b8c4]/55 before:content-['']",
                  selected && "z-[1] bg-[#e85a7a]/12 ring-1 ring-inset ring-[#e85a7a]/50",
                  isToday &&
                    !selected &&
                    "z-[1] bg-[#f3b8c4]/08 ring-1 ring-inset ring-[#f3b8c4]/35",
                  isToday && selected && "bg-[#e85a7a]/14",
                  "hover:bg-[#f3b8c4]/06"
                )}
              >
                {/* —— Mobile: day number + times (no badges) —— */}
                <div className="flex h-full min-h-0 flex-col sm:hidden">
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center self-start text-[0.7rem] tabular-nums",
                      isToday
                        ? "rounded-full border border-[#f3b8c4]/55 bg-[#f3b8c4]/18 font-semibold text-[#fff5f7]"
                        : "text-[#f7d7de]/85"
                    )}
                  >
                    {dayNum}
                  </span>

                  {daySlots.length > 0 ? (
                    <div className="mt-auto flex min-h-0 flex-col gap-0.5">
                      {visibleSlots.map((slot) => (
                        <MobileCalendarTimeSlot
                          key={slot.id}
                          slot={slot}
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
                          ? "rounded-full border border-[#f3b8c4]/55 bg-[#f3b8c4]/18 font-semibold text-[#fff5f7]"
                          : "text-[#f7d7de]/85"
                      )}
                    >
                      {dayNum}
                    </span>
                    <LiveDayChannelBadges
                      slots={daySlots}
                      size="sm"
                      compact
                      className="justify-start"
                    />
                  </div>

                  {daySlots.length > 0 ? (
                    <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-hidden sm:gap-1">
                      {visibleSlots.map((slot) => (
                        <CalendarMonthSlot
                          key={slot.id}
                          slot={slot}
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tracking-wide text-[#f3b8c4]/55 sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 shrink-0 rounded-full bg-[#e85a7a]" aria-hidden />
            Solo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 shrink-0 rounded-full bg-[#d4a574]" aria-hidden />
            Collab
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-0.5 shrink-0 rounded-full border-l border-dashed border-[#8a7f88]"
              aria-hidden
            />
            ยกเลิก
          </span>
        </div>

        <div ref={weekDetailRef} className={cn(GLASS_CARD_CLASS, "mt-6 overflow-hidden")}>
          {selectedDate ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#f3b8c4]/12 px-4 py-4 sm:px-5">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-normal text-[#fff5f7]">
                    {selectedWeekRangeLabel}
                  </p>
                  {selectedWeekSlotCount > 0 ? (
                    <p className="mt-1 text-xs text-[#f3b8c4]/60 sm:text-sm">
                      {selectedWeekSlotCount} ไลฟ์
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedDate === todayIso ? (
                    <span className={cn(BADGE_SOFT_CLASS, "uppercase")}>
                      วันนี้
                    </span>
                  ) : null}
                  {isInCurrentWeek(selectedDate, today) ? (
                    <span className={cn(BADGE_SOFT_CLASS, "uppercase")}>
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
                              ? "border border-[#f3b8c4]/45 bg-[#f3b8c4]/15 font-semibold text-[#fff5f7]"
                              : isFocus
                                ? "bg-[#e85a7a]/20 text-[#fff5f7]"
                                : "text-[#f7d7de]/90"
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <span className="text-xs tracking-[0.14em] text-[#f3b8c4]/65 uppercase sm:text-sm">
                          {thaiWeekdayShort(date)}
                        </span>
                        <span className="text-xs text-[#f3b8c4]/50 sm:text-sm">
                          {formatThaiShortDate(iso)}
                        </span>
                        <LiveDayChannelBadges
                          slots={daySlots}
                          size="sm"
                          className="justify-start"
                        />
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
                        <div className="mt-3 flex items-center gap-2 border-l-2 border-dashed border-[#6ec9b0]/40 px-3 py-2.5">
                          <OfflineBadge size="sm" />
                          <span className="text-xs text-[#a8e6d4]/75 sm:text-sm">
                            ไม่มีไลฟ์
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
              ยังไม่ได้เลือกวัน
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
