"use client";

import { useState } from "react";

import { SERIF, THAI } from "@/components/cafe/board/pieces";
import { KeyholeMark } from "@/components/cafe/countdown/KeyholeMark";
import { isYoutubeId, youtubeEmbedSrc } from "@/lib/cafe-countdown-view";
import { cn } from "@/lib/utils";

const CORNER = cn(
  SERIF,
  "absolute bottom-[clamp(14px,1.8vw,24px)] text-[length:clamp(9px,0.85vw,12px)] font-bold tracking-[0.24em]"
);

type TeaserPlayerProps = {
  /** YouTube video id. Empty or invalid shows the "coming soon" frame. */
  videoId: string;
};

/**
 * 16:9 frame for the first teaser. The YouTube iframe is only added after
 * the visitor presses play, so the page stays light and nothing is sent to
 * YouTube before then.
 */
export function TeaserPlayer({ videoId }: TeaserPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const ready = isYoutubeId(videoId);

  return (
    <div className="relative mt-[clamp(18px,2vw,28px)] aspect-video w-full max-w-[880px] overflow-hidden border border-cafe-gold bg-[radial-gradient(ellipse_at_50%_50%,var(--color-cafe-glow)_0%,var(--color-cafe-void)_78%)] outline-1 outline-offset-[-8px] outline-cafe-gold/35">
      {ready && playing ? (
        <iframe
          src={youtubeEmbedSrc(videoId)}
          title="ทีเซอร์แรก · Sherlock Sweetie"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <>
          <KeyholeMark className="absolute top-1/2 left-1/2 h-[62%] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" />
          <div className="absolute inset-0 flex items-center justify-center">
            {ready ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="เล่นทีเซอร์แรกบน YouTube"
                className="flex size-[clamp(60px,6.4vw,88px)] items-center justify-center rounded-full bg-cafe-gold ring-8 ring-cafe-gold/35 transition hover:brightness-110 focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-cafe-cream"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="ml-[8%] size-[36%] fill-cafe-ink"
                >
                  <path d="M5 3 L21 12 L5 21 Z" />
                </svg>
              </button>
            ) : (
              <div className="text-center">
                <p
                  className={cn(
                    SERIF,
                    "pl-[0.3em] text-[length:clamp(13px,1.4vw,20px)] font-bold tracking-[0.3em] text-cafe-gold"
                  )}
                >
                  COMING SOON
                </p>
                <p
                  className={cn(
                    THAI,
                    "mt-1 text-[length:clamp(12px,1.1vw,16px)] text-cafe-cream/80"
                  )}
                >
                  เร็ว ๆ นี้
                </p>
              </div>
            )}
          </div>
          <span className={cn(CORNER, "left-[clamp(16px,2vw,28px)] text-cafe-cream/75")}>
            YOUTUBE
          </span>
          <span className={cn(CORNER, "right-[clamp(16px,2vw,28px)] text-cafe-gold")}>
            EVIDENCE No. 01
          </span>
        </>
      )}
    </div>
  );
}
