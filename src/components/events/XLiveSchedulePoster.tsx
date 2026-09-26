"use client";

import { useState } from "react";
import { ExternalLink, ZoomIn } from "lucide-react";

import { ImageLightbox } from "@/components/media/ImageLightbox";
import type {
  XLiveScheduleHistoryRow,
  XLiveScheduleStatus,
} from "@/lib/x-live-schedules";
import { BADGE_SOFT_CLASS, META_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { XLiveSchedulePoster as Poster } from "@/types/x-post";

type Props = {
  poster: Poster | XLiveScheduleHistoryRow;
  /** When set, show Agent status badge (week-synced history). */
  status?: XLiveScheduleStatus;
  errorMessage?: string | null;
  /** Embed under weekly table instead of standalone section. */
  embedded?: boolean;
  emptyHint?: string | null;
};

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
      return "border-[#6ec9b0]/35 text-[#a8e6d4]";
    case "pending":
      return "border-[#d4a574]/40 text-[#e8c9a0]";
    case "failed":
      return "border-[#e85a7a]/45 text-[#f3b8c4]";
    case "skipped":
    default:
      return "border-[#f3b8c4]/25 text-[#f3b8c4]/75";
  }
}

/** X "Live Schedule" poster — standalone or week-synced embed on /live. */
export function XLiveSchedulePoster({
  poster,
  status,
  errorMessage,
  embedded = false,
  emptyHint,
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
    if (!emptyHint) return null;
    return (
      <div
        className={cn(
          embedded
            ? "border-t border-[#f3b8c4]/10 px-4 py-5 sm:px-5"
            : "mt-10"
        )}
      >
        <p className="text-sm text-[#f3b8c4]/45">{emptyHint}</p>
      </div>
    );
  }

  const body = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!embedded ? <p className={META_CLASS}>From X</p> : null}
          <h2
            id={embedded ? undefined : "x-live-schedule-heading"}
            className={cn(
              embedded
                ? "font-[family-name:var(--font-display)] text-base font-normal text-[#fff5f7] sm:text-lg"
                : "mt-3 font-[family-name:var(--font-display)] text-2xl font-normal tracking-normal text-[#fff5f7] sm:text-3xl"
            )}
          >
            Live Schedule
          </h2>
          {postedLabel ? (
            <p className="mt-1 text-xs text-[#f3b8c4]/65 sm:text-sm">
              อัปเดต {postedLabel}
            </p>
          ) : null}
        </div>
        {resolvedStatus ? (
          <span
            className={cn(
              BADGE_SOFT_CLASS,
              "uppercase",
              statusClass(resolvedStatus)
            )}
          >
            {statusLabel(resolvedStatus)}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative mt-4 block w-full overflow-hidden rounded-2xl border border-[#f3b8c4]/18 bg-[#1a0c12]/50 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/50",
          !embedded && "mt-6"
        )}
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
          className={cn(
            "pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full",
            "border border-[#f3b8c4]/25 bg-[#1a0c12]/75 px-2.5 py-1 text-xs text-[#fff5f7] backdrop-blur-sm",
            "opacity-70 transition duration-200 sm:translate-y-1 sm:opacity-0",
            "sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
            "sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100"
          )}
        >
          <ZoomIn className="size-3.5" />
          ดูภาพเต็ม
        </span>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {poster.original_url ? (
          <a
            href={poster.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#f3b8c4]/75 transition hover:text-[#f3b8c4]"
          >
            ดูบน X
            <ExternalLink className="size-3.5 opacity-80" aria-hidden />
          </a>
        ) : null}
        {resolvedError && resolvedStatus !== "imported" ? (
          <p className="max-w-full truncate text-xs text-[#f3b8c4]/45">
            {resolvedError}
          </p>
        ) : null}
      </div>

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
    </>
  );

  if (embedded) {
    return (
      <div className="border-t border-[#f3b8c4]/10 px-4 py-5 sm:px-5">
        {body}
      </div>
    );
  }

  return (
    <section
      className="mt-16 sm:mt-20"
      aria-labelledby="x-live-schedule-heading"
    >
      {body}
    </section>
  );
}

export function XLiveSchedulePosterEmpty({ hint }: { hint: string }) {
  return (
    <div className="border-t border-[#f3b8c4]/10 px-4 py-5 sm:px-5">
      <p className={META_CLASS}>From X</p>
      <p className="mt-2 text-sm text-[#f3b8c4]/45">{hint}</p>
    </div>
  );
}
