"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import { getYoutubeEmbedUrl, getYoutubePosterUrl } from "@/lib/youtube";

type MembershipIntroVideoProps = {
  videoId: string;
  title: string;
  /** Label under the play button, e.g. "คลิปแนะนำ MyHoney". */
  label?: string;
  className?: string;
};

/** Click-to-play YouTube embed — the player loads only after the tap (project R · Member). */
export function MembershipIntroVideo({ videoId, title, label, className }: MembershipIntroVideoProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-[22px] bg-r-bg shadow-[0_0_40px_color-mix(in_srgb,var(--r-pri)_18%,transparent)] ring-[1.5px] ring-r-pri/32",
        className
      )}
    >
      {playing ? (
        <iframe
          title={title}
          src={getYoutubeEmbedUrl(videoId, true)}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 outline-none"
          aria-label={`เล่นคลิป ${title}`}
        >
          <ProtectedImage
            src={getYoutubePosterUrl(videoId)}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--r-pri)_30%,transparent),transparent_60%),linear-gradient(0deg,color-mix(in_srgb,var(--r-bg)_75%,transparent),color-mix(in_srgb,var(--r-bg)_25%,transparent))]"
          />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="r-ping flex size-16 items-center justify-center rounded-full bg-r-pri text-r-text transition-transform group-hover:scale-105 group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-r-acc">
              <Play aria-hidden className="size-6 fill-current" />
            </span>
            {label ? (
              <span className="font-[family-name:var(--font-display)] text-[0.8125rem] tracking-[0.12em] text-r-text">{label}</span>
            ) : null}
          </span>
        </button>
      )}
    </div>
  );
}
