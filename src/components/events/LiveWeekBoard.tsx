"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Clock, Play, Radio, Timer } from "lucide-react";

import { EcgLine } from "@/components/common/EcgLine";
import { RChip } from "@/components/common/RChip";
import { LiveDetailHost, useLiveDetail } from "@/components/events/LiveDetailHost";
import { LiveSlotTime, preferOwnChannelSlots } from "@/components/events/LiveSlotMeta";
import { FadeInImage } from "@/components/media/FadeInImage";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { useLiveWeekView } from "@/hooks/useLiveWeekView";
import { useNow } from "@/hooks/useNow";
import { parseISODate } from "@/lib/events";
import { getSlotCoverUrl } from "@/lib/live-cover";
import { englishWeekday, formatLiveDateRange, formatLiveShortDate } from "@/lib/live-date-format";
import { startCountdownLabel } from "@/lib/live-today";
import { R_CHIP_ACC_CLASS, R_CTA_OUTLINE_CLASS, R_CTA_PRIMARY_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { LiveSlot, LiveWeek, LiveWeekBanner } from "@/types/vtuber";

/* ── small pieces ─────────────────────────────────────────────────── */

const HEART_PATH =
  "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.2 4.3 2.4.8-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("block shrink-0 overflow-visible fill-current", className)}>
      <path d={HEART_PATH} />
    </svg>
  );
}

/** On-air chip — the white dot blinks twice as fast as the hero's. */
function LiveChip({ label = "LIVE" }: { label?: string }) {
  return (
    <RChip tone="live" className="font-medium">
      <span aria-hidden className="r-blink size-1.5 rounded-full bg-r-text [animation-duration:0.6s]" />
      {label}
    </RChip>
  );
}

/** Outline pill with an icon (date / time) */
function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[0.8125rem] whitespace-nowrap text-r-text/90 ring-1 ring-r-text-2/15 ring-inset [&_svg]:size-[13px]">
      {icon}
      {children}
    </span>
  );
}

const slotLabel = (slot: LiveSlot) => slot.titleLocal ?? slot.title;
const slotTime = (slot: LiveSlot) => slot.timeUpdated ?? slot.time;
/** "Wed 21 Oct" */
const dayMonthLabel = (iso: string) => `${englishWeekday(parseISODate(iso))} ${formatLiveShortDate(iso).replace(/^0/, "")}`;
/** "Wed 21" */
const dayLabel = (iso: string) => {
  const date = parseISODate(iso);
  return `${englishWeekday(date)} ${date.getDate()}`;
};

/**
 * 16:9 live cover. YouTube thumbnail when there is one, otherwise a pink placeholder
 * with the broadcast icon. `ecg` runs a white heartbeat along the bottom (today / on air).
 */
function LiveCover({
  slot,
  size,
  ecg = null,
  caption,
  dim = false,
  className,
}: {
  slot?: LiveSlot | null;
  size: "lg" | "sm";
  ecg?: "run" | "fast" | null;
  caption?: string;
  dim?: boolean;
  className?: string;
}) {
  const cover = slot ? getSlotCoverUrl(slot) : null;
  const cancelled = slot?.status === "cancelled";
  return (
    <div
      className={cn(
        "relative flex aspect-video flex-col items-center justify-center gap-1 overflow-hidden text-r-text",
        dim
          ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--r-pri)_10%,var(--r-bg)),color-mix(in_srgb,var(--r-pri)_18%,var(--r-bg)))]"
          : "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--r-pri)_18%,var(--r-bg)),color-mix(in_srgb,var(--r-pri)_34%,var(--r-bg)))]",
        size === "lg" ? "rounded-[18px]" : "rounded-xl",
        className
      )}
    >
      {cover ? (
        <>
          <FadeInImage
            src={cover}
            alt=""
            wrapClassName="absolute inset-0 block"
            className={cn(
              "absolute inset-0 size-full object-cover",
              (cancelled || dim) && "opacity-60 grayscale-[0.35]"
            )}
          />
          {ecg ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-r-bg/70 to-transparent" /> : null}
        </>
      ) : (
        <>
          <Radio aria-hidden className={cn("relative", size === "lg" ? "size-[34px]" : "size-[18px]")} strokeWidth={2} />
          {caption ? <span className="relative font-[family-name:var(--font-display)] text-xs tracking-[0.2em]">{caption}</span> : null}
        </>
      )}
      {ecg ? (
        <div className="absolute inset-x-0 bottom-[12%] opacity-85">
          <EcgLine mode="run" tone="white" fast={ecg === "fast"} opacity={0.9} className={size === "lg" ? "h-[34px]" : "h-[18px]"} />
        </div>
      ) : null}
    </div>
  );
}

/* ── spotlight (today) ───────────────────────────────────────────── */

const SPOTLIGHT_FRAME =
  "r-card grid grid-cols-1 items-center gap-4 rounded-3xl p-3 sm:p-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-[26px]";

function SpotlightText({ children }: { children: ReactNode }) {
  return <div className="px-1 pb-1.5 md:py-0 md:pr-2 md:pl-0">{children}</div>;
}

function SpotlightTitle({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <p
      className={cn(
        "mt-3 line-clamp-2 font-[family-name:var(--font-display)] text-xl leading-[1.35] md:text-2xl",
        muted ? "text-r-text-3" : "text-r-text"
      )}
    >
      {children}
    </p>
  );
}

function SlotSpotlight({
  slot,
  nowMs,
  ownChannelLabel,
  heading,
  onOpen,
}: {
  slot: LiveSlot;
  nowMs: number | null;
  ownChannelLabel: string;
  /** "next" = today is free, this is the next live after today */
  heading: "today" | "next";
  onOpen: () => void;
}) {
  const live = slot.status === "live";
  const upcoming = slot.status === "upcoming";
  const countdown = upcoming ? startCountdownLabel(slot, nowMs) : null;
  const channel = slot.isOwnChannel ? ownChannelLabel : slot.sourceTitle;

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`ดูรายละเอียด · ${slotLabel(slot)}`}
        className="block rounded-[18px] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-r-acc"
      >
        <LiveCover
          slot={slot}
          size="lg"
          caption={`${ownChannelLabel} LIVE`}
          ecg={live ? "fast" : heading === "today" && upcoming ? "run" : null}
        />
      </button>
      <SpotlightText>
        <div className="flex flex-wrap gap-2">
          {live ? (
            <LiveChip label="กำลังไลฟ์" />
          ) : heading === "next" ? (
            <RChip tone="pri">ไลฟ์ถัดไป</RChip>
          ) : (
            <RChip tone="pri">{slot.status === "ended" ? "ไลฟ์วันนี้ · จบแล้ว" : "ไลฟ์วันนี้"}</RChip>
          )}
          {countdown ? (
            <RChip>
              <Timer aria-hidden className="size-3" />
              {countdown}
            </RChip>
          ) : null}
          {channel ? <RChip>{channel}</RChip> : null}
          {slot.isMember ? <RChip>MEMBER</RChip> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill icon={<Calendar aria-hidden />}>{dayMonthLabel(slot.date)}</Pill>
          <Pill icon={<Clock aria-hidden />}>
            <span className="tabular-nums">{slotTime(slot)}</span>
          </Pill>
        </div>
        <SpotlightTitle>{slotLabel(slot)}</SpotlightTitle>
        <div className="mt-[18px] flex flex-wrap gap-3">
          {live && slot.url ? (
            <>
              <a href={slot.url} target="_blank" rel="noreferrer" className={R_CTA_PRIMARY_CLASS}>
                <span aria-hidden className="r-blink size-2 rounded-full bg-r-text [animation-duration:0.6s]" />
                ดูไลฟ์ตอนนี้
              </a>
              <button type="button" onClick={onOpen} className={R_CTA_OUTLINE_CLASS}>
                ดูรายละเอียด
              </button>
            </>
          ) : (
            <button type="button" onClick={onOpen} className={R_CTA_PRIMARY_CLASS}>
              <Play aria-hidden className="size-[13px] fill-current" />
              ดูรายละเอียด
            </button>
          )}
        </div>
      </SpotlightText>
    </>
  );
}

function BannerSpotlight({ banner }: { banner: LiveWeekBanner }) {
  const external = banner.linkUrl?.startsWith("http");
  return (
    <>
      {banner.imageUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-[18px]">
          <ProtectedImage
            src={banner.imageUrl}
            alt={banner.imageAlt ?? banner.title}
            wrapClassName="absolute inset-0 block"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      ) : (
        <LiveCover size="lg" caption="SPECIAL" />
      )}
      <SpotlightText>
        <span className={cn(R_CHIP_ACC_CLASS, "uppercase")}>{banner.badge ?? "Special"}</span>
        <SpotlightTitle>{banner.title}</SpotlightTitle>
        {banner.subtitle ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-r-text-2">{banner.subtitle}</p> : null}
        {banner.linkUrl ? (
          <div className="mt-[18px]">
            {external ? (
              <a href={banner.linkUrl} target="_blank" rel="noreferrer" className={R_CTA_PRIMARY_CLASS}>
                {banner.buttonLabel ?? "ดูรายละเอียด"}
              </a>
            ) : (
              <Link href={banner.linkUrl} className={R_CTA_PRIMARY_CLASS}>
                {banner.buttonLabel ?? "ดูรายละเอียด"}
              </Link>
            )}
          </div>
        ) : null}
      </SpotlightText>
    </>
  );
}

function OfflineSpotlight({ todayIso, offlineNote }: { todayIso: string; offlineNote?: string | null }) {
  return (
    <>
      <LiveCover size="lg" dim caption="OFFLINE" />
      <SpotlightText>
        <div className="flex flex-wrap gap-2">
          <RChip>วันนี้ไม่มีไลฟ์</RChip>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill icon={<Calendar aria-hidden />}>{dayMonthLabel(todayIso)}</Pill>
        </div>
        <SpotlightTitle muted>{offlineNote || "รอประกาศไลฟ์ถัดไปนะ"}</SpotlightTitle>
      </SpotlightText>
    </>
  );
}

/* ── week grid ───────────────────────────────────────────────────── */

/** Desktop column card (cover · time · title · status) */
function DayCard({ slot, today, ownChannelLabel, onOpen }: { slot: LiveSlot; today: boolean; ownChannelLabel: string; onOpen: () => void }) {
  const live = slot.status === "live";
  const showEcg = today && (live || slot.status === "upcoming");
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${slotTime(slot)} · ${slotLabel(slot)}`}
      className={cn(
        "group block w-full rounded-2xl p-2 text-left transition-[background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
        today
          ? "r-ring [--r-ring-fill:color-mix(in_srgb,var(--r-pri)_6%,var(--r-bg))]"
          : "r-card shadow-none ring-[1.5px] ring-r-text-2/15 hover:ring-r-pri/40"
      )}
    >
      <LiveCover slot={slot} size="sm" ecg={showEcg ? (live ? "fast" : "run") : null} />
      <SlotMeta slot={slot} ownChannelLabel={ownChannelLabel} className="mx-0.5 mt-2" />
      <p className="mx-0.5 mt-1 line-clamp-3 text-[0.78125rem] leading-[1.45] text-r-text/90">{slotLabel(slot)}</p>
      <SlotStatus slot={slot} className="mx-0.5 mt-1.5" />
    </button>
  );
}

/** Phone row card (thumb left · text right) */
function DayRow({ slot, today, ownChannelLabel, onOpen }: { slot: LiveSlot; today: boolean; ownChannelLabel: string; onOpen: () => void }) {
  const live = slot.status === "live";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
        today
          ? "r-ring [--r-ring-fill:color-mix(in_srgb,var(--r-pri)_6%,var(--r-bg))]"
          : "r-card shadow-none ring-[1.5px] ring-r-text-2/15"
      )}
    >
      <LiveCover
        slot={slot}
        size="sm"
        className="w-28 shrink-0"
        ecg={today && (live || slot.status === "upcoming") ? (live ? "fast" : "run") : null}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <SlotMeta slot={slot} ownChannelLabel={ownChannelLabel} />
          <SlotStatus slot={slot} />
        </span>
        <span className="mt-1 line-clamp-2 text-[0.84375rem] leading-[1.4] text-r-text/90">{slotLabel(slot)}</span>
      </span>
    </button>
  );
}

/** Collabs (and guest-channel lives) show the channel name — see the legend under the board. */
function channelChipLabel(slot: LiveSlot, ownChannelLabel: string): string | null {
  if (slot.isOwnChannel) return slot.kind === "collab" ? ownChannelLabel : null;
  return slot.sourceTitle ?? null;
}

/** Time (with reschedule strike-through) + member / channel chips */
function SlotMeta({ slot, ownChannelLabel, className }: { slot: LiveSlot; ownChannelLabel: string; className?: string }) {
  const channel = channelChipLabel(slot, ownChannelLabel);
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {slot.status === "live" ? (
        <LiveChip />
      ) : (
        <LiveSlotTime
          time={slot.time}
          timePrevious={slot.timePrevious ?? undefined}
          timeUpdated={slot.timeUpdated ?? undefined}
          className="font-[family-name:var(--font-display)] text-sm text-r-text-2"
          accentClassName="text-r-text"
        />
      )}
      {slot.isMember ? <RChip>MEMBER</RChip> : null}
      {channel ? <RChip className="max-w-full truncate">{channel}</RChip> : null}
    </span>
  );
}

function SlotStatus({ slot, className }: { slot: LiveSlot; className?: string }) {
  if (slot.status === "ended") return <RChip className={className}>จบแล้ว</RChip>;
  if (slot.status === "cancelled") return <RChip className={cn("line-through", className)}>ยกเลิก</RChip>;
  return null;
}

function EmptyDay({ offline, note, today = false, row = false }: { offline?: boolean; note?: string; today?: boolean; row?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-center text-[0.78125rem]",
        offline ? "border-r-acc/25 text-r-acc" : today ? "border-r-pri/40 text-r-text-2" : "border-r-text-2/15 text-r-text-3",
        row ? "min-h-11 px-3" : "min-h-[150px] flex-col px-2"
      )}
    >
      {offline ? (
        <Radio aria-hidden className="size-[18px] opacity-70" />
      ) : (
        <Calendar aria-hidden className="size-[18px] opacity-50" />
      )}
      <span>{offline ? note || "พักไลฟ์" : "ยังไม่มีตาราง"}</span>
    </div>
  );
}

function DayHeading({ iso, today }: { iso: string; today: boolean }) {
  return today ? (
    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-r-pri px-3 py-1 font-[family-name:var(--font-display)] text-[0.8125rem] tracking-[0.06em] text-r-text">
      วันนี้ · {dayLabel(iso)}
      <Heart className="size-3" />
    </p>
  ) : (
    <p className="mb-2 px-1 py-1 font-[family-name:var(--font-display)] text-[0.8125rem] tracking-[0.06em] text-r-text-3">
      {dayLabel(iso)}
    </p>
  );
}

const NAV_BUTTON =
  "r-card flex size-[38px] items-center justify-center rounded-full text-r-text-2 shadow-none ring-2 ring-r-text-2/15 transition-colors hover:text-r-text hover:ring-r-pri/45 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc";

/* ── board ───────────────────────────────────────────────────────── */

type LiveWeekBoardProps = {
  weeks: LiveWeek[];
  /** Clamp the week picker to the loaded schedule window. */
  weekRange?: { from: string; to: string };
  /** Shown on own-channel slots and the cover placeholder, e.g. "MILD-R". */
  ownChannelLabel: string;
  className?: string;
};

/**
 * Project R live schedule (CI A+): today's spotlight + 7-day week board.
 * Same data rules as `LiveWeekTable` (/live) via `useLiveWeekView`.
 */
export function LiveWeekBoard({ weeks, weekRange, ownChannelLabel, className }: LiveWeekBoardProps) {
  const nowMs = useNow(30_000);
  const view = useLiveWeekView({ weeks, weekRange });
  const { detailRef, openDetail } = useLiveDetail();
  const { week, currentWeek, todayIso, dayIsos } = view;

  if (!week) return <p className="text-sm text-r-text-3">ยังไม่มีตารางไลฟ์</p>;

  const spotlightSlot = view.highlightSlot ?? view.nextHighlightSlot;
  const todayOffline = view.currentOfflineByDate.get(todayIso);
  const daySlots = (iso: string) => preferOwnChannelSlots(view.slotsByDate.get(iso) ?? []);

  return (
    <div className={className}>
      {/* Spotlight stays on this calendar week (today) while the grid navigates. */}
      {currentWeek ? (
        <div className={SPOTLIGHT_FRAME}>
          {currentWeek.banner ? (
            <BannerSpotlight banner={currentWeek.banner} />
          ) : spotlightSlot ? (
            <SlotSpotlight
              slot={spotlightSlot}
              nowMs={nowMs}
              ownChannelLabel={ownChannelLabel}
              heading={view.highlightSlot ? "today" : "next"}
              onOpen={() => openDetail(spotlightSlot)}
            />
          ) : (
            <OfflineSpotlight todayIso={todayIso} offlineNote={todayOffline?.note} />
          )}
        </div>
      ) : null}

      <div className="mt-[30px] flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.78125rem] text-r-text-3">
            {week.label ?? (view.viewingCurrentWeek ? "สัปดาห์นี้" : "สัปดาห์อื่น")}
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-[1.1875rem] text-r-text md:text-[1.375rem]">
            {formatLiveDateRange(dayIsos[0] ?? week.weekStart, dayIsos[6] ?? week.weekStart)}
          </p>
        </div>
        {view.navigableWeeks.length > 1 ? (
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label="สัปดาห์ก่อนหน้า" disabled={!view.canPrev} onClick={view.prev} className={NAV_BUTTON}>
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button type="button" aria-label="สัปดาห์ถัดไป" disabled={!view.canNext} onClick={view.next} className={NAV_BUTTON}>
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* laptop + desktop: 7 columns */}
      <div className="-mx-2 mt-4 hidden overflow-x-auto px-2 py-1 lg:block">
        <div className="grid min-w-[56rem] grid-cols-7 items-start gap-3">
          {dayIsos.map((iso) => {
            const slots = daySlots(iso);
            const today = iso === todayIso;
            const offline = view.offlineByDate.get(iso);
            return (
              <div key={iso} className={cn("min-w-0", iso < todayIso && "opacity-[0.78]")}>
                <DayHeading iso={iso} today={today} />
                {slots.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {slots.map((slot) => (
                      <DayCard key={slot.id} slot={slot} today={today} ownChannelLabel={ownChannelLabel} onOpen={() => openDetail(slot)} />
                    ))}
                  </div>
                ) : (
                  <EmptyDay today={today} offline={Boolean(offline)} note={offline?.note} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* phones + tablets: one row per day */}
      <ul className="mt-4 flex flex-col gap-3.5 lg:hidden">
        {dayIsos.map((iso) => {
          const slots = daySlots(iso);
          const today = iso === todayIso;
          const offline = view.offlineByDate.get(iso);
          return (
            <li key={iso} className={cn("min-w-0", iso < todayIso && "opacity-[0.78]")}>
              <DayHeading iso={iso} today={today} />
              {slots.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {slots.map((slot) => (
                    <DayRow key={slot.id} slot={slot} today={today} ownChannelLabel={ownChannelLabel} onOpen={() => openDetail(slot)} />
                  ))}
                </div>
              ) : (
                <EmptyDay row today={today} offline={Boolean(offline)} note={offline?.note} />
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-[18px] flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs text-r-text-3">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="size-3 text-r-pri" /> วันนี้
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RChip>MEMBER</RChip> เฉพาะสมาชิก
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RChip>ชื่อช่อง</RChip> ไลฟ์ร่วม (collab)
        </span>
      </div>

      <LiveDetailHost ref={detailRef} slots={view.allSlots} />
    </div>
  );
}

/* ── loading / error (A+) ────────────────────────────────────────── */

export function LiveWeekBoardSkeleton() {
  const pulse = "animate-pulse rounded-2xl bg-white/[0.05]";
  return (
    <div aria-busy="true" aria-label="กำลังโหลดตารางไลฟ์">
      <div className={cn(SPOTLIGHT_FRAME, "min-h-48")}>
        <div className={cn(pulse, "aspect-video rounded-[18px]")} />
        <div className="space-y-3 px-1">
          <div className={cn(pulse, "h-5 w-40 rounded-full")} />
          <div className={cn(pulse, "h-7 w-3/4")} />
          <div className={cn(pulse, "h-12 w-40 rounded-full")} />
        </div>
      </div>
      <div className={cn(pulse, "mt-[30px] h-12 w-48")} />
      <div className="mt-4 grid gap-3 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={cn(pulse, "h-11 lg:h-[150px]")} />
        ))}
      </div>
    </div>
  );
}

export function LiveWeekBoardError({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="r-card rounded-3xl px-5 py-10 text-center sm:px-8">
      <p className="font-[family-name:var(--font-display)] text-lg text-r-text sm:text-xl">โหลดตารางไลฟ์ไม่สำเร็จ</p>
      {message ? <p className="mt-2 text-sm text-r-text-3">{message}</p> : null}
      <button type="button" onClick={onRetry} className={cn(R_CTA_OUTLINE_CLASS, "mt-5")}>
        ลองอีกครั้ง
      </button>
    </div>
  );
}
