"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { useNow } from "@/hooks/useNow";
import { flattenLiveSlots } from "@/lib/events";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { getSlotCoverUrl } from "@/lib/live-cover";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { cn } from "@/lib/utils";
import type { LiveSlot, LiveWeek } from "@/types/vtuber";

registerGsapPlugins();

const REFRESH_MS = 2 * 60_000;
/** Poll faster around start time so the badge flips to LIVE soon after the tracker sees it. */
const FAST_REFRESH_MS = 30_000;
const FAST_REFRESH_LEAD_MS = 10 * 60_000;
const HOUR_MS = 60 * 60 * 1000;
/** Upcoming slots this far past their start time are treated as stale data. */
const STALE_UPCOMING_MS = 3 * HOUR_MS;
const DISMISS_KEY = "mild-r:live-banner-dismissed";
const DISMISS_EVENT = "mild-r:live-banner-dismissed";

function subscribeDismiss(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

function readDismissedDay() {
  try {
    return window.localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function dismissForDay(day: string) {
  try {
    window.localStorage.setItem(DISMISS_KEY, day);
  } catch {
    /* private mode — dismiss only for this render */
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function slotTimeLabel(slot: LiveSlot): string | null {
  const time = slot.scheduledUpdated ?? slot.scheduledLabel ?? slot.time;
  return /^\d{1,2}:\d{2}$/.test(time) ? time : null;
}

/** Bangkok (UTC+7) wall-clock start of the slot, in epoch ms. */
function slotStartMs(slot: LiveSlot): number | null {
  const time = slotTimeLabel(slot);
  if (!time) return null;
  const [y, m, d] = slot.date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h - 7, min);
}

function actualStartMs(slot: LiveSlot): number | null {
  const time = slot.actualStartLabel;
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [y, m, d] = slot.date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h - 7, min);
}

/** `H:MM:SS` from one hour up, `MM:SS` below. */
function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** Today's live first, then upcoming by start time; ended/cancelled/stale dropped. */
function pickTodaySlots(slots: LiveSlot[], today: string, nowMs: number) {
  return slots
    .filter((slot) => {
      if (slot.date !== today) return false;
      if (slot.status === "live") return true;
      if (slot.status === "ended" || slot.status === "cancelled") return false;
      const start = slotStartMs(slot);
      return start === null || start + STALE_UPCOMING_MS > nowMs;
    })
    .sort((a, b) => {
      const liveRank = Number(b.status === "live") - Number(a.status === "live");
      if (liveRank) return liveRank;
      const aStart = slotStartMs(a) ?? Number.POSITIVE_INFINITY;
      const bStart = slotStartMs(b) ?? Number.POSITIVE_INFINITY;
      return aStart - bStart || a.time.localeCompare(b.time);
    });
}

/** An upcoming slot is close to (or past) its start but not yet marked live. */
function isNearStart(slot: LiveSlot, nowMs: number) {
  if (slot.status === "live") return false;
  const start = slotStartMs(slot);
  return start !== null && nowMs >= start - FAST_REFRESH_LEAD_MS;
}

function useTodayLiveSlots(today: string | null, nowMs: number | null) {
  const [loaded, setLoaded] = useState<{ day: string; slots: LiveSlot[] } | null>(
    null
  );

  const current = loaded?.day === today ? loaded.slots : null;
  const fast = Boolean(
    today &&
      nowMs !== null &&
      current &&
      pickTodaySlots(current, today, nowMs).some((slot) => isNearStart(slot, nowMs))
  );

  useEffect(() => {
    if (!today) return;
    let cancelled = false;

    const load = async () => {
      try {
        const qs = new URLSearchParams({ from: today, to: today });
        const res = await fetch(`/api/live/schedule?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { weeks?: LiveWeek[] };
        if (cancelled || !Array.isArray(data.weeks)) return;
        setLoaded({ day: today, slots: flattenLiveSlots(data.weeks) });
      } catch {
        /* the banner is optional — stay hidden on network errors */
      }
    };

    void load();
    const id = window.setInterval(load, fast ? FAST_REFRESH_MS : REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [today, fast]);

  return current;
}

/** Slim "live today" strip under the header; dismissible per Bangkok day. */
export function LiveTodayBanner() {
  const nowMs = useNow(1000);
  const today = nowMs === null ? null : bangkokDateFromIso(new Date(nowMs).toISOString());
  const slots = useTodayLiveSlots(today, nowMs);
  const dismissedDay = useSyncExternalStore(subscribeDismiss, readDismissedDay, () => null);

  const todaySlots = today && nowMs !== null && slots ? pickTodaySlots(slots, today, nowMs) : [];
  const slot = todaySlots[0] ?? null;
  const visible = Boolean(slot && today && dismissedDay !== today);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [failedCover, setFailedCover] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.dataset.liveBanner = "";
    return () => {
      delete root.dataset.liveBanner;
    };
  }, [visible]);

  useGSAP(
    () => {
      const el = wrapRef.current;
      if (!el || !visible) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(el, { height: 0, autoAlpha: 0, duration: 0.45, ease: "power2.out" });
    },
    { dependencies: [visible], scope: wrapRef }
  );

  const dismiss = () => {
    if (!today) return;
    const el = wrapRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dismissForDay(today);
      return;
    }
    gsap.to(el, {
      height: 0,
      autoAlpha: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => dismissForDay(today),
    });
  };

  if (!visible || !slot) return null;

  const isLive = slot.status === "live";
  const time = slotTimeLabel(slot);
  const startMs = slotStartMs(slot);
  const liveSinceMs = isLive ? actualStartMs(slot) : null;
  const elapsed =
    liveSinceMs !== null && nowMs !== null && nowMs >= liveSinceMs
      ? formatClock(nowMs - liveSinceMs)
      : null;
  const untilStart = !isLive && startMs !== null && nowMs !== null ? startMs - nowMs : null;
  const awaitingStart = untilStart !== null && untilStart <= 0;
  const startingSoon = untilStart !== null && untilStart > 0 && untilStart < HOUR_MS;
  const title = slot.titleLocal ?? slot.title;
  const extra = todaySlots.length - 1;
  const guest = !slot.isOwnChannel && slot.sourceTitle ? slot.sourceTitle : null;
  const external = isLive && slot.url;
  const href = external ? slot.url! : "/live#this-week";
  const cta = isLive ? "ดูไลฟ์" : "ดูตาราง";
  const coverUrl = getSlotCoverUrl(slot);
  const showCover = Boolean(coverUrl && failedCover !== coverUrl);
  const glow = isLive || startingSoon || awaitingStart;
  const clock = isLive ? elapsed : untilStart !== null && untilStart > 0 ? formatClock(untilStart) : null;

  const content = (
    <>
      {showCover && coverUrl ? (
        <span
          className={cn(
            "relative hidden aspect-video h-7 shrink-0 overflow-hidden rounded-[5px] border bg-[#10070b] sm:block",
            isLive ? "border-[#e85a7a]/80" : "border-[#f3b8c4]/20"
          )}
        >
          <ProtectedImage
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedCover(coverUrl)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {isLive ? (
            <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-[#e85a7a] ring-1 ring-[#140a0d]" />
          ) : null}
        </span>
      ) : null}

      {isLive ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-[#e85a7a] px-1.5 py-px text-[0.6rem] font-semibold tracking-[0.14em] text-white">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-white" />
          </span>
          LIVE
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 tabular-nums",
            awaitingStart ? "text-[#e85a7a]" : "text-[#f3b8c4]/75"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full bg-[#e85a7a]",
              glow && "animate-pulse motion-reduce:animate-none"
            )}
            aria-hidden
          />
          {awaitingStart ? (
            "ถึงเวลาแล้ว · รอเริ่มไลฟ์"
          ) : (
            <span>
              ไลฟ์วันนี้
              {time ? <span className="font-medium text-[#fff5f7]/90"> {time}</span> : null}
            </span>
          )}
        </span>
      )}

      {isLive || clock ? (
        <span className="inline-flex shrink-0 items-baseline gap-1.5 border-l border-[#f3b8c4]/15 pl-2.5">
          <span className={cn("text-[0.7rem]", isLive ? "text-[#f7d7de]" : "text-[#f3b8c4]/55")}>
            {isLive ? "กำลังไลฟ์" : "เริ่มใน"}
          </span>
          {clock ? (
            <span
              className={cn(
                "font-[family-name:var(--font-display)] text-sm leading-none font-medium tracking-[0.04em] tabular-nums sm:text-base",
                startingSoon
                  ? "text-[#ff8fa8] [text-shadow:0_0_14px_rgba(232,90,122,0.55)]"
                  : "text-[#fff5f7]"
              )}
            >
              {clock}
            </span>
          ) : null}
        </span>
      ) : null}

      <span className="min-w-0 truncate text-[#fff5f7]/85 transition group-hover:text-white">
        {title}
        {guest ? <span className="text-[#f3b8c4]/60"> · ช่อง {guest}</span> : null}
        {slot.isMember ? <span className="text-[#f3b8c4]/60"> · Member</span> : null}
      </span>
      {extra > 0 ? (
        <span className="shrink-0 text-[#f3b8c4]/60">+{extra} ไลฟ์</span>
      ) : null}
      <span className="ml-auto hidden shrink-0 items-center gap-1 text-[#e85a7a] transition group-hover:gap-1.5 sm:inline-flex">
        {cta}
        <ArrowUpRight className="size-3.5" aria-hidden />
      </span>
    </>
  );

  const linkClass =
    "group flex min-w-0 flex-1 items-center gap-2.5 py-2 focus-visible:outline-none focus-visible:underline";

  return (
    <div ref={wrapRef} className="overflow-hidden">
      <div
        className={cn(
          "border-t border-b border-t-[#f3b8c4]/[0.06] bg-gradient-to-r backdrop-blur-md",
          isLive
            ? "border-b-[#e85a7a]/35 from-[#1c0a11]/95 via-[#2a0f19]/92 to-[#3a1422]/90"
            : "border-b-[#e85a7a]/20 from-[#140a0d]/95 via-[#1a0c12]/92 to-[#2a1018]/90"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 text-xs sm:px-10 sm:text-sm lg:px-16">
          {external ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {content}
            </a>
          ) : (
            <Link href={href} className={linkClass}>
              {content}
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="ปิดแบนเนอร์ไลฟ์วันนี้"
            className="-mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#f3b8c4]/60 transition hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
