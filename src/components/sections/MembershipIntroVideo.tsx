"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { getYoutubeEmbedUrl } from "@/lib/youtube";

type MembershipIntroVideoProps = {
  videoId: string;
  title: string;
};

/** Click-to-play YouTube embed so the home page doesn't load the player up front. */
export function MembershipIntroVideo({ videoId, title }: MembershipIntroVideoProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#f3b8c4]/12 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      {playing ? (
        <iframe
          title={title}
          src={getYoutubeEmbedUrl(videoId, true)}
          className="absolute inset-0 h-full w-full"
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
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/10">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#e85a7a]/90 text-white shadow-lg transition group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-[#fff5f7]/70">
              <Play className="size-7 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
