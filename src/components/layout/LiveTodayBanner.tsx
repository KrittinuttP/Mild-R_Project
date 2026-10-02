"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, X } from "lucide-react";

import { useNow } from "@/hooks/useNow";
import { flattenLiveSlots } from "@/lib/events";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { cn } from "@/lib/utils";
import type { LiveSlot, LiveWeek } from "@/types/vtuber";

registerGsapPlugins();

const REFRESH_MS = 2 * 60_000;
/** Upcoming slots this far past their start time are treated as stale data. */
const STALE_UPCOMING_MS = 3 * 60 * 60 * 1000;
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
      return liveRank || a.time.localeCompare(b.time);
    });
}

function useTodayLiveSlots(today: string | null) {
  const [loaded, setLoaded] = useState<{ day: string; slots: LiveSlot[] } | null>(
    null
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
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [today]);

  return loaded?.day === today ? loaded.slots : null;
}

/** Slim "live today" strip under the header; dismissible per Bangkok day. */
export function LiveTodayBanner() {
  const nowMs = useNow(60_000);
  const today = nowMs === null ? null : bangkokDateFromIso(new Date(nowMs).toISOString());
  const slots = useTodayLiveSlots(today);
  const dismissedDay = useSyncExternalStore(subscribeDismiss, readDismissedDay, () => null);

  const todaySlots = today && nowMs !== null && slots ? pickTodaySlots(slots, today, nowMs) : [];
  const slot = todaySlots[0] ?? null;
  const visible = Boolean(slot && today && dismissedDay !== today);

  const wrapRef = useRef<HTMLDivElement>(null);

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
  const title = slot.titleLocal ?? slot.title;
  const extra = todaySlots.length - 1;
  const guest = !slot.isOwnChannel && slot.sourceTitle ? slot.sourceTitle : null;
  const external = isLive && slot.url;
  const href = external ? slot.url! : "/live#this-week";
  const cta = isLive ? "ดูไลฟ์" : "ดูตาราง";

  const content = (
    <>
      {isLive ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e85a7a] px-2 py-0.5 text-[0.65rem] font-semibold tracking-wider text-white">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-white" />
          </span>
          LIVE
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e85a7a]/40 px-2 py-0.5 text-[0.65rem] tracking-wider text-[#f7d7de] tabular-nums">
          <Radio className="size-3 text-[#e85a7a]" aria-hidden />
          {time ? `วันนี้ ${time}` : "วันนี้"}
        </span>
      )}
      <span className="min-w-0 truncate text-[#fff5f7]/90 transition group-hover:text-white">
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
          "border-t backdrop-blur-md",
          isLive
            ? "border-[#e85a7a]/30 bg-[#2a0f19]/90"
            : "border-[#f3b8c4]/10 bg-[#1a0c12]/90"
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
