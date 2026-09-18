"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { ImageLightbox } from "@/components/media/ImageLightbox";
import { META_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { XLiveSchedulePoster as Poster } from "@/types/x-post";

type Props = {
  poster: Poster;
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

/** Latest X "Live Schedule" poster — shown at the bottom of /live. */
export function XLiveSchedulePoster({ poster }: Props) {
  const [open, setOpen] = useState(false);
  const postedLabel = formatPostedAt(poster.posted_at);

  return (
    <section className="mt-16 sm:mt-20" aria-labelledby="x-live-schedule-heading">
      <p className={META_CLASS}>From X</p>
      <h2
        id="x-live-schedule-heading"
        className="mt-3 font-[family-name:var(--font-display)] text-2xl font-normal tracking-normal text-[#fff5f7] sm:text-3xl"
      >
        Live Schedule
      </h2>
      {postedLabel ? (
        <p className="mt-2 text-sm text-[#f3b8c4]/65">อัปเดต {postedLabel}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group mt-6 block w-full overflow-hidden rounded-2xl border border-[#f3b8c4]/18 bg-[#1a0c12]/50 text-left transition",
          "hover:border-[#e85a7a]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/50"
        )}
        aria-label="ขยายรูป Live Schedule"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster.image_url}
          alt="Live Schedule จาก X"
          className="h-auto w-full object-contain transition duration-300 group-hover:brightness-110"
        />
      </button>

      {poster.original_url ? (
        <a
          href={poster.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#f3b8c4]/75 transition hover:text-[#f3b8c4]"
        >
          ดูบน X
          <ExternalLink className="size-3.5 opacity-80" aria-hidden />
        </a>
      ) : null}

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
    </section>
  );
}
