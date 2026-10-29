"use client";
import { englishWeekday, formatLiveShortDate, formatLiveDate, formatLiveDateRange } from "@/lib/live-date-format";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Timer,
} from "lucide-react";

import { LiveCoverPlaceholder } from "@/components/events/LiveCoverPlaceholder";
import { LiveDetailHost, useLiveDetail } from "@/components/events/LiveDetailHost";
import {
  LiveCancelledBadge,
  LiveDayChannelBadges,
  LiveSlotTime,
  LiveSourceBadges,
  preferOwnChannelSlots,
} from "@/components/events/LiveSlotMeta";
import { OfflineBadge } from "@/components/events/OfflineBadge";
import { FadeInImage } from "@/components/media/FadeInImage";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { useLiveWeekView } from "@/hooks/useLiveWeekView";
import { useNow } from "@/hooks/useNow";
import { parseISODate } from "@/lib/events";
import { getSlotCoverUrl } from "@/lib/live-cover";
import { slotStartMs, startCountdownLabel } from "@/lib/live-today";
import {
  BADGE_ACCENT_CLASS,
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  R_CTA_OUTLINE_CLASS,
  R_CTA_PRIMARY_CLASS,
  LIVE_BADGE_CANCELLED,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_PILL_COMPACT,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type {
  LivePlatform,
  LiveSlot,
  LiveWeek,
  LiveWeekBanner,
} from "@/types/vtuber";

type LiveWeekTableProps = {
  weeks: LiveWeek[];
  className?: string;
  compact?: boolean;
  blankEmptyDays?: boolean;
  /** All slots for reschedule banner navigation (defaults to slots in `weeks`). */
  slotLookup?: LiveSlot[];
  /** Clamp week picker to the loaded schedule window (e.g. homepage 2-week range). */
  weekRange?: { from: string; to: string };
  /**
   * `legacy` is the /live palette.
   * `aplus` recolors the same table with the homepage CI (`--r-*`, `r-card`, `r-ring`).
   */
  tone?: "legacy" | "aplus";
};

type LiveTableSkin = {
  tone: "legacy" | "aplus";
  emptyMessage: string;
  slotMobileBase: string;
  slotDesktopBase: string;
  slotCancelled: string;
  slotGuest: string;
  slotLive: string;
  slotIdle: string;
  coverBg: string;
  coverShade: string;
  livePillSm: string;
  livePill: string;
  liveDot: string;
  clock: string;
  time: string;
  title: string;
  subtitle: string;
  subtitleSoft: string;
  timeBarCancelled: string;
  timeBarLive: string;
  timeBarIdle: string;
  offlineDay: string;
  emptyDay: string;
  blankDay: string;
  blankText: string;
  spotlight: string;
  statusLive: string;
  statusUpcoming: string;
  statusMuted: string;
  statusDotLive: string;
  statusDotUpcoming: string;
  statusDotMuted: string;
  statusDotIdleSm: string;
  countdown: string;
  metaPill: string;
  metaPillSm: string;
  metaIcon: string;
  ctaPrimary: string;
  ctaOutline: string;
  ctaPrimaryBlock: string;
  ctaOutlineBlock: string;
  thumb: string;
  thumbPlain: string;
  thumbShade: string;
  mobileCoverBg: string;
  mobileCoverShade: string;
  statusLiveSm: string;
  statusIdleSm: string;
  countdownSm: string;
  countdownSmBare: string;
  statusLiveBare: string;
  statusIdleBare: string;
  titleLg: string;
  titleMd: string;
  nextCard: string;
  nextThumb: string;
  nextKicker: string;
  nextMeta: string;
  nextTitle: string;
  offlineShellOn: string;
  offlineShellOff: string;
  offlineDateOn: string;
  offlineDateOff: string;
  offlineDateIconOn: string;
  offlineDateIconOff: string;
  offlineDateSmOn: string;
  offlineDateSmOff: string;
  offlineCoverOn: string;
  offlineCoverOff: string;
  offlineNote: string;
  banner: string;
  bannerBadge: string;
  bannerTitle: string;
  bannerSub: string;
  bannerThumb: string;
  bannerCoverBg: string;
  bannerCoverShade: string;
  bannerCta: string;
  bannerCtaBlock: string;
  weekKicker: string;
  weekRange: string;
  navButton: string;
  navCount: string;
  todayGlow: string;
  todayGlowMobile: string;
  dayRuleToday: string;
  dayRule: string;
  todayDot: string;
  dayNameToday: string;
  dayName: string;
  dayDateToday: string;
  dayDate: string;
  todayBadge: string;
  mobileDivide: string;
  mobileEmptyRuleBlank: string;
  mobileEmptyRule: string;
  mobileEmptyText: string;
  mobileEmptyNote: string;
};

const LEGACY_SKIN: LiveTableSkin = {
  tone: "legacy",
  emptyMessage: "text-sm text-[#f3b8c4]/70",
  slotMobileBase:
    "group flex h-[5.5rem] w-full items-stretch overflow-hidden rounded-2xl border bg-[#1a0c12]/70 text-left transition",
  slotDesktopBase:
    "group flex w-full flex-col overflow-hidden rounded-2xl border bg-[#1a0c12]/60 text-left transition",
  slotCancelled: "border-[#8a7f88]/30 opacity-80 hover:border-[#8a7f88]/50 hover:bg-[#8a7f88]/10",
  slotGuest: "border-[#d4a574]/35 hover:border-[#d4a574]/55 hover:bg-[#d4a574]/10",
  slotLive:
    "border-[#e85a7a]/60 shadow-[0_0_16px_rgba(232,90,122,0.18)] hover:border-[#e85a7a] hover:bg-[#1f0d16]",
  slotIdle: "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]",
  coverBg: "bg-[#10070b]",
  coverShade: "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/80 via-transparent to-transparent",
  livePillSm:
    "inline-flex items-center gap-1 rounded-md bg-[#e85a7a] px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-white uppercase shadow-[0_0_8px_rgba(232,90,122,0.6)]",
  livePill:
    "inline-flex items-center gap-1 rounded-md bg-[#e85a7a] px-2 py-0.5 text-[0.68rem] font-bold tracking-wider text-white uppercase shadow-[0_0_8px_rgba(232,90,122,0.6)]",
  liveDot: "size-1.5 animate-ping rounded-full bg-white",
  clock: "text-[#e85a7a]",
  time: "text-[#fff5f7]",
  title: "text-[#fff5f7]",
  subtitle: "text-[#f3b8c4]/60",
  subtitleSoft: "text-[#f3b8c4]/65",
  timeBarCancelled: "border-[#8a7f88]/20 bg-[#160a0f]/90",
  timeBarLive: "border-[#e85a7a]/40 bg-[#e85a7a]/20",
  timeBarIdle: "border-[#f3b8c4]/10 bg-[#14080e]/95 group-hover:bg-[#180912]",
  offlineDay: "border border-dashed border-[#6ec9b0]/25 bg-[#6ec9b0]/05",
  emptyDay: "border-[#6ec9b0]/25 bg-[#6ec9b0]/05",
  blankDay: "border-[#8a7f88]/30 bg-transparent",
  blankText: "text-[#f3b8c4]/50",
  spotlight:
    "relative overflow-hidden rounded-3xl border border-[#e85a7a]/35 bg-gradient-to-r from-[#220e18]/95 via-[#1a0c12]/90 to-[#140a0d] shadow-[0_16px_40px_rgba(232,90,122,0.16)]",
  statusLive:
    "inline-flex items-center gap-1.5 rounded-full border border-[#e85a7a] bg-[#e85a7a] px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase shadow-sm shadow-[0_0_16px_rgba(232,90,122,0.6)]",
  statusUpcoming:
    "inline-flex items-center gap-1.5 rounded-full border border-[#e85a7a]/60 bg-[#e85a7a]/20 px-3 py-1 text-xs font-semibold tracking-wide text-[#fff5f7] uppercase shadow-sm",
  statusMuted:
    "inline-flex items-center gap-1.5 rounded-full border border-[#f3b8c4]/30 bg-[#f3b8c4]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[#f7d7de] uppercase shadow-sm",
  statusDotLive: "size-2 animate-ping rounded-full bg-white",
  statusDotUpcoming: "size-2 animate-pulse rounded-full bg-[#e85a7a]",
  statusDotMuted: "size-2 rounded-full bg-[#f3b8c4]/80",
  statusDotIdleSm: "size-1.5 rounded-full bg-[#e85a7a]",
  countdown:
    "inline-flex items-center gap-1.5 rounded-full border border-[#e85a7a]/60 bg-[#e85a7a]/25 px-3 py-1 text-xs font-bold text-[#fff5f7] shadow-[0_0_16px_rgba(232,90,122,0.35)]",
  metaPill:
    "inline-flex items-center gap-1.5 rounded-xl border border-[#f3b8c4]/15 bg-[#14080e]/90 px-3 py-1.5 text-[#fff5f7] shadow-inner",
  metaPillSm:
    "inline-flex items-center gap-1 rounded-lg border border-[#f3b8c4]/15 bg-[#14080e]/90 px-2.5 py-1 text-[#fff5f7]",
  metaIcon: "text-[#e85a7a]",
  ctaPrimary: cn(
    buttonVariants({ size: "sm" }),
    CTA_PRIMARY_CLASS,
    "inline-flex items-center gap-1.5 shadow-md"
  ),
  ctaOutline: cn(buttonVariants({ variant: "outline", size: "sm" }), CTA_OUTLINE_CLASS),
  ctaPrimaryBlock: cn(
    buttonVariants({ size: "sm" }),
    CTA_PRIMARY_CLASS,
    "flex w-full items-center justify-center gap-1.5"
  ),
  ctaOutlineBlock: cn(buttonVariants({ variant: "outline", size: "sm" }), CTA_OUTLINE_CLASS, "w-full text-xs"),
  thumb:
    "group relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/20 bg-[#12080c] text-left transition hover:border-[#e85a7a]/50 lg:w-80",
  thumbPlain:
    "relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/20 bg-[#12080c] text-left transition hover:border-[#e85a7a]/50 lg:w-80",
  thumbShade: "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/70 via-transparent to-transparent",
  mobileCoverBg: "relative aspect-[16/9] w-full overflow-hidden bg-[#12080c] text-left",
  mobileCoverShade: "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a0c12] to-transparent",
  statusLiveSm:
    "inline-flex items-center gap-1 rounded-full border border-[#e85a7a] bg-[#e85a7a] px-2.5 py-0.5 text-[0.68rem] font-bold text-white uppercase shadow-sm shadow-[0_0_12px_rgba(232,90,122,0.6)] backdrop-blur-md",
  statusIdleSm:
    "inline-flex items-center gap-1 rounded-full border border-[#e85a7a]/60 bg-[#140a0d]/85 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#fff5f7] uppercase shadow-sm backdrop-blur-md",
  countdownSm:
    "inline-flex items-center gap-1 rounded-full border border-[#e85a7a]/60 bg-[#140a0d]/85 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#fff5f7] shadow-sm backdrop-blur-md",
  countdownSmBare:
    "inline-flex items-center gap-1 rounded-full border border-[#e85a7a]/60 bg-[#e85a7a]/25 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#fff5f7] shadow-sm",
  statusLiveBare:
    "inline-flex items-center gap-1 rounded-full border border-[#e85a7a] bg-[#e85a7a] px-2.5 py-0.5 text-[0.68rem] font-bold text-white uppercase",
  statusIdleBare:
    "inline-flex items-center gap-1 rounded-full border border-[#e85a7a]/60 bg-[#e85a7a]/20 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#fff5f7] uppercase",
  titleLg:
    "mt-3.5 line-clamp-2 font-[family-name:var(--font-display)] text-xl font-normal leading-snug tracking-normal text-[#fff5f7] sm:text-2xl",
  titleMd:
    "mt-2.5 line-clamp-2 font-[family-name:var(--font-display)] text-lg font-normal leading-snug tracking-normal text-[#fff5f7]",
  nextCard:
    "group flex w-full items-center gap-3 rounded-2xl border border-[#f3b8c4]/20 bg-[#14080e]/90 p-2.5 text-left transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12] sm:w-auto sm:min-w-[18rem]",
  nextThumb: "relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl border border-[#f3b8c4]/15 bg-[#12080c] sm:w-24",
  nextKicker: "block text-[0.65rem] font-semibold tracking-[0.12em] text-[#e85a7a] uppercase",
  nextMeta: "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#f7d7de]/90",
  nextTitle: "line-clamp-1 text-sm font-medium text-[#fff5f7] group-hover:text-white",
  offlineShellOn: "border-[#6ec9b0]/25 bg-[#6ec9b0]/05",
  offlineShellOff: "border-[#8a7f88]/30 bg-transparent",
  offlineDateOn: "border-[#6ec9b0]/25 bg-[#6ec9b0]/05 text-[#a8e6d4]",
  offlineDateOff: "border-[#f3b8c4]/15 bg-[#14080e]/90 text-[#fff5f7]",
  offlineDateIconOn: "text-[#6ec9b0]",
  offlineDateIconOff: "text-[#e85a7a]",
  offlineDateSmOn: "border-[#6ec9b0]/25 bg-[#6ec9b0]/05 text-[#a8e6d4]",
  offlineDateSmOff: "border-[#f3b8c4]/15 bg-[#14080e]/90 text-[#fff5f7]",
  offlineCoverOn: "border-[#6ec9b0]/25",
  offlineCoverOff: "border-[#8a7f88]/30",
  offlineNote: "text-sm text-[#f3b8c4]/50",
  banner:
    "overflow-hidden rounded-3xl border border-[#e85a7a]/30 bg-gradient-to-r from-[#220e18]/90 via-[#1a0c12]/80 to-[#140a0d] shadow-[0_12px_32px_rgba(232,90,122,0.12)]",
  bannerBadge: cn(BADGE_ACCENT_CLASS, "uppercase tracking-wider"),
  bannerTitle:
    "font-[family-name:var(--font-display)] font-normal leading-snug tracking-normal text-[#fff5f7]",
  bannerSub: "text-[#f7d7de]/80",
  bannerThumb: "relative aspect-[16/9] w-56 shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#12080c] lg:w-72",
  bannerCoverBg: "relative aspect-[16/9] w-full overflow-hidden bg-[#12080c]",
  bannerCoverShade: "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a0c12] to-transparent",
  bannerCta: cn(buttonVariants({ size: "sm" }), CTA_PRIMARY_CLASS, "inline-flex items-center gap-1.5"),
  bannerCtaBlock: cn(
    buttonVariants({ size: "sm" }),
    CTA_PRIMARY_CLASS,
    "mt-3.5 flex w-full items-center justify-center gap-1.5"
  ),
  weekKicker: META_MUTED_CLASS,
  weekRange:
    "mt-1 font-[family-name:var(--font-display)] text-lg font-normal text-[#fff5f7] sm:text-xl",
  navButton: cn(buttonVariants({ variant: "outline", size: "icon" }), CTA_OUTLINE_CLASS, "size-9 disabled:opacity-35"),
  navCount: "min-w-[4.5rem] text-center text-xs tabular-nums text-[#f3b8c4]/70 sm:text-sm",
  todayGlow:
    "pointer-events-none absolute -inset-1.5 rounded-2xl border-2 border-[#e85a7a]/60 bg-[#e85a7a]/08 shadow-[0_0_24px_rgba(232,90,122,0.22)]",
  todayGlowMobile:
    "pointer-events-none absolute -inset-x-2 -inset-y-1.5 rounded-2xl border-2 border-[#e85a7a]/60 bg-[#e85a7a]/08 shadow-[0_0_24px_rgba(232,90,122,0.18)]",
  dayRuleToday: "border-[#e85a7a]/40",
  dayRule: "border-[#f3b8c4]/15",
  todayDot: "size-1.5 animate-ping rounded-full bg-[#e85a7a]",
  dayNameToday: "font-bold text-[#fff5f7]",
  dayName: "text-[#f3b8c4]/65",
  dayDateToday:
    "inline-flex items-center justify-center rounded-full border border-[#e85a7a]/50 bg-[#e85a7a]/25 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#fff5f7] shadow-sm sm:text-sm",
  dayDate:
    "inline-flex items-center justify-center px-2 py-0.5 text-xs tabular-nums text-[#f7d7de]/80 sm:text-sm",
  todayBadge: cn(BADGE_ACCENT_CLASS, "px-2 py-0.5 text-[0.65rem] font-bold uppercase shadow-sm"),
  mobileDivide: "divide-[#f3b8c4]/10",
  mobileEmptyRuleBlank: "border-[#8a7f88]/40",
  mobileEmptyRule: "border-[#6ec9b0]/40",
  mobileEmptyText: "text-xs text-[#f3b8c4]/50",
  mobileEmptyNote: "text-xs text-[#a8e6d4]/75",
};

const APLUS_SKIN: LiveTableSkin = {
  tone: "aplus",
  emptyMessage: "text-sm text-r-text-3",
  slotMobileBase:
    "group flex h-[5.5rem] w-full items-stretch overflow-hidden rounded-2xl border r-card text-left transition",
  slotDesktopBase:
    "group flex w-full flex-col overflow-hidden rounded-2xl border r-card text-left transition",
  slotCancelled: "border-[#8a7f88]/40 opacity-80",
  slotGuest: "border-[#d4a574]/50 hover:border-[#d4a574]/75",
  slotLive: "border-r-pri hover:bg-r-pri/10",
  slotIdle: "border-transparent hover:border-r-pri/45",
  coverBg: "bg-r-bg",
  coverShade: "pointer-events-none absolute inset-0 bg-gradient-to-t from-r-bg/80 via-transparent to-transparent",
  livePillSm:
    "inline-flex items-center gap-1 rounded-full bg-r-pri px-1.5 py-0.5 text-[0.65rem] font-medium text-r-on-pri",
  livePill:
    "inline-flex items-center gap-1 rounded-full bg-r-pri px-2 py-0.5 text-[0.68rem] font-medium text-r-on-pri",
  liveDot: "r-blink size-1.5 rounded-full bg-r-text [animation-duration:0.6s]",
  clock: "text-r-pri",
  time: "text-r-text",
  title: "text-r-text",
  subtitle: "text-r-text-3",
  subtitleSoft: "text-r-text-3",
  timeBarCancelled: "border-white/10 bg-white/[0.04]",
  timeBarLive: "border-r-pri/35 bg-r-pri/12",
  timeBarIdle: "border-r-line bg-white/[0.04]",
  offlineDay: "border-2 border-dashed border-r-acc/30",
  emptyDay: "border-r-acc/30",
  blankDay: "border-r-text-2/25 bg-transparent",
  blankText: "text-r-text-3",
  spotlight: "r-card relative overflow-hidden rounded-3xl",
  statusLive:
    "inline-flex items-center gap-1.5 rounded-full bg-r-pri px-3 py-1 text-xs font-medium text-r-on-pri",
  statusUpcoming:
    "inline-flex items-center gap-1.5 rounded-full bg-r-pri/14 px-3 py-1 text-xs font-medium text-r-text ring-1 ring-r-pri/40 ring-inset",
  statusMuted:
    "inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-r-text-2 ring-1 ring-r-line ring-inset",
  statusDotLive: "r-blink size-1.5 rounded-full bg-r-text [animation-duration:0.6s]",
  statusDotUpcoming: "size-1.5 rounded-full bg-r-pri",
  statusDotMuted: "size-1.5 rounded-full bg-r-text-2",
  statusDotIdleSm: "size-1.5 rounded-full bg-r-pri",
  countdown:
    "inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-r-text-2 ring-1 ring-r-line ring-inset",
  metaPill:
    "inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[0.8125rem] text-r-text/90 ring-1 ring-r-text-2/15 ring-inset",
  metaPillSm:
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-r-text/90 ring-1 ring-r-text-2/15 ring-inset",
  metaIcon: "text-r-pri",
  ctaPrimary: R_CTA_PRIMARY_CLASS,
  ctaOutline: R_CTA_OUTLINE_CLASS,
  ctaPrimaryBlock: cn(R_CTA_PRIMARY_CLASS, "w-full"),
  ctaOutlineBlock: cn(R_CTA_OUTLINE_CLASS, "w-full"),
  // 370px wide = 208px tall: a 2-line title fits beside it, so every state is 256px on desktop.
  thumb:
    "group relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-[18px] bg-r-bg text-left ring-1 ring-r-line transition hover:ring-r-pri/50 lg:w-[370px]",
  thumbPlain:
    "relative aspect-[16/9] w-64 shrink-0 overflow-hidden rounded-[18px] bg-r-bg text-left ring-1 ring-r-line transition hover:ring-r-pri/50 lg:w-[370px]",
  thumbShade: "pointer-events-none absolute inset-0 bg-gradient-to-t from-r-bg/70 via-transparent to-transparent",
  mobileCoverBg: "relative aspect-[16/9] w-full overflow-hidden bg-r-bg text-left",
  mobileCoverShade: "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-r-bg to-transparent",
  statusLiveSm:
    "inline-flex items-center gap-1 rounded-full bg-r-pri px-2.5 py-0.5 text-[0.68rem] font-medium text-r-on-pri",
  statusIdleSm:
    "inline-flex items-center gap-1 rounded-full bg-r-bg/85 px-2.5 py-0.5 text-[0.68rem] font-medium text-r-text ring-1 ring-r-pri/40 ring-inset",
  countdownSm:
    "inline-flex items-center gap-1 rounded-full bg-r-bg/85 px-2.5 py-0.5 text-[0.68rem] text-r-text ring-1 ring-r-line ring-inset",
  countdownSmBare:
    "inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[0.68rem] text-r-text-2 ring-1 ring-r-line ring-inset",
  statusLiveBare:
    "inline-flex items-center gap-1 rounded-full bg-r-pri px-2.5 py-0.5 text-[0.68rem] font-medium text-r-on-pri",
  statusIdleBare:
    "inline-flex items-center gap-1 rounded-full bg-r-pri/14 px-2.5 py-0.5 text-[0.68rem] font-medium text-r-text ring-1 ring-r-pri/40 ring-inset",
  titleLg:
    "mt-3.5 line-clamp-2 font-[family-name:var(--font-display)] text-xl font-normal leading-snug tracking-normal text-r-text sm:text-2xl",
  titleMd:
    "mt-2.5 line-clamp-2 font-[family-name:var(--font-display)] text-lg font-normal leading-snug tracking-normal text-r-text",
  nextCard:
    "group r-card flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ring-1 ring-r-text-2/15 transition hover:ring-r-pri/45 sm:w-auto sm:min-w-[18rem]",
  nextThumb: "relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl bg-r-bg ring-1 ring-r-line sm:w-24",
  nextKicker: "block text-[0.65rem] font-medium tracking-[0.12em] text-r-pri uppercase",
  nextMeta: "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-r-text-2",
  nextTitle: "line-clamp-1 text-sm font-medium text-r-text",
  offlineShellOn: "border-r-acc/30 bg-r-acc/[0.05]",
  offlineShellOff: "border-r-text-2/25 bg-transparent",
  offlineDateOn: "border-transparent bg-r-acc/10 text-r-acc",
  offlineDateOff: "border-transparent text-r-text ring-1 ring-r-text-2/15 ring-inset",
  offlineDateIconOn: "text-r-acc",
  offlineDateIconOff: "text-r-pri",
  offlineDateSmOn: "border-transparent bg-r-acc/10 text-r-acc",
  offlineDateSmOff: "border-transparent text-r-text ring-1 ring-r-text-2/15 ring-inset",
  offlineCoverOn: "border-r-acc/30",
  offlineCoverOff: "border-r-text-2/25",
  offlineNote: "text-sm text-r-text-3",
  banner: "r-card overflow-hidden rounded-3xl",
  bannerBadge:
    "inline-flex items-center gap-1.5 rounded-full bg-r-acc px-2.5 py-1 text-xs font-medium tracking-wide text-r-on-acc uppercase",
  bannerTitle: "font-[family-name:var(--font-display)] font-normal leading-snug tracking-normal text-r-text",
  bannerSub: "text-r-text-2",
  bannerThumb: "relative aspect-[16/9] w-56 shrink-0 overflow-hidden rounded-2xl bg-r-bg ring-1 ring-r-line lg:w-72",
  bannerCoverBg: "relative aspect-[16/9] w-full overflow-hidden bg-r-bg",
  bannerCoverShade: "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-r-bg to-transparent",
  bannerCta: R_CTA_PRIMARY_CLASS,
  bannerCtaBlock: cn(R_CTA_PRIMARY_CLASS, "mt-3.5 w-full"),
  weekKicker: "text-[0.78125rem] text-r-text-3",
  weekRange: "mt-0.5 font-[family-name:var(--font-display)] text-[1.1875rem] text-r-text md:text-[1.375rem]",
  navButton:
    "r-card flex size-[38px] items-center justify-center rounded-full text-r-text-2 shadow-none ring-2 ring-r-text-2/15 transition-colors hover:text-r-text hover:ring-r-pri/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc disabled:pointer-events-none disabled:opacity-35",
  navCount: "min-w-[4.5rem] text-center text-xs tabular-nums text-r-text-3 sm:text-sm",
  todayGlow: "pointer-events-none absolute -inset-1.5 rounded-2xl r-ring",
  todayGlowMobile: "pointer-events-none absolute -inset-x-2 -inset-y-1.5 rounded-2xl r-ring",
  dayRuleToday: "border-r-pri/40",
  dayRule: "border-r-line",
  todayDot: "r-ping size-1.5 rounded-full bg-r-pri",
  dayNameToday: "font-medium text-r-text",
  dayName: "text-r-text-3",
  dayDateToday:
    "inline-flex items-center justify-center rounded-full bg-r-pri px-2.5 py-0.5 text-xs font-medium tabular-nums text-r-on-pri sm:text-sm",
  dayDate: "inline-flex items-center justify-center px-2 py-0.5 text-xs tabular-nums text-r-text-2 sm:text-sm",
  todayBadge: "inline-flex items-center rounded-full bg-r-pri px-2 py-0.5 text-[0.65rem] font-medium text-r-on-pri",
  mobileDivide: "divide-r-line",
  mobileEmptyRuleBlank: "border-r-text-2/30",
  mobileEmptyRule: "border-r-acc/40",
  mobileEmptyText: "text-xs text-r-text-3",
  mobileEmptyNote: "text-xs text-r-acc/80",
};

const LiveTableSkinContext = createContext<LiveTableSkin>(LEGACY_SKIN);

function useLiveTableSkin() {
  return useContext(LiveTableSkinContext);
}

function slotStateClass(
  skin: LiveTableSkin,
  state: { cancelled: boolean; guest: boolean; live: boolean }
) {
  if (state.cancelled) return skin.slotCancelled;
  if (state.guest) return skin.slotGuest;
  if (state.live) return skin.slotLive;
  return skin.slotIdle;
}

function clockClass(
  skin: LiveTableSkin,
  state: { cancelled: boolean; member: boolean; guest: boolean }
) {
  if (state.cancelled) return "text-[#8a7f88]";
  if (state.member) return "text-[#9b8cff]";
  if (state.guest) return "text-[#d4a574]";
  return skin.clock;
}

function timeClass(
  skin: LiveTableSkin,
  state: { cancelled: boolean; member: boolean; guest: boolean }
) {
  if (state.cancelled) return "text-[#d8d0d4]";
  if (state.member) return "text-[#cfc6ff]";
  if (state.guest) return "text-[#f3d9be]";
  return skin.time;
}

/** Live, then upcoming, then the latest ended slot on one day. */
function spotlightSlotForDay(slots: LiveSlot[]): LiveSlot | null {
  const open = slots.filter((slot) => slot.status !== "cancelled");
  const pool = open.length > 0 ? open : slots;
  return (
    pool.find((slot) => slot.status === "live") ??
    pool.find((slot) => slot.status === "upcoming") ??
    [...pool].reverse().find((slot) => slot.status === "ended") ??
    pool[0] ??
    null
  );
}

function nextLiveAfter(
  slots: LiveSlot[],
  iso: string,
  { includeEnded = false }: { includeEnded?: boolean } = {}
): LiveSlot | null {
  return (
    slots
      .filter(
        (slot) =>
          slot.date > iso &&
          slot.status !== "cancelled" &&
          (slot.status === "upcoming" ||
            slot.status === "live" ||
            (includeEnded && slot.status === "ended"))
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0] ?? null
  );
}

function platformLabel(platform?: LivePlatform) {
  if (platform === "youtube") return "YouTube";
  if (platform === "x") return "X";
  if (platform === "other") return "Other";
  return null;
}

function MobileSlotCard({
  slot,
  onOpen,
}: {
  slot: LiveSlot;
  onOpen: () => void;
}) {
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  const isMember = Boolean(slot.isMember);
  const guestTone = !own && collab && !cancelled;
  const label = slot.titleLocal ?? slot.title;
  const coverUrl = getSlotCoverUrl(slot);
  const isLive = slot.status === "live";
  const hasBadges = cancelled || collab || isMember;
  const skin = useLiveTableSkin();
  const toneState = { cancelled, member: isMember, guest: guestTone };

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${slot.timeUpdated ?? slot.time} · ${label}`}
      className={cn(skin.slotMobileBase, slotStateClass(skin, { cancelled, guest: guestTone, live: isLive }))}
    >
      {/* 🖼️ Left: Thumbnail Image (Fixed Width + Full Height) */}
      <div className={cn("relative h-full w-28 shrink-0 overflow-hidden xs:w-32", skin.coverBg)}>
        {coverUrl ? (
          <>
            <FadeInImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className={cn(
                "absolute inset-0 h-full w-full scale-[1.25] object-cover object-center transition duration-500 group-hover:scale-[1.3]",
                cancelled && "opacity-60 grayscale-[0.35]"
              )}
            />
            <div className={skin.coverShade} />
          </>
        ) : (
          <LiveCoverPlaceholder
            className="relative"
            size="sm"
            variant={cancelled ? "cancelled" : "default"}
          />
        )}

      </div>

      {/* 📝 Right: Content Details (Strict 2-Line Clamp with ellipsis '...') */}
      <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden p-2.5 sm:p-3">
        {/* Time Bar */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isLive ? (
            <span className={skin.livePillSm}>
              <span className={skin.liveDot} />
              LIVE NOW
            </span>
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <Clock className={cn("size-3 shrink-0", clockClass(skin, toneState))} />
              <LiveSlotTime
                time={slot.time}
                timePrevious={slot.timePrevious ?? undefined}
                timeUpdated={slot.timeUpdated ?? undefined}
                className="text-xs font-bold tabular-nums"
                accentClassName={timeClass(skin, toneState)}
              />
            </div>
          )}
        {/* Status badge follows the time on mobile. */}
        {hasBadges ? (
          <div className="flex shrink-0 items-center gap-1">
            {cancelled ? (
              <span
                className={cn(
                  LIVE_BADGE_PILL_COMPACT,
                  LIVE_BADGE_CANCELLED,
                  "h-4 bg-[#140a0d]/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
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
                      "h-4 bg-[#140a0d]/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
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
                      "h-4 bg-[#140a0d]/85 px-1.5 text-[0.6rem] shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md"
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

        {/* Title: บังคับตัดบรรทัดด้วย line-clamp-2 (เกินใส่ ...) */}
        <p className={cn("line-clamp-2 min-w-0 text-[0.8rem] font-medium leading-snug", skin.title)}>
          {label}
        </p>
      </div>
    </button>
  );
}

function SlotCard({
  slot,
  compact,
  crowded,
  onOpen,
}: {
  slot: LiveSlot;
  compact?: boolean;
  /** Day has more than one live — lock height + truncate titles */
  crowded?: boolean;
  onOpen: () => void;
}) {
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  const isMember = Boolean(slot.isMember);
  // Own channel always rose; guests keep copper accent when collab/other
  const guestTone = !own && collab && !cancelled;
  const label = slot.titleLocal ?? slot.title;
  const coverUrl = getSlotCoverUrl(slot);
  const isLive = slot.status === "live";

  const hasBadges = cancelled || collab || isMember;
  const skin = useLiveTableSkin();
  const toneState = { cancelled, member: isMember, guest: guestTone };

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${slot.timePrevious ? `${slot.timePrevious}→` : ""}${slot.timeUpdated ?? slot.time} · ${label}`}
      className={cn(
        skin.slotDesktopBase,
        crowded
          ? cn(
              "h-full min-h-0",
              compact ? "max-h-[12rem]" : "max-h-[15rem] sm:max-h-[16rem]"
            )
          : cn(
              "h-full",
              compact ? "min-h-[6.5rem]" : "min-h-[8.5rem] sm:min-h-[9.5rem]"
            ),
        slotStateClass(skin, { cancelled, guest: guestTone, live: isLive })
      )}
    >
      {/* 🖼️ 1. Image Header (With Cover or Placeholder) */}
      <div className={cn("relative aspect-[16/10] w-full shrink-0 overflow-hidden", skin.coverBg)}>
        {coverUrl ? (
          <>
            <FadeInImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
          className={cn(
                "absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.04]",
                cancelled && "opacity-60 grayscale-[0.35]"
              )}
            />
            <div className={skin.coverShade} />
          </>
        ) : (
          <LiveCoverPlaceholder
            className="relative h-full w-full"
            size="md"
            variant={cancelled ? "cancelled" : "default"}
          />
        )}

        <LiveSourceBadges
          isOwnChannel={own}
          sourceTitle={slot.sourceTitle}
          showCollab={false}
          showMember={false}
          compactChannel
          tone={skin.tone}
          className="absolute bottom-1.5 right-1.5 max-w-[calc(100%-0.75rem)] rounded-full bg-[#140a0d]/85 shadow-md backdrop-blur-md [&>span]:truncate"
        />
      </div>

      {/* 🕒 2. Hero Time Highlight Bar (คั่นกลางชัดเจน โล่ง โปร่ง เด่นชัด) */}
      <div
        className={cn(
          "flex min-w-0 items-center justify-between gap-1 border-y px-2.5 py-1.5 transition sm:px-3",
          cancelled
            ? skin.timeBarCancelled
            : isLive
              ? skin.timeBarLive
              : skin.timeBarIdle
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {isLive ? (
            <span className={skin.livePill}>
              <span className={skin.liveDot} />
              LIVE
            </span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className={cn("size-3.5 shrink-0", clockClass(skin, toneState))} />
              <LiveSlotTime
                time={slot.time}
                timePrevious={slot.timePrevious ?? undefined}
                timeUpdated={slot.timeUpdated ?? undefined}
                className="text-xs font-bold tabular-nums sm:text-[0.84rem]"
                accentClassName={timeClass(skin, toneState)}
              />
      </div>
          )}
        </div>
        {hasBadges ? (
          <div className="flex shrink-0 items-center justify-end gap-1">
            {cancelled ? (
              <span
                className={cn(
                  LIVE_BADGE_PILL_COMPACT,
                  LIVE_BADGE_CANCELLED,
                  "shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md bg-[#140a0d]/85"
                )}
              >
                ยกเลิก
              </span>
            ) : (
              <>
                {slot.isMember ? (
                  <span
                    className={cn(
                      LIVE_BADGE_PILL_COMPACT,
                      LIVE_BADGE_MEMBER,
                      "shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md bg-[#140a0d]/85"
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
                      "shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md bg-[#140a0d]/85"
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

      {/* 📝 3. Title Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-2.5">
      <p
        className={cn(
            "min-w-0 font-medium",
            skin.title,
            compact
              ? "line-clamp-2 text-[0.72rem] leading-tight"
              : "text-[0.8rem] leading-snug sm:text-[0.84rem]",
            skin.tone === "aplus" || crowded ? "line-clamp-2" : "line-clamp-3"
          )}
        >
          {label}
        </p>
        {slot.titleLocal && !compact && (skin.tone === "aplus" || !crowded) ? (
          <p className={cn("mt-0.5 line-clamp-1 text-[0.68rem]", skin.subtitle)}>
            {slot.title}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function OfflineDaySlot({ compact }: { compact?: boolean }) {
  const skin = useLiveTableSkin();
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        skin.offlineDay,
        compact ? "min-h-[5.75rem] rounded-xl" : "min-h-[9.5rem] rounded-2xl"
      )}
    >
      <OfflineBadge size={compact ? "sm" : "md"} tone={skin.tone} />
    </div>
  );
}

function EmptyDaySlot({ compact, blank }: { compact?: boolean; blank?: boolean }) {
  const skin = useLiveTableSkin();
  return (
    <div
      className={cn(
        "flex h-full min-h-[9.5rem] w-full items-center justify-center border border-dashed",
        blank ? skin.blankDay : skin.emptyDay,
        compact ? "min-h-[5.5rem] rounded-xl sm:min-h-[5.5rem]" : "rounded-2xl"
      )}
    >
      {blank ? (
        <span className={cn("flex flex-col items-center gap-2 px-1 text-center text-[0.65rem] leading-relaxed", skin.blankText)}>
          <Calendar className="size-4 shrink-0" aria-hidden />
          <span>ยังไม่มีข้อมูลไลฟ์</span>
        </span>
      ) : <OfflineBadge size={compact ? "sm" : "md"} tone={skin.tone} />}
    </div>
  );
}

/** Spotlight actions on the homepage card — shorter than the page CTAs so they fit the cover. */
const APLUS_SPOT_BTN = "!h-10 !min-h-10 !px-5 !text-sm [&_svg]:!size-3.5";

/** "อีก 1 วัน 3 ชม." — no 24h cap, for the next-live card on the homepage. */
function nextLiveCountdown(slot: LiveSlot, nowMs: number | null): string | null {
  const start = slotStartMs(slot);
  if (start === null || nowMs === null) return null;
  const diff = start - nowMs;
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return hours > 0 ? `อีก ${days} วัน ${hours} ชม.` : `อีก ${days} วัน`;
  if (hours > 0) return minutes > 0 ? `อีก ${hours} ชม. ${minutes} นาที` : `อีก ${hours} ชม.`;
  return `อีก ${Math.max(1, minutes)} นาที`;
}

/** Spotlight badge. Homepage passes `todayIso`, so a picked day that is not today never says "ไลฟ์วันนี้". */
function spotlightBadgeText(slot: LiveSlot, todayIso?: string): string {
  if (slot.status === "live") return "กำลังไลฟ์ (LIVE NOW)";
  if (todayIso && slot.date !== todayIso) {
    if (slot.status === "ended") return "จบแล้ว";
    if (slot.status === "cancelled") return "ยกเลิกไลฟ์";
    return slot.date > todayIso ? "ไลฟ์ที่กำลังจะมา" : "ไลฟ์ที่ผ่านมา";
  }
  return slot.status === "ended" ? "ไลฟ์วันนี้ (จบแล้ว)" : "ไลฟ์วันนี้";
}

function LiveSpotlightBanner({
  slot,
  onOpenDetail,
  nowMs,
  todayIso,
}: {
  slot: LiveSlot;
  onOpenDetail: () => void;
  nowMs: number | null;
  /** Homepage only: label the picked day relative to today. */
  todayIso?: string;
}) {
  const coverUrl = getSlotCoverUrl(slot);
  const own = Boolean(slot.isOwnChannel);
  const collab = slot.kind === "collab";
  const cancelled = slot.status === "cancelled";
  const label = slot.titleLocal ?? slot.title;
  const isLive = slot.status === "live";
  const isUpcoming = slot.status === "upcoming";

  const countdownText = isUpcoming ? startCountdownLabel(slot, nowMs) : null;
  const skin = useLiveTableSkin();
  const toneState = { cancelled, member: Boolean(slot.isMember), guest: collab && !own && !cancelled };

  const badgeText = spotlightBadgeText(slot, todayIso);

  const dateFormatted = formatLiveDate(slot.date);
  const timeFormatted = slot.time;

  return (
    <div className={skin.spotlight}>
      {/* 💻 Desktop / Tablet: Split Panorama Glass Card */}
      <div
        className={cn(
          "hidden sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:gap-8 lg:p-6",
          skin.tone === "aplus" && "sm:min-h-[15.5rem] lg:min-h-[16rem]"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {/* 🏷️ Row 1: Badges & Status */}
          <div
            className={cn(
              "flex items-center gap-2",
              skin.tone === "aplus" ? "h-8 shrink-0 flex-nowrap overflow-hidden" : "flex-wrap"
            )}
          >
            <span
              className={cn(
                isLive ? skin.statusLive : isUpcoming ? skin.statusUpcoming : skin.statusMuted,
                skin.tone === "aplus" && "min-w-0 max-w-full"
              )}
            >
              <span
                className={cn(
                  "shrink-0",
                  isLive ? skin.statusDotLive : isUpcoming ? skin.statusDotUpcoming : skin.statusDotMuted
                )}
              />
              <span className={cn(skin.tone === "aplus" && "truncate")}>{badgeText}</span>
            </span>

            {countdownText ? (
              <span className={skin.countdown}>
                <Timer className={cn("size-3.5", skin.tone === "aplus" ? "text-r-text-2" : "animate-pulse text-[#fff5f7]")} />
                {countdownText}
              </span>
            ) : null}

            <LiveSourceBadges
              isOwnChannel={own}
              sourceTitle={slot.sourceTitle}
              isCollab={collab}
              isMember={slot.isMember}
              showChannel
              size="md"
              tone={skin.tone}
            />
          </div>

          {/* 🕒 Row 2: Prominent Date & Time Bar */}
          <div
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm",
              skin.tone === "aplus" ? "!mt-2 h-8 shrink-0 flex-nowrap overflow-hidden" : "mt-3.5 flex-wrap"
            )}
          >
            <div className={cn(skin.metaPill, skin.tone === "aplus" && "min-w-0 max-w-[55%] overflow-hidden")}>
              <Calendar className={cn("size-3.5 shrink-0", skin.metaIcon)} />
              <span className="truncate font-semibold">{dateFormatted}</span>
            </div>

            <div className={skin.metaPill}>
              <Clock className={cn("size-3.5 shrink-0", clockClass(skin, toneState))} />
              <span className={cn("font-bold tabular-nums", skin.time)}>
                {timeFormatted}
              </span>
            </div>
          </div>

          {/* 📝 Row 3: Title */}
          <h3 className={skin.titleLg} title={label}>
            {label}
          </h3>

          {slot.titleLocal ? (
            <p className={cn("mt-1 line-clamp-1 text-sm", skin.subtitleSoft)} title={slot.title}>
              {slot.title}
            </p>
          ) : null}

          {/* 🔘 Row 4: Action Buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {slot.url ? (
              <a
                href={slot.url}
                target="_blank"
                rel="noreferrer"
                className={cn(skin.ctaPrimary, skin.tone === "aplus" && APLUS_SPOT_BTN)}
              >
                เปิดดูสตรีม
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onOpenDetail}
              className={cn(skin.ctaOutline, skin.tone === "aplus" && APLUS_SPOT_BTN)}
            >
              ดูรายละเอียด
            </button>
          </div>
        </div>

        {/* 🖼️ Right: Thumbnail */}
        {coverUrl ? (
          <button
            type="button"
            onClick={onOpenDetail}
            className={cn(skin.thumb, skin.tone === "aplus" && "self-center")}
          >
            <FadeInImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
            />
            <div className={skin.thumbShade} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenDetail}
            className={cn(skin.thumbPlain, skin.tone === "aplus" && "self-center")}
          >
            <LiveCoverPlaceholder
              className="absolute inset-0"
              size="lg"
              variant={cancelled ? "cancelled" : "default"}
            />
          </button>
        )}
      </div>

      {/* 📱 Mobile: Vertical Stack Card */}
      <div className={cn("flex flex-col sm:hidden", skin.tone === "aplus" && "min-h-[26rem]")}>
        {coverUrl ? (
          <button
            type="button"
            onClick={onOpenDetail}
            className={skin.mobileCoverBg}
          >
            <FadeInImage
              src={coverUrl}
              alt={label}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full scale-[1.12] object-cover object-center"
            />
            <div className={skin.mobileCoverShade} />
            
            {/* Top-left Badges overlay on mobile image */}
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 max-w-[85%]">
              <span className={isLive ? skin.statusLiveSm : skin.statusIdleSm}>
                <span className={isLive ? skin.liveDot : skin.statusDotIdleSm} />
                {badgeText}
              </span>

              {countdownText ? (
                <span className={skin.countdownSm}>
                  <Timer className={cn("size-3", skin.tone === "aplus" ? "text-r-text" : "animate-pulse text-[#e85a7a]")} />
                  {countdownText}
                </span>
              ) : null}

              <LiveSourceBadges
                isOwnChannel={own}
                sourceTitle={slot.sourceTitle}
                isCollab={collab}
                isMember={slot.isMember}
                showChannel
                size="sm"
                tone={skin.tone}
              />
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenDetail}
            className={skin.mobileCoverBg}
          >
            <LiveCoverPlaceholder
              className="absolute inset-0"
              size="lg"
              variant={cancelled ? "cancelled" : "default"}
            />
          </button>
        )}

        <div className={cn("p-4", skin.tone === "aplus" && "flex flex-1 flex-col")}>
          {!coverUrl ? (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className={isLive ? skin.statusLiveBare : skin.statusIdleBare}>
                {badgeText}
              </span>

              {countdownText ? (
                <span className={skin.countdownSmBare}>
                  <Timer className={cn("size-3", skin.tone === "aplus" ? "text-r-text-2" : "animate-pulse text-[#fff5f7]")} />
                  {countdownText}
                </span>
              ) : null}

              <LiveSourceBadges
                isOwnChannel={own}
                sourceTitle={slot.sourceTitle}
                isCollab={collab}
                isMember={slot.isMember}
                showChannel
                size="sm"
                tone={skin.tone}
              />
            </div>
          ) : null}

          {/* 🕒 Mobile Date & Time Bar */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className={skin.metaPillSm}>
              <Calendar className={cn("size-3", skin.metaIcon)} />
              <span className="font-semibold">{dateFormatted}</span>
            </div>
            <div className={skin.metaPillSm}>
              <Clock className={cn("size-3 shrink-0", clockClass(skin, toneState))} />
              <span className={cn("font-bold tabular-nums", skin.time)}>{timeFormatted}</span>
            </div>
          </div>

          <h3 className={skin.titleMd}>
            {label}
          </h3>

          {slot.titleLocal ? (
            <p className={cn("mt-0.5 line-clamp-1 text-xs", skin.subtitleSoft)}>
              {slot.title}
            </p>
          ) : null}

          <div className={cn("flex flex-col gap-2", skin.tone === "aplus" ? "mt-auto pt-4" : "mt-4")}>
            {slot.url ? (
              <a
                href={slot.url}
                target="_blank"
                rel="noreferrer"
                className={cn(skin.ctaPrimaryBlock, skin.tone === "aplus" && APLUS_SPOT_BTN)}
              >
                เปิดดูสตรีม
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onOpenDetail}
              className={cn(skin.ctaOutlineBlock, skin.tone === "aplus" && APLUS_SPOT_BTN)}
            >
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Homepage (A+) card for a day without lives: status headline + a wide "next live" strip.
 * Same height as the spotlight card (256px desktop / 26rem mobile) so picking days never jumps.
 */
function AplusOfflineCard({
  dayIso,
  isToday,
  offline,
  nextSlot,
  onOpenNext,
  nowMs,
}: {
  dayIso: string;
  isToday: boolean;
  offline: boolean;
  nextSlot: LiveSlot | null;
  onOpenNext?: () => void;
  nowMs: number | null;
}) {
  const skin = useLiveTableSkin();
  const dayLabel = `${englishWeekday(parseISODate(dayIso))} ${formatLiveShortDate(dayIso)}`;
  const statusText = offline ? "ไม่มีไลฟ์" : "ยังไม่มีข้อมูลไลฟ์";
  const headline = isToday ? `วันนี้${statusText}` : `${dayLabel} · ${statusText}`;

  const next = nextSlot;
  const coverUrl = next ? getSlotCoverUrl(next) : null;
  const label = next ? (next.titleLocal ?? next.title) : "";
  const nextLive = next?.status === "live";
  const nextEnded = next?.status === "ended";
  const countdown = next?.status === "upcoming" ? nextLiveCountdown(next, nowMs) : null;
  const linkLabel = next?.url && (nextLive || nextEnded) ? (nextLive ? "เปิดดูสตรีม" : "ดูย้อนหลัง") : null;
  const when = next ? `${formatLiveDate(next.date)} · ${next.time}` : "";
  const whenShort = next
    ? `${englishWeekday(parseISODate(next.date))} ${formatLiveShortDate(next.date)} · ${next.time}`
    : "";

  const statusChip = nextLive ? (
    <span className={skin.statusLiveBare}>
      <span className={skin.liveDot} />
      กำลังไลฟ์
    </span>
  ) : nextEnded ? (
    <span className={skin.countdownSmBare}>จบแล้ว</span>
  ) : countdown ? (
    <span className={skin.countdownSmBare}>
      <Timer className="size-3 text-r-text-2" />
      {countdown}
    </span>
  ) : null;

  const sourceBadges = next ? (
    <LiveSourceBadges
      isOwnChannel={Boolean(next.isOwnChannel)}
      sourceTitle={next.sourceTitle}
      isCollab={next.kind === "collab"}
      isMember={next.isMember}
      showChannel
      size="sm"
      tone={skin.tone}
    />
  ) : null;

  const actions = (block: boolean) =>
    next ? (
      <>
        {linkLabel ? (
          <a
            href={next.url}
            target="_blank"
            rel="noreferrer"
            className={cn(skin.ctaPrimary, APLUS_SPOT_BTN, block && "flex-1")}
          >
            {linkLabel}
            <ArrowUpRight className="size-4" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onOpenNext}
          className={cn(linkLabel ? skin.ctaOutline : skin.ctaPrimary, APLUS_SPOT_BTN, block && "flex-1")}
        >
          ดูรายละเอียด
        </button>
      </>
    ) : null;

  const cover = (className: string, imgClassName: string) =>
    next ? (
      <button
        type="button"
        onClick={onOpenNext}
        aria-label={`ดูรายละเอียด ${label}`}
        className={cn(
          "group relative aspect-video shrink-0 overflow-hidden rounded-2xl bg-r-bg ring-1 ring-r-line transition hover:ring-r-pri/50",
          className
        )}
      >
        {coverUrl ? (
          <FadeInImage
            src={coverUrl}
            alt={label}
            wrapClassName="absolute inset-0 block"
            className={cn("absolute inset-0 h-full w-full object-cover object-center", imgClassName)}
          />
        ) : (
          <LiveCoverPlaceholder className="absolute inset-0" size="sm" />
        )}
      </button>
    ) : null;

  const empty = (
    <div className="flex flex-1 items-center justify-center rounded-[20px] border border-dashed border-r-text-2/20 px-4 text-center text-sm text-r-text-3">
      ยังไม่มีไลฟ์ถัดไปในตาราง
    </div>
  );

  const badge = (size: "sm" | "md") =>
    offline ? (
      <OfflineBadge size={size} tone={skin.tone} className="shrink-0" />
    ) : (
      <Calendar className="size-5 shrink-0 text-r-text-3" aria-hidden />
    );

  return (
    <div
      className={cn(
        // border is 1px: inner min-heights subtract 2px to match the spotlight card
        "relative overflow-hidden rounded-3xl border",
        offline
          ? "border-r-acc/35 bg-gradient-to-br from-r-acc/[0.09] to-r-acc/[0.01]"
          : "border-r-text-2/25 bg-white/[0.02]"
      )}
    >
      {/* Desktop / tablet */}
      <div className="hidden sm:flex sm:min-h-[calc(15.5rem-2px)] sm:flex-col sm:gap-4 sm:p-5 lg:min-h-[calc(16rem-2px)] lg:p-6">
        <div className="flex min-w-0 items-center gap-3">
          {badge("md")}
          <h3 className="min-w-0 truncate font-[family-name:var(--font-display)] text-xl leading-snug text-r-text lg:text-2xl">
            {headline}
          </h3>
          {isToday ? (
            <span className={cn(skin.metaPill, "shrink-0")}>
              <Calendar className={cn("size-3.5", offline ? "text-r-acc" : skin.metaIcon)} />
              <span className="font-semibold">{formatLiveDate(dayIso)}</span>
            </span>
          ) : null}
        </div>

        {next ? (
          <div className="flex flex-1 items-center gap-5 rounded-[20px] border border-r-pri/25 bg-gradient-to-r from-r-pri/[0.08] via-r-bg/40 to-r-bg/40 p-3.5 lg:gap-6">
            {cover("w-44 lg:w-56", "transition duration-700 group-hover:scale-[1.04]")}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-2 text-xs">
                <span className="shrink-0 font-medium tracking-[0.14em] text-r-pri">ไลฟ์ถัดไป</span>
                <span className="truncate tabular-nums text-r-text-2">{when}</span>
              </div>
              <p className="line-clamp-1 font-[family-name:var(--font-display)] text-lg text-r-text lg:text-xl" title={label}>
                {label}
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {statusChip}
                {sourceBadges}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">{actions(false)}</div>
          </div>
        ) : (
          empty
        )}
      </div>

      {/* Mobile */}
      <div className="flex min-h-[calc(26rem-2px)] flex-col gap-3 p-4 sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {badge("sm")}
          <h3 className="min-w-0 truncate font-[family-name:var(--font-display)] text-lg text-r-text">{headline}</h3>
        </div>

        {next ? (
          <div className="flex flex-1 flex-col gap-2 rounded-[18px] border border-r-pri/25 bg-gradient-to-b from-r-pri/[0.08] to-r-bg/40 p-3">
            {cover("w-full", "scale-[1.12]")}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[0.7rem] font-medium tracking-[0.14em] text-r-pri">ไลฟ์ถัดไป</span>
              {statusChip}
            </div>
            {/* one line: guest + collab badges must not push the card taller */}
            <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 text-xs tabular-nums text-r-text-2">{whenShort}</span>
              {sourceBadges}
            </div>
            <p className="line-clamp-1 font-[family-name:var(--font-display)] text-base text-r-text" title={label}>
              {label}
            </p>
            <div className="mt-auto flex gap-2 pt-1">{actions(true)}</div>
          </div>
        ) : (
          empty
        )}
      </div>
    </div>
  );
}

function LiveTodayOfflineBanner({
  todayIso,
  offline,
  nextSlot,
  onOpenNext,
  isToday = true,
  nowMs = null,
}: {
  todayIso: string;
  offline: boolean;
  nextSlot: LiveSlot | null;
  onOpenNext?: () => void;
  /** Homepage: false when the picked day is not today. */
  isToday?: boolean;
  nowMs?: number | null;
}) {
  const dateFormatted = formatLiveDate(todayIso);

  const nextCoverUrl = nextSlot ? getSlotCoverUrl(nextSlot) : null;
  const nextLabel = nextSlot
    ? (nextSlot.titleLocal ?? nextSlot.title)
    : null;
  const nextDateFormatted = nextSlot
    ? formatLiveDate(nextSlot.date)
    : null;
  const skin = useLiveTableSkin();

  if (skin.tone === "aplus") {
    return (
      <AplusOfflineCard
        dayIso={todayIso}
        isToday={isToday}
        offline={offline}
        nextSlot={nextSlot}
        onOpenNext={onOpenNext}
        nowMs={nowMs}
      />
    );
  }

  const nextPreview = nextSlot ? (
    <button
      type="button"
      onClick={onOpenNext}
      className={skin.nextCard}
    >
      <span className={skin.nextThumb}>
        {nextCoverUrl ? (
          <FadeInImage
            src={nextCoverUrl}
            alt={nextLabel ?? "ไลฟ์ถัดไป"}
            wrapClassName="absolute inset-0 block"
            className="absolute inset-0 h-full w-full scale-[1.2] object-cover object-center"
          />
        ) : (
          <LiveCoverPlaceholder className="absolute inset-0" size="sm" />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className={skin.nextKicker}>
          ไลฟ์ถัดไป
        </span>
        <span className={skin.nextMeta}>
          <span className="inline-flex items-center gap-1">
            <Calendar className={cn("size-3", skin.metaIcon)} />
            {nextDateFormatted}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className={cn("size-3", skin.metaIcon)} />
            {nextSlot.time}
          </span>
        </span>
        <span className={skin.nextTitle}>
          {nextLabel}
        </span>
      </span>
    </button>
  ) : null;

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-dashed", offline ? skin.offlineShellOn : skin.offlineShellOff)}>
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            {offline ? <OfflineBadge size="md" tone={skin.tone} /> : <span className={cn("inline-flex items-center gap-2", skin.offlineNote)}>
              <Calendar className="size-4 shrink-0" aria-hidden />
              ยังไม่มีข้อมูลไลฟ์
            </span>}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 shadow-inner", offline ? skin.offlineDateOn : skin.offlineDateOff)}>
              <Calendar className={cn("size-3.5", offline ? skin.offlineDateIconOn : skin.offlineDateIconOff)} />
              <span className="font-semibold">{dateFormatted}</span>
            </div>
          </div>

          {/* Same slot as LiveSpotlight action buttons */}
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
            {nextPreview}
          </div>
        </div>

        <div className={cn("relative aspect-[16/9] w-64 shrink-0 self-center overflow-hidden rounded-2xl border border-dashed bg-transparent lg:w-80", offline ? skin.offlineCoverOn : skin.offlineCoverOff)}>
          {offline ? <LiveCoverPlaceholder className="absolute inset-0" size="lg" variant="offline" /> : <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2", skin.offlineNote)}>
            <Calendar className="size-6 shrink-0" aria-hidden />
            <span>ยังไม่มีข้อมูลไลฟ์</span>
          </div>}
        </div>
      </div>

      <div className="flex flex-col sm:hidden">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-transparent">
          {offline ? <>
            <LiveCoverPlaceholder className="absolute inset-0" size="lg" variant="offline" />
            <div className="pointer-events-none absolute left-3 top-3 z-10"><OfflineBadge size="sm" tone={skin.tone} /></div>
          </> : <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2", skin.offlineNote)}>
            <Calendar className="size-6 shrink-0" aria-hidden />
            <span>ยังไม่มีข้อมูลไลฟ์</span>
          </div>}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1", offline ? skin.offlineDateSmOn : skin.offlineDateSmOff)}>
              <Calendar className={cn("size-3", offline ? skin.offlineDateIconOn : skin.offlineDateIconOff)} />
              <span className="font-semibold">{dateFormatted}</span>
            </div>
          </div>

          {/* Same slot as LiveSpotlight mobile action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            {nextPreview}
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function LiveWeekBannerCard({
  banner,
}: {
  banner: LiveWeekBanner;
}) {
  const skin = useLiveTableSkin();
  return (
    <div className={skin.banner}>
      {/* 💻 Desktop / Tablet: Split Panorama Glass Card */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className={skin.bannerBadge}>
              <Sparkles className="size-3 shrink-0" />
              {banner.badge ?? "SPECIAL HIGHLIGHT"}
            </span>
          </div>

          <h3 className={cn("mt-2.5 text-xl sm:text-2xl", skin.bannerTitle)}>
            {banner.title}
          </h3>

          {banner.subtitle ? (
            <p className={cn("mt-1.5 line-clamp-2 text-sm leading-relaxed", skin.bannerSub)}>
              {banner.subtitle}
            </p>
          ) : null}

          {banner.linkUrl ? (
            <div className="mt-4">
              <BannerLink
                href={banner.linkUrl}
                className={skin.bannerCta}
              >
                {banner.buttonLabel ?? "ดูรายละเอียด"}
                <ArrowUpRight className="size-4" />
              </BannerLink>
            </div>
          ) : null}
        </div>

        {banner.imageUrl ? (
          <div className={skin.bannerThumb}>
            <ProtectedImage
              src={banner.imageUrl}
              alt={banner.imageAlt ?? banner.title}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 hover:scale-[1.03]"
            />
          </div>
        ) : null}
      </div>

      {/* 📱 Mobile: Vertical Stack Card */}
      <div className="flex flex-col sm:hidden">
        {banner.imageUrl ? (
          <div className={skin.bannerCoverBg}>
            <ProtectedImage
              src={banner.imageUrl}
              alt={banner.imageAlt ?? banner.title}
              wrapClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className={skin.bannerCoverShade} />
            <span
              className={cn(
                skin.bannerBadge,
                "absolute left-3 top-3 backdrop-blur-md"
              )}
            >
              <Sparkles className="size-3 shrink-0" />
              {banner.badge ?? "SPECIAL"}
            </span>
          </div>
        ) : null}

        <div className="p-4">
          {!banner.imageUrl ? (
            <span className={skin.bannerBadge}>
              <Sparkles className="size-3 shrink-0" />
              {banner.badge ?? "SPECIAL HIGHLIGHT"}
            </span>
          ) : null}

          <h3 className={cn("mt-2 text-lg", skin.bannerTitle)}>
            {banner.title}
          </h3>

          {banner.subtitle ? (
            <p className={cn("mt-1 line-clamp-2 text-xs leading-relaxed", skin.bannerSub)}>
              {banner.subtitle}
            </p>
          ) : null}

          {banner.linkUrl ? (
            <BannerLink
              href={banner.linkUrl}
              className={skin.bannerCtaBlock}
            >
              {banner.buttonLabel ?? "ดูรายละเอียด"}
              <ArrowUpRight className="size-4" />
            </BannerLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LiveWeekTable({
  weeks,
  className,
  compact = false,
  blankEmptyDays = false,
  slotLookup,
  weekRange,
  tone = "legacy",
}: LiveWeekTableProps) {
  const skin = tone === "aplus" ? APLUS_SKIN : LEGACY_SKIN;
  const selectable = tone === "aplus";
  const nowMs = useNow(30000);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [pickedIso, setPickedIso] = useState<string | null>(null);
  const {
    todayIso,
    navigableWeeks,
    safeIndex,
    prev,
    next,
    goToCurrentWeek,
    week,
    currentWeek,
    viewingCurrentWeek,
    dayIsos,
    slotsByDate,
    allSlots,
    offlineByDate,
    currentOfflineByDate,
    highlightSlot,
    nextHighlightSlot,
  } = useLiveWeekView({ weeks, slotLookup, weekRange });
  const { detailRef, openDetail } = useLiveDetail();

  if (!week) {
    return <p className={skin.emptyMessage}>ยังไม่มีตารางไลฟ์</p>;
  }

  const weekHasLiveData = week.slots.length > 0;
  const showNoLiveData = blankEmptyDays && !weekHasLiveData;
  const currentWeekHasLiveData = (currentWeek?.slots.length ?? 0) > 0;

  const rangeLabel = formatLiveDateRange(
    dayIsos[0] ?? week.weekStart,
    dayIsos[6] ?? week.weekStart
  );
  const weekNavLabel = viewingCurrentWeek
    ? (week.label ?? "สัปดาห์นี้")
    : (week.label ?? "สัปดาห์อื่น");

  const selectedIso =
    selectable && pickedIso && dayIsos.includes(pickedIso)
      ? pickedIso
      : todayIso;
  const selectedSlots = preferOwnChannelSlots(allSlots.filter((slot) => slot.date === selectedIso));
  const selectedSlot = spotlightSlotForDay(selectedSlots);
  const selectedInView = dayIsos.includes(selectedIso);
  const selectedIsOffline =
    selectedSlots.length === 0 &&
    (selectedInView
      ? weekHasLiveData || offlineByDate.has(selectedIso)
      : (currentWeek?.slots.length ?? 0) > 0 || currentOfflineByDate.has(selectedIso));
  const nextAfterSelected = nextLiveAfter(allSlots, selectedIso, { includeEnded: selectable });

  const selectDay = (iso: string) => {
    setPickedIso(iso);
    requestAnimationFrame(() => {
      spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  // Homepage: only offer "วันนี้" once the card or the week has moved away from today.
  const showTodayButton = selectable && (selectedIso !== todayIso || !viewingCurrentWeek);
  const goToday = () => {
    setPickedIso(null);
    goToCurrentWeek();
    requestAnimationFrame(() => {
      spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const renderDayBody = (iso: string, isMobile?: boolean) => {
    const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
    const offline = offlineByDate.get(iso);
    const crowded = daySlots.length > 1;

    if (daySlots.length > 0) {
      if (isMobile) {
        return (
          <div className="flex flex-col gap-2">
            {daySlots.map((slot) => (
              <MobileSlotCard
                key={slot.id}
                slot={slot}
                onOpen={() => openDetail(slot)}
              />
            ))}
          </div>
        );
      }

      return (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2",
            crowded &&
              (compact
                ? "max-h-[12.5rem] overflow-hidden"
                : "max-h-[15.5rem] overflow-hidden sm:max-h-[17rem]")
          )}
        >
          {daySlots.map((slot) => (
            <div
              key={slot.id}
              className={cn("flex h-full min-h-0 flex-col", crowded && "flex-1")}
            >
          <SlotCard
            slot={slot}
                compact={compact}
                crowded={crowded}
            onOpen={() => openDetail(slot)}
          />
        </div>
          ))}
        </div>
      );
    }

    if (offline) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <OfflineDaySlot compact={compact} />
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <EmptyDaySlot compact={compact} blank={showNoLiveData} />
      </div>
    );
  };

  return (
    <LiveTableSkinContext.Provider value={skin}>
    <div className={cn("space-y-5", className)}>
      {/* Homepage: the card follows the day frame. /live stays pinned to today. */}
      <div ref={spotlightRef}>
      {selectable ? (
        selectedSlot ? (
          <LiveSpotlightBanner
            slot={selectedSlot}
            nowMs={nowMs}
            todayIso={todayIso}
            onOpenDetail={() => openDetail(selectedSlot)}
          />
        ) : selectedIso === todayIso && currentWeek?.banner ? (
          <LiveWeekBannerCard banner={currentWeek.banner} />
        ) : (
          <LiveTodayOfflineBanner
            todayIso={selectedIso}
            isToday={selectedIso === todayIso}
            nowMs={nowMs}
            offline={selectedIsOffline}
            nextSlot={nextAfterSelected}
            onOpenNext={
              nextAfterSelected ? () => openDetail(nextAfterSelected) : undefined
            }
          />
        )
      ) : currentWeek?.banner ? (
        <LiveWeekBannerCard banner={currentWeek.banner} />
      ) : highlightSlot ? (
        <LiveSpotlightBanner
          slot={highlightSlot}
          nowMs={nowMs}
          onOpenDetail={() => openDetail(highlightSlot)}
        />
      ) : currentWeek ? (
        <LiveTodayOfflineBanner
          todayIso={todayIso}
          offline={
            currentWeekHasLiveData || currentOfflineByDate.has(todayIso)
          }
          nextSlot={nextHighlightSlot}
          onOpenNext={
            nextHighlightSlot
              ? () => openDetail(nextHighlightSlot)
              : undefined
          }
        />
      ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={skin.weekKicker}>{weekNavLabel}</p>
          <p className={skin.weekRange}>
            {rangeLabel}
          </p>
        </div>

        {navigableWeeks.length > 1 || showTodayButton ? (
          <div className="flex items-center gap-2">
            {showTodayButton ? (
              <button
                type="button"
                onClick={goToday}
                aria-label="กลับไปวันนี้"
                className="inline-flex h-[38px] items-center gap-1.5 rounded-full bg-r-pri/14 px-3.5 text-xs font-medium text-r-text ring-2 ring-r-pri/45 transition hover:bg-r-pri/20 hover:ring-r-pri/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc sm:text-sm"
              >
                <span className="size-1.5 rounded-full bg-r-pri" aria-hidden />
                วันนี้
              </button>
            ) : null}
            {navigableWeeks.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="สัปดาห์ก่อนหน้า"
                  disabled={safeIndex <= 0}
                  onClick={prev}
                  className={skin.navButton}
                >
                  <ChevronLeft className="size-4" />
                </button>
                {/* Mobile: the "วันนี้" button takes the counter's spot so the row never wraps. */}
                <span className={cn(skin.navCount, showTodayButton && "hidden sm:inline")}>
                  {safeIndex + 1} / {navigableWeeks.length}
                </span>
                <button
                  type="button"
                  aria-label="สัปดาห์ถัดไป"
                  disabled={safeIndex >= navigableWeeks.length - 1}
                  onClick={next}
                  className={skin.navButton}
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "hidden overflow-x-auto sm:block -my-3 -mx-2 py-3 px-2",
          compact && "sm:block"
        )}
      >
        <div className="grid min-w-[44rem] grid-cols-7 items-stretch gap-2.5">
          {dayIsos.map((iso) => {
            const date = parseISODate(iso);
            const isToday = iso === todayIso;
            const isSelected = selectable && iso === selectedIso;
            const headerClass = cn(
              "relative z-10 shrink-0 border-b pb-2 text-center",
              isToday ? skin.dayRuleToday : skin.dayRule,
              selectable &&
                "w-full cursor-pointer rounded-t-xl hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
            );
            const headerInner = (
              <>
                <div className="flex items-center justify-center gap-1">
                  {isToday ? <span className={skin.todayDot} /> : null}
                  <span
                    className={cn(
                      "text-xs tracking-[0.14em] uppercase sm:text-sm",
                      isToday ? skin.dayNameToday : skin.dayName
                    )}
                  >
                    {englishWeekday(date)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                  <span className={isToday ? skin.dayDateToday : skin.dayDate}>
                    {formatLiveShortDate(iso)}
                  </span>
                </div>
              </>
            );

            return (
              <div
                key={iso}
                className="relative flex h-full min-w-0 flex-col"
              >
                {(selectable ? isSelected : isToday) ? (
                  <div className={skin.todayGlow} />
                ) : null}

                {selectable ? (
                  <button
                    type="button"
                    onClick={() => selectDay(iso)}
                    aria-pressed={isSelected}
                    aria-label={`เลือกวัน ${englishWeekday(date)} ${formatLiveShortDate(iso)}`}
                    className={headerClass}
                  >
                    {headerInner}
                  </button>
                ) : (
                  <div className={headerClass}>{headerInner}</div>
                )}
                <div className="relative z-10 mt-2 flex flex-1 flex-col gap-2">
                  {renderDayBody(iso)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className={cn("relative divide-y sm:hidden -mx-2 px-2 py-1", skin.mobileDivide)}>
        {dayIsos.map((iso) => {
          const date = parseISODate(iso);
          const daySlots = preferOwnChannelSlots(slotsByDate.get(iso) ?? []);
          const offline = offlineByDate.get(iso);
          const isToday = iso === todayIso;
          const isSelected = selectable && iso === selectedIso;
          const headerClass = cn(
            "relative z-10 flex w-full flex-wrap items-center gap-1.5 text-left",
            selectable &&
              "cursor-pointer rounded-xl px-1 py-1 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
          );
          const headerInner = (
            <>
              <div className="flex items-center gap-1">
                {isToday ? <span className={skin.todayDot} /> : null}
                <span
                  className={cn(
                    "text-xs tracking-[0.14em] uppercase sm:text-sm",
                    isToday ? skin.dayNameToday : skin.dayName
                  )}
                >
                  {englishWeekday(date)}
                </span>
              </div>
              <span className={isToday ? skin.dayDateToday : skin.dayDate}>
                {formatLiveShortDate(iso)}
              </span>
              {isToday ? <span className={skin.todayBadge}>วันนี้</span> : null}
              <LiveDayChannelBadges slots={daySlots} size="sm" tone={skin.tone} />
            </>
          );

          return (
            <li
              key={iso}
              className="relative py-4 first:pt-1.5 last:pb-1.5 transition-all"
            >
              {(selectable ? isSelected : isToday) ? (
                <div className={skin.todayGlowMobile} />
              ) : null}

              {selectable ? (
                <button
                  type="button"
                  onClick={() => selectDay(iso)}
                  aria-pressed={isSelected}
                  aria-label={`เลือกวัน ${englishWeekday(date)} ${formatLiveShortDate(iso)}`}
                  className={headerClass}
                >
                  {headerInner}
                </button>
              ) : (
                <div className={headerClass}>{headerInner}</div>
              )}
              <div className="relative z-10 mt-2.5 flex flex-col gap-2">
                {daySlots.length > 0 || offline ? (
                  renderDayBody(iso, true)
                ) : (
                  <div className={cn("relative flex items-center gap-2 border-l-2 border-dashed px-3 py-2", showNoLiveData ? skin.mobileEmptyRuleBlank : skin.mobileEmptyRule)}>
                    {showNoLiveData ? (
                      <span className={cn("absolute inset-y-0 left-3 flex items-center gap-2", skin.mobileEmptyText)}>
                        <Calendar className="size-4 shrink-0" aria-hidden />
                        <span>ยังไม่มีข้อมูลไลฟ์</span>
                      </span>
                    ) : null}
                    <span className={cn("inline-flex", showNoLiveData && "invisible")} aria-hidden={showNoLiveData || undefined}>
                      <OfflineBadge size="sm" tone={skin.tone} />
                    </span>
                    <span className={cn(skin.mobileEmptyNote, showNoLiveData && "invisible")} aria-hidden={showNoLiveData || undefined}>
                      ไม่มีไลฟ์
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <LiveDetailHost ref={detailRef} slots={allSlots} />
    </div>
    </LiveTableSkinContext.Provider>
  );
}

/** Homepage-shaped placeholder while the week table loads. */
export function LiveWeekTableSkeleton() {
  const pulse = "animate-pulse rounded-2xl bg-white/[0.05]";
  return (
    <div aria-busy="true" aria-label="กำลังโหลดตารางไลฟ์" className="space-y-5">
      <div className="r-card grid min-h-48 gap-4 rounded-3xl p-4 sm:grid-cols-[minmax(0,1fr)_16rem] sm:p-6">
        <div className="space-y-3">
          <div className={cn(pulse, "h-6 w-36 rounded-full")} />
          <div className={cn(pulse, "h-8 w-3/4")} />
          <div className={cn(pulse, "h-12 w-40 rounded-full")} />
        </div>
        <div className={cn(pulse, "aspect-video rounded-2xl")} />
      </div>
      <div className={cn(pulse, "h-10 w-56")} />
      <div className="hidden gap-2.5 sm:grid sm:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={cn(pulse, "h-44")} />
        ))}
      </div>
      <div className="space-y-3 sm:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={cn(pulse, "h-24")} />
        ))}
      </div>
    </div>
  );
}
