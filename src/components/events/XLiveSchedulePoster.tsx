"use client";

import { useState } from "react";
import { ExternalLink, ImageIcon, ZoomIn } from "lucide-react";

import { ImageLightbox } from "@/components/media/ImageLightbox";
import type {
  XLiveScheduleHistoryRow,
  XLiveScheduleStatus,
} from "@/lib/x-live-schedules";
import { R_CARD_CLASS, R_EYEBROW_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { XLiveSchedulePoster as Poster } from "@/types/x-post";

type Layout = "aside" | "row";

type Props = {
  poster: Poster | XLiveScheduleHistoryRow;
  /** When set, show Agent status badge (week-synced history). */
  status?: XLiveScheduleStatus;
  errorMessage?: string | null;
  /**
   * `aside` = card beside the weekly list (desktop).
   * `row` = small thumbnail row above the weekly list (phone / tablet).
   */
  layout?: Layout;
};

/** Posted date in English, Bangkok time (site rule). */
function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

function statusLabel(status: XLiveScheduleStatus): string {
  switch (status) {
    case "pending":
      return "รอ Agent";
    case "imported":
      return "นำเข้าแล้ว";
    case "skipped":
      return "ข้ามแล้ว";
    case "failed":
      return "ล้มเหลว";
    default:
      return status;
  }
}

function statusClass(status: XLiveScheduleStatus): string {
  switch (status) {
    case "imported":
      return "bg-r-acc/12 text-r-acc ring-r-acc/40";
    case "pending":
      return "bg-[#d4a574]/12 text-[#e8c49a] ring-[#d4a574]/40";
    case "failed":
      return "bg-r-pri/12 text-r-text-2 ring-r-pri/45";
    case "skipped":
    default:
      return "bg-white/[0.04] text-r-text-3 ring-r-line";
  }
}

function StatusChip({ status }: { status: XLiveScheduleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs ring-1 ring-inset",
        statusClass(status)
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

/** X "Live Schedule" poster for the selected week on /live. */
export function XLiveSchedulePoster({
  poster,
  status,
  errorMessage,
  layout = "aside",
}: Props) {
  const [open, setOpen] = useState(false);
  const postedLabel = formatPostedAt(poster.posted_at);
  const resolvedStatus =
    status ??
    ("status" in poster
      ? (poster.status as XLiveScheduleStatus | undefined)
      : undefined);
  const resolvedError =
    errorMessage ??
    ("error_message" in poster ? poster.error_message : null);

  if (!poster.image_url) {
    return (
      <XLiveSchedulePosterEmpty
        layout={layout}
        hint="ยังไม่มี Live Schedule จาก X สำหรับสัปดาห์นี้"
      />
    );
  }

  const lightbox = (
    <ImageLightbox
      tone="mild-r"
      items={[
        {
          id: poster.tweet_id,
          src: poster.image_url,
          alt: "Live Schedule จาก X",
          caption: "Live Schedule",
        },
      ]}
      activeIndex={open ? 0 : null}
      onActiveIndexChange={(index) => setOpen(index !== null)}
    />
  );

  const xLink = poster.original_url ? (
    <a
      href={poster.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm text-r-text-2 ring-1 ring-r-text-2/25 ring-inset transition-colors hover:text-r-text hover:ring-r-pri/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
    >
      ดูบน X
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  ) : null;

  if (layout === "row") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="ขยายรูป Live Schedule"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
        >
          <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-r-bg ring-1 ring-r-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn(R_EYEBROW_CLASS, "block text-[0.65rem]")}>Live Schedule</span>
            <span className="mt-0.5 block truncate text-sm text-r-text">
              ภาพตารางจาก X{postedLabel ? ` · อัปเดต ${postedLabel}` : ""}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-r-acc">
              <ZoomIn className="size-3" aria-hidden />
              ดูภาพเต็ม
            </span>
          </span>
        </button>
        {resolvedStatus ? <StatusChip status={resolvedStatus} /> : null}
        {lightbox}
      </div>
    );
  }

  return (
    <div className={cn(R_CARD_CLASS, "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={R_EYEBROW_CLASS}>Live Schedule</p>
          <p className="mt-1.5 text-sm text-r-text">ภาพตารางจาก X</p>
          {postedLabel ? (
            <p className="mt-0.5 text-xs text-r-text-3">อัปเดต {postedLabel}</p>
          ) : null}
        </div>
        {resolvedStatus ? <StatusChip status={resolvedStatus} /> : null}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mt-4 block w-full overflow-hidden rounded-2xl bg-r-bg text-left ring-1 ring-r-line transition hover:ring-r-pri/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
        aria-label="ขยายรูป Live Schedule"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster.image_url}
          alt="Live Schedule จาก X"
          className="h-auto w-full object-contain"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-r-bg/80 px-2.5 py-1 text-xs text-r-text ring-1 ring-r-line backdrop-blur-sm transition duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
        >
          <ZoomIn className="size-3.5" />
          ดูภาพเต็ม
        </span>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {xLink}
        {resolvedError && resolvedStatus !== "imported" ? (
          <p className="max-w-full truncate text-xs text-r-text-3">{resolvedError}</p>
        ) : null}
      </div>
      {lightbox}
    </div>
  );
}

export function XLiveSchedulePosterEmpty({
  hint,
  layout = "aside",
  loading = false,
}: {
  hint: string;
  layout?: Layout;
  loading?: boolean;
}) {
  const text = loading ? "กำลังโหลด Live Schedule…" : hint;

  if (layout === "row") {
    return (
      <div className="flex items-center gap-3 p-1.5">
        <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-r-text-2/25 text-r-text-3">
          <ImageIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className={cn(R_EYEBROW_CLASS, "block text-[0.65rem]")}>Live Schedule</span>
          <span className="mt-0.5 block text-sm text-r-text-3">{text}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn(R_CARD_CLASS, "p-4")}>
      <p className={R_EYEBROW_CLASS}>Live Schedule</p>
      <div className="mt-4 flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-r-text-2/25 px-6 text-center text-sm text-r-text-3">
        <ImageIcon className="size-6" aria-hidden />
        {text}
      </div>
    </div>
  );
}
