"use client";
import { englishWeekday, englishMonth, formatLiveShortDate, formatLiveDateRange } from "@/lib/live-date-format";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ChevronLeft, ChevronRight, Clock3, ExternalLink, Loader2 } from "lucide-react";

import { LiveCoverPlaceholder } from "@/components/events/LiveCoverPlaceholder";
import { LiveDetailHost, useLiveDetail } from "@/components/events/LiveDetailHost";
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
import {
  LiveScheduleError,
  LiveScheduleSkeleton,
} from "@/components/events/LiveScheduleSkeleton";
import { XLiveSchedulePoster, XLiveSchedulePosterEmpty } from "@/components/events/XLiveSchedulePoster";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import { useXLiveSchedules } from "@/hooks/useXLiveSchedules";
import { matchScheduleForWeek } from "@/lib/x-live-schedules";
import {
  LIVE_BADGE_CANCELLED,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_PILL_COMPACT,
  R_CARD_CLASS,
  R_CHIP_SOFT_CLASS,
  R_H2_CLASS,
} from "@/lib/site-ui";
import {
  addDays,
  calendarYearOptions,
  flattenLiveSlots,
  formatISODate,

  isInCurrentWeek,
  isSameMonth,
  mergeLiveWeekLists,
  monthGridDates,
  monthRangeWithPadYmd,
  parseISODate,
  slotsByDateMap,
  sortLiveWeeks,
  startOfWeekSunday,


  thisWeekRangeYmd,
  surroundingWeeksRangeYmd,
  weekDayDates,
  weekOverlapsYmdRange,
} from "@/lib/events";
import { sortLiveSlotsForCalendar } from "@/lib/live-stream-utils";
import { getSlotCoverUrl } from "@/lib/live-cover";
import { scrollToHashTarget } from "@/lib/scroll-to-hash";
import { cn } from "@/lib/utils";
import type { LiveSlot } from "@/types/vtuber";

const LIVE_SECTION_HASHES = new Set(["#this-week", "#calendar", "#weekly"]);

/** Round icon button — same look as the home live table (CI A+). */
const NAV_BTN =
  "r-card flex size-10 shrink-0 items-center justify-center rounded-full text-r-text-2 shadow-none ring-2 ring-r-text-2/15 transition-colors hover:text-r-text hover:ring-r-pri/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc disabled:pointer-events-none disabled:opacity-35";

/** Small outline pill button. */
const PILL_BTN =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm text-r-text ring-1 ring-r-text-2/30 ring-inset transition-colors hover:bg-r-pri/10 hover:ring-r-pri/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc";

const SELECT_CLASS =
  "rounded-full bg-r-bg px-3 py-2 font-[family-name:var(--font-display)] text-sm tracking-normal text-r-text ring-1 ring-r-text-2/30 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-r-acc sm:px-3.5 sm:text-base";

function TimeZoneChip() {
  return (
    <span className={cn(R_CHIP_SOFT_CLASS, "gap-1.5")}>
      <Clock3 className="size-3" aria-hidden />
      เวลาไทย
    </span>
  );
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
  const isMember = Boolean(slot.isMember);
  const cover = getSlotCoverUrl(slot);
  const title = slot.titleLocal ?? slot.title;
  const hasBadges = cancelled || collab || isMember;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${slot.timeUpdated ?? slot.time} · ${title}`}
        className={cn(
          "group flex min-h-[5.5rem] w-full cursor-pointer gap-3 overflow-hidden rounded-2xl border bg-white/[0.025] p-3 text-left transition sm:min-h-[6rem] sm:gap-4 sm:p-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
          cancelled
            ? "border-[#8a7f88]/30 opacity-85 hover:border-[#8a7f88]/50"
            : guestTone
              ? "border-[#d4a574]/30 hover:border-[#d4a574]/50 hover:bg-[#d4a574]/10"
              : "border-r-line hover:border-r-pri/45 hover:bg-r-pri/[0.06]"
        )}
      >
        <div className="relative aspect-video w-[6.5rem] shrink-0 overflow-hidden rounded-2xl bg-r-bg sm:w-36">
          {cover ? (
            <>
              <ProtectedImage
                src={cover}
                alt=""
                wrapClassName="absolute inset-0 block"
                className={cn(
                  "absolute inset-0 h-full w-full scale-[1.2] object-cover object-center transition duration-500 group-hover:scale-[1.25] sm:scale-100 sm:group-hover:scale-[1.03]",
                  cancelled && "opacity-70 grayscale-[0.35]"
                )}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-r-bg/80 via-transparent to-transparent" />
            </>
          ) : (
            <LiveCoverPlaceholder
              className="absolute inset-0"
              size="sm"
              variant={cancelled ? "cancelled" : "default"}
            />
          )}

          {hasBadges ? (
            <div className="absolute bottom-1 right-1 flex flex-wrap items-center justify-end gap-1 sm:bottom-1.5 sm:right-1.5">
              {cancelled ? (
                <span
                  className={cn(
                    LIVE_BADGE_PILL_COMPACT,
                    LIVE_BADGE_CANCELLED,
                    "h-4 bg-r-bg/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                  )}
                >
                  ยกเลิก
                </span>
              ) : (
                <>
                  {isMember ? (
                    <span
                      className={cn(
                        LIVE_BADGE_PILL_COMPACT,
                        LIVE_BADGE_MEMBER,
                        "h-4 bg-r-bg/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                      )}
                    >
                      Member
                    </span>
                  ) : null}
                  {collab ? (
                    <span
                      className={cn(
                        LIVE_BADGE_PILL_COMPACT,
                        LIVE_BADGE_COLLAB,
                        "h-4 bg-r-bg/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                      )}
                    >
                      Collab
                    </span>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
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
                  : isMember
                    ? "text-[#cfc6ff]"
                    : guestTone
                      ? "text-[#e8c49a]"
                      : "text-r-pri"
              }
            />
          </div>
          <p className="mt-1 line-clamp-2 min-w-0 text-sm leading-snug font-medium text-r-text">
            {title}
          </p>
          {slot.titleLocal ? (
            <p className="mt-0.5 line-clamp-1 min-w-0 text-xs text-r-text-3">
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
  const isMember = Boolean(slot.isMember);
  const guestTone = !own && collab && !cancelled && !isMember;
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
          : isMember
            ? "border-[#9b8cff]/80"
            : guestTone
              ? "border-[#d4a574]"
              : "border-r-pri/70"
      )}
      title={`${time} · ${label}${cancelled ? " (ยกเลิก)" : ""}`}
    >
      <span
        className={cn(
          "truncate text-[0.55rem] tabular-nums leading-none",
          cancelled
            ? "text-[#d8d0d4] line-through decoration-[#8a7f88]/80"
            : isMember
              ? "text-[#cfc6ff]"
              : guestTone
                ? "text-[#e8c49a]"
                : "text-r-pri"
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
  const isMember = Boolean(slot.isMember);
  const guestTone = !own && collab && !cancelled && !isMember;
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
          : isMember
            ? "border-[#9b8cff]/80 text-r-text hover:bg-[#9b8cff]/08"
            : guestTone
              ? "border-[#d4a574] text-r-text hover:bg-white/5"
              : "border-r-pri/60 text-r-text/90 hover:bg-white/5"
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
            accentClassName={
              isMember
                ? "text-[#cfc6ff]"
                : guestTone
                  ? "text-[#e8c49a]"
                  : "text-r-pri"
            }
          />
        )}
        {!cancelled && (collab || isMember) ? (
          <LiveSourceBadges
            isCollab={collab}
            isMember={isMember}
            showChannel={false}
            compactChannel
            tone="aplus"
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

  const [requestedYear, setYear] = useState(() => today.getFullYear());
  const [requestedMonth, setMonth] = useState(() => today.getMonth());
  const [requestedDate, setSelectedDate] = useState<string | null>(todayIso);
  const [displayed, setDisplayed] = useState({
    year: requestedYear, month: requestedMonth, selectedDate: requestedDate,
  });
  const { detailRef, openDetail } = useLiveDetail();
  /** Day row that glows briefly after a calendar tap. */
  const [flashIso, setFlashIso] = useState<string | null>(null);
  const weekDetailRef = useRef<HTMLDivElement>(null);
  const weekScrollAnchor = useRef<{ top: number; date: string } | null>(null);

  const thisWeekRange = useMemo(() => thisWeekRangeYmd(today), [today]);
  const spotlightRange = useMemo(
    () => surroundingWeeksRangeYmd(today),
    [today]
  );
  // Fetch only: selected month ± 7 days (not tied to grid shape)
  const monthRange = useMemo(
    () => monthRangeWithPadYmd(requestedYear, requestedMonth, 7),
    [requestedYear, requestedMonth]
  );

  const spotlightQuery = useLiveSchedule(spotlightRange);
  const monthQuery = useLiveSchedule(monthRange, { keepPreviousData: true });

  const xScheduleRange = useMemo(() => {
    const from = formatISODate(addDays(parseISODate(monthRange.from), -14));
    return { from, to: monthRange.to };
  }, [monthRange]);
  const xSchedulesQuery = useXLiveSchedules(xScheduleRange);
  const monthReady = monthQuery.resolvedKey === `${monthRange.from}:${monthRange.to}`;
  const view = monthReady
    ? { year: requestedYear, month: requestedMonth, selectedDate: requestedDate }
    : displayed;
  if (monthReady && (displayed.year !== requestedYear ||
    displayed.month !== requestedMonth || displayed.selectedDate !== requestedDate)) {
    setDisplayed(view);
  }
  const { year, month, selectedDate } = view;

  useLayoutEffect(() => {
    const anchor = weekScrollAnchor.current;
    const panel = weekDetailRef.current;
    if (!anchor || !panel || !monthReady || selectedDate !== anchor.date) return;
    const offset = panel.getBoundingClientRect().top - anchor.top;
    if (Math.abs(offset) > 0.5) {
      window.scrollBy({ top: offset, behavior: "instant" });
    }
    weekScrollAnchor.current = null;
  }, [monthReady, selectedDate, monthQuery.weeks]);

  const weeks = useMemo(
    () => mergeLiveWeekLists(spotlightQuery.weeks, monthQuery.weeks),
    [spotlightQuery.weeks, monthQuery.weeks]
  );
  const allSlots = useMemo(() => flattenLiveSlots(weeks), [weeks]);
  // Place fetched slots onto calendar cells by matching date
  const byDate = useMemo(() => slotsByDateMap(allSlots), [allSlots]);

  const years = useMemo(
    () => calendarYearOptions(today.getFullYear()),
    [today]
  );

  const spotlightWeeks = useMemo(() => {
    const sorted = sortLiveWeeks(spotlightQuery.weeks);
    if (sorted.length > 0) return sorted;
    return [
      {
        id: `empty-${thisWeekRange.from}`,
        weekStart: thisWeekRange.from,
        slots: [],
      },
    ];
  }, [spotlightQuery.weeks, thisWeekRange.from]);

  /** Top section is pinned to the current week (no week paging there). */
  const thisWeekOnly = useMemo(() => {
    const match = spotlightWeeks.filter((week) =>
      weekOverlapsYmdRange(week.weekStart, thisWeekRange.from, thisWeekRange.to)
    );
    if (match.length > 0) return match;
    return [{ id: `empty-${thisWeekRange.from}`, weekStart: thisWeekRange.from, slots: [] }];
  }, [spotlightWeeks, thisWeekRange.from, thisWeekRange.to]);

  useEffect(() => {
    if (!flashIso) return;
    const timer = window.setTimeout(() => setFlashIso(null), 1400);
    return () => window.clearTimeout(timer);
  }, [flashIso]);

  const initialLoading =
    !monthQuery.hasLoaded &&
    (spotlightQuery.status === "loading" || monthQuery.status === "loading") &&
    weeks.length === 0 &&
    spotlightQuery.status !== "error" &&
    monthQuery.status !== "error";

  const fatalError =
    weeks.length === 0 &&
    spotlightQuery.status === "error" &&
    monthQuery.status === "error";

  const calendarLoading = !monthReady || monthQuery.status === "loading";

  // Sections only exist after data loads, so the browser's native hash scroll misses them.
  const hashScrollDone = useRef(false);
  const boardSettled =
    !initialLoading &&
    !fatalError &&
    (!calendarLoading || monthQuery.status === "error");
  useEffect(() => {
    if (hashScrollDone.current || !boardSettled) return;
    hashScrollDone.current = true;
    const hash = window.location.hash;
    if (!LIVE_SECTION_HASHES.has(hash)) return;
    requestAnimationFrame(() => scrollToHashTarget(hash, "smooth"));
  }, [boardSettled]);

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
      ? formatLiveDateRange(selectedWeekDays[0], selectedWeekDays[6])
      : null;

  const adjacentWeekDate = (direction: number) => {
    const date = parseISODate(requestedDate ?? todayIso);
    date.setDate(date.getDate() + direction * 7);
    return date;
  };
  const canMoveWeek = (direction: number) =>
    years.includes(adjacentWeekDate(direction).getFullYear());

  const moveWeek = (direction: number) => {
    if (!canMoveWeek(direction)) return;
    const date = adjacentWeekDate(direction);
    const targetDate = formatISODate(date);
    if (weekDetailRef.current) {
      weekScrollAnchor.current = {
        top: weekDetailRef.current.getBoundingClientRect().top,
        date: targetDate,
      };
    }
    setSelectedDate(targetDate);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  };

  const selectedWeekSlotCount = useMemo(() => {
    let n = 0;
    for (const iso of selectedWeekDays) {
      n += byDate.get(iso)?.length ?? 0;
    }
    return n;
  }, [selectedWeekDays, byDate]);

  const selectedWeekPoster = useMemo(() => {
    if (selectedWeekDays.length !== 7) return null;
    return matchScheduleForWeek(xSchedulesQuery.rows, selectedWeekDays[0]);
  }, [selectedWeekDays, xSchedulesQuery.rows]);

  const weeksWithLiveData = useMemo(() => {
    const weekStarts = new Set<string>();
    for (const slot of allSlots) {
      weekStarts.add(formatISODate(startOfWeekSunday(parseISODate(slot.date))));
    }
    return weekStarts;
  }, [allSlots]);

  const showOfflineForDay = (iso: string) =>
    weeksWithLiveData.has(formatISODate(startOfWeekSunday(parseISODate(iso))));

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

  /** Calendar cell tap: pick that week, scroll to the weekly list and glow the day. */
  const selectCalendarDay = (iso: string) => {
    selectDay(iso);
    setFlashIso(iso);
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      scrollToHashTarget("#weekly", reduceMotion ? "auto" : "smooth");
    });
  };

  const jumpToThisWeek = () => {
    selectDay(todayIso);
  };

  const weekdayHeaders = useMemo(() => {
    const sunday = startOfWeekSunday(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return englishWeekday(d);
    });
  }, [today]);

  const viewingThisWeek = selectedDate ? isInCurrentWeek(selectedDate, today) : true;

  const renderPoster = (layout: "aside" | "row") =>
    selectedWeekPoster ? (
      <XLiveSchedulePoster
        poster={selectedWeekPoster}
        status={selectedWeekPoster.status}
        errorMessage={selectedWeekPoster.error_message}
        layout={layout}
      />
    ) : (
      <XLiveSchedulePosterEmpty
        layout={layout}
        loading={xSchedulesQuery.status === "loading"}
        hint="ยังไม่มี Live Schedule จาก X สำหรับสัปดาห์นี้"
      />
    );

  const retryAll = () => {
    spotlightQuery.retry();
    monthQuery.retry();
    xSchedulesQuery.retry();
  };

  if (initialLoading) {
    return <LiveScheduleSkeleton variant="full" />;
  }

  if (fatalError) {
    return (
      <LiveScheduleError
        message={spotlightQuery.error ?? monthQuery.error}
        onRetry={retryAll}
      />
    );
  }

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ── This week (pinned to the current week) ── */}
      <section
        id="this-week"
        aria-labelledby="this-week-title"
        className="relative scroll-mt-24 sm:scroll-mt-28"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 id="this-week-title" className={R_H2_CLASS}>
            ไลฟ์สัปดาห์นี้
          </h2>
          <a
            href="#calendar"
            onClick={(event) => {
              event.preventDefault();
              const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              scrollToHashTarget("#calendar", reduceMotion ? "auto" : "smooth");
            }}
            className="inline-flex items-center gap-1.5 pb-1 text-sm text-r-acc transition-colors hover:text-r-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
          >
            ดูเดือนอื่น / ย้อนหลัง
            <ArrowDown className="size-3.5" aria-hidden />
          </a>
        </div>

        <div className="mt-8 sm:mt-10">
          {spotlightQuery.status === "loading" &&
          spotlightQuery.weeks.length === 0 ? (
            <LiveScheduleSkeleton variant="compact" />
          ) : (
            <LiveWeekTable
              weeks={thisWeekOnly}
              blankEmptyDays
              slotLookup={allSlots}
              weekRange={thisWeekRange}
              tone="aplus"
            />
          )}
        </div>
      </section>

      {/* ── Month calendar ── */}
      <section
        id="calendar"
        aria-labelledby="calendar-title"
        className="relative scroll-mt-24 sm:scroll-mt-28"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="calendar-title" className={R_H2_CLASS}>
              ปฏิทินรายเดือน
            </h2>
            {calendarLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-r-text-3">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                กำลังโหลด…
              </span>
            ) : null}
          </div>
          <button type="button" onClick={jumpToThisWeek} className={PILL_BTN}>
            ไปสัปดาห์นี้
          </button>
        </div>

        <div className={cn(R_CARD_CLASS, "mt-8 overflow-hidden")}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-r-line px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="font-[family-name:var(--font-display)] text-lg font-normal text-r-text sm:text-xl">
                {englishMonth(month)} {year}
              </p>
              <TimeZoneChip />
            </div>
            <div className="ml-auto flex w-full min-w-0 items-center gap-1.5 sm:w-auto">
              <label className="min-w-0 flex-1 sm:flex-none">
                <span className="sr-only">เดือน</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className={cn(SELECT_CLASS, "w-full min-w-0 sm:min-w-[8.5rem]")}
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index} value={index}>
                      {englishMonth(index)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="shrink-0">
                <span className="sr-only">ปี</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className={cn(SELECT_CLASS, "w-[6.25rem] sm:w-auto sm:min-w-[6.5rem]")}
                >
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" aria-label="เดือนก่อน" onClick={goPrevMonth} className={NAV_BTN}>
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" aria-label="เดือนถัดไป" onClick={goNextMonth} className={NAV_BTN}>
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5 border-b border-r-line px-3 py-2 sm:px-4 sm:py-2.5">
            <p className="mr-auto text-xs tracking-[0.14em] text-r-text-3 uppercase sm:text-sm">
              เดือนนี้
              <span className="ml-1.5 tabular-nums text-r-text">
                {monthKindStats.total}
              </span>
            </p>
            {(
              [
                ["Member", monthKindStats.member, "bg-[#9b8cff]"],
                ["Solo", monthKindStats.solo, "bg-r-pri"],
                ["Collab", monthKindStats.collab, "bg-[#d4a574]"],
              ] as const
            ).map(([label, count, dot]) => (
              <span key={label} className={cn(R_CHIP_SOFT_CLASS, "gap-1.5 tabular-nums")}>
                <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
                <span className="sr-only sm:not-sr-only">{label}</span>
                {count}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-r-line p-px">
            {weekdayHeaders.map((label) => (
              <div
                key={label}
                className="bg-r-bg px-1 py-2 text-center text-xs tracking-[0.14em] text-r-text-3 uppercase sm:text-sm"
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
            const weekRowStart = iso === thisWeekSundayIso;
            const selected = selectedDate === iso;
            const inSelectedWeek = selectedWeekDays.includes(iso);
            const dayNum = parseISODate(iso).getDate();
            const visibleSlots = daySlots.slice(0, 2);
            const extraCount = Math.max(0, daySlots.length - visibleSlots.length);
            const crowded = daySlots.length > 1;

            return (
              <div
                key={iso}
                role="button"
                tabIndex={0}
                onClick={() => selectCalendarDay(iso)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectCalendarDay(iso);
                  }
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col items-stretch bg-r-bg text-left transition",
                  "aspect-square gap-0.5 overflow-hidden p-1",
                  "sm:aspect-auto sm:gap-1.5 sm:p-1.5 md:p-2",
                  crowded
                    ? "sm:h-[7.5rem] sm:overflow-hidden md:h-[8.5rem]"
                    : "sm:min-h-[7.5rem] md:min-h-[8.5rem]",
                  !inMonth && "*:opacity-40",
                  inSelectedWeek && "bg-[color-mix(in_srgb,var(--r-acc)_8%,var(--r-bg))]",
                  weekRowStart &&
                    "before:absolute before:inset-y-1.5 before:left-0 before:z-10 before:w-[3px] before:rounded-full before:bg-r-pri before:content-['']",
                  selected && "z-[1] ring-2 ring-inset ring-r-acc",
                  isToday && !selected && "z-[1] ring-2 ring-inset ring-r-pri/70",
                  "hover:bg-white/[0.04] focus-visible:z-[2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-r-acc"
                )}
              >
                {/* —— Mobile: day number + times (no badges) —— */}
                <div className="flex h-full min-h-0 flex-col sm:hidden">
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center self-start text-[0.7rem] tabular-nums",
                      isToday
                        ? "rounded-full bg-r-pri font-semibold text-r-on-pri"
                        : "text-r-text/85"
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
                            openDetail(slot);
                          }}
                        />
                      ))}
                      {extraCount > 0 ? (
                        <span className="pl-1 text-[0.5rem] leading-none text-r-text-3">
                          +{extraCount}
                        </span>
                      ) : null}
                    </div>
                  ) : showOfflineForDay(iso) ? (
                    <div className="mt-auto border-l-2 border-r-acc/70 py-px pl-1">
                      <span className="text-[0.5rem] tracking-[0.1em] text-r-acc uppercase">
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
                          ? "rounded-full bg-r-pri font-semibold text-r-on-pri"
                          : "text-r-text/85"
                      )}
                    >
                      {dayNum}
                    </span>
                    {daySlots.length > 0 ? (
                      <LiveDayChannelBadges
                        slots={daySlots}
                        size="sm"
                        tone="aplus"
                        compact
                        className="justify-start"
                      />
                    ) : null}
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
                            openDetail(slot);
                          }}
                        />
                      ))}
                      {extraCount > 0 ? (
                        <span className="shrink-0 pl-1 text-[0.55rem] text-r-text-3 sm:text-[0.62rem]">
                          +{extraCount} อีก
                        </span>
                      ) : null}
                    </div>
                  ) : showOfflineForDay(iso) ? (
                    <div className="flex w-full flex-col items-center pt-0.5">
                      <OfflineBadge size="sm" tone="aplus" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        <ul
          aria-label="สัญลักษณ์ในปฏิทิน"
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-r-text-3 sm:text-sm"
        >
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 shrink-0 rounded-full bg-r-pri" aria-hidden />
            Solo
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 shrink-0 rounded-full bg-[#d4a574]" aria-hidden />
            Collab
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 shrink-0 rounded-full bg-[#9b8cff]" aria-hidden />
            Member
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-0.5 shrink-0 rounded-full border-l border-dashed border-[#8a7f88]"
              aria-hidden
            />
            ยกเลิก
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-r-pri" aria-hidden />
            สัปดาห์นี้
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-4 shrink-0 rounded-[4px] bg-r-acc/20 ring-1 ring-r-acc/60 ring-inset"
              aria-hidden
            />
            สัปดาห์ที่เลือก
          </li>
        </ul>
      </section>

      {/* ── Selected week + Live Schedule poster from X ── */}
      <section
        id="weekly"
        aria-labelledby="weekly-title"
        className="scroll-mt-24 sm:scroll-mt-28"
      >
        <h2 id="weekly-title" className={R_H2_CLASS}>
          ตารางไลฟ์รายสัปดาห์
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-r-text-3 sm:text-base">
          เลือกวันจากปฏิทิน หรือเลื่อนชมตารางไลฟ์ในแต่ละสัปดาห์
        </p>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div ref={weekDetailRef} className={cn(R_CARD_CLASS, "min-w-0 overflow-hidden")}>
            {selectedDate ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-r-line px-4 py-4 sm:px-5">
                  <div>
                    <p
                      className={cn(
                        "text-xs sm:text-sm",
                        viewingThisWeek ? "text-r-text-3" : "text-r-acc"
                      )}
                    >
                      {viewingThisWeek ? "สัปดาห์นี้" : "สัปดาห์ที่เลือก"}
                    </p>
                    <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-normal text-r-text sm:text-xl">
                      {selectedWeekRangeLabel}
                    </p>
                    {selectedWeekSlotCount > 0 ? (
                      <p className="mt-1 text-xs text-r-text-3 sm:text-sm">
                        {selectedWeekSlotCount} ไลฟ์
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TimeZoneChip />
                    {!viewingThisWeek ? (
                      <button type="button" onClick={jumpToThisWeek} className={PILL_BTN}>
                        กลับไปสัปดาห์นี้
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="สัปดาห์ก่อนหน้า"
                      disabled={!canMoveWeek(-1)}
                      onClick={() => moveWeek(-1)}
                      className={NAV_BTN}
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="สัปดาห์ถัดไป"
                      disabled={!canMoveWeek(1)}
                      onClick={() => moveWeek(1)}
                      className={NAV_BTN}
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Phone / tablet: the poster is a small row above the list. */}
                <div className="border-b border-r-line px-4 py-3 sm:px-5 lg:hidden">
                  {renderPoster("row")}
                </div>

                <div className="divide-y divide-r-line">
                  {selectedWeekDays.map((iso) => {
                    const daySlots = preferOwnChannelSlots(
                      sortLiveSlotsForCalendar(byDate.get(iso) ?? [])
                    );
                    const date = parseISODate(iso);
                    const isFocus = iso === selectedDate;
                    const isToday = iso === todayIso;
                    const isFlash = iso === flashIso;

                    return (
                      <section
                        key={iso}
                        aria-label={formatLiveShortDate(iso)}
                        className={cn(
                          "px-4 py-4 transition-[background-color,box-shadow] duration-700 sm:px-5",
                          isFocus && "bg-r-acc/[0.05]",
                          isFlash && "bg-r-acc/[0.1] shadow-[inset_0_0_0_2px_var(--r-acc)]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectDay(iso)}
                          className="flex w-full cursor-pointer flex-wrap items-center gap-2 text-left"
                        >
                          <span
                            className={cn(
                              "inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-1 text-sm tabular-nums",
                              isToday
                                ? "bg-r-pri font-semibold text-r-on-pri"
                                : isFocus
                                  ? "bg-r-acc/15 text-r-text ring-1 ring-r-acc/50 ring-inset"
                                  : "text-r-text/85 ring-1 ring-r-text-2/15 ring-inset"
                            )}
                          >
                            {date.getDate()}
                          </span>
                          <span
                            className={cn(
                              "text-xs tracking-[0.14em] uppercase sm:text-sm",
                              isToday ? "text-r-pri" : "text-r-text-3"
                            )}
                          >
                            {englishWeekday(date)}
                          </span>
                          <span className="text-xs text-r-text-3 sm:text-sm">
                            {formatLiveShortDate(iso)}
                          </span>
                          {isToday ? (
                            <span className="inline-flex h-5 items-center rounded-full bg-r-pri px-2 text-[0.65rem] font-medium text-r-on-pri">
                              วันนี้
                            </span>
                          ) : null}
                          <LiveDayChannelBadges
                            slots={daySlots}
                            size="sm"
                            tone="aplus"
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
                                  openDetail(slot);
                                }}
                              />
                            ))}
                          </ul>
                        ) : showOfflineForDay(iso) ? (
                          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-r-acc/30 px-3 py-2.5">
                            <OfflineBadge size="sm" tone="aplus" />
                            <span className="text-xs text-r-text-3 sm:text-sm">
                              ไม่มีไลฟ์
                            </span>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-r-text-3/60">—</p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="px-4 py-8 text-sm text-r-text-3 sm:px-5">
                ยังไม่ได้เลือกวัน
              </p>
            )}
          </div>

          {/* Desktop: poster stays beside the list while scrolling. */}
          <aside aria-label="Live Schedule จาก X" className="hidden lg:sticky lg:top-24 lg:block">
            {renderPoster("aside")}
          </aside>
        </div>
      </section>

      <LiveDetailHost ref={detailRef} slots={allSlots} />
    </div>
  );
}
