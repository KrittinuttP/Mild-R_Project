"use client";

import { useEffect, useRef, useState } from "react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import type { CafeHeroMotion } from "@/types/vtuber";

/**
 * Desktop Safari and every iOS browser (all WebKit): they play VP9 but drop
 * its alpha, so they need the HEVC + alpha file instead.
 */
function needsHevc() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS asks for the desktop site with a Mac user agent.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|Android/.test(ua);
}

function pickSource(motion: Omit<CafeHeroMotion, "poster">, small: boolean) {
  if (needsHevc()) return small ? (motion.movSmall ?? motion.mov) : motion.mov;
  return small ? (motion.webmSmall ?? motion.webm) : motion.webm;
}

/** Wait this long after the page has loaded, so the video never competes with it. */
const START_DELAY_MS = 400;

type KvMotionProps = {
  motion: CafeHeroMotion;
  /** The video's first frame as a still: painted first, kept for reduced motion / Save-Data / no video. */
  poster: string;
  alt: string;
  className?: string;
};

/**
 * Live2D Key Visual (half body). Its first frame, as a still, paints first;
 * the video loads after the page and fades in over it. It
 * plays only while on screen and the tab is visible.
 */
export function KvMotion({ motion, poster, alt, className }: KvMotionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData;
    if (reduce || saveData) return;

    const next = pickSource(
      { webm: motion.webm, webmSmall: motion.webmSmall, mov: motion.mov, movSmall: motion.movSmall },
      window.matchMedia("(max-width: 639px)").matches
    );
    if (!next) return;

    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => setSrc(next), START_DELAY_MS);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", start);
    };
    // Strings, not the object: a rebuilt `cafe` must not restart (or retry) the video.
  }, [motion.webm, motion.webmSmall, motion.mov, motion.movSmall]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const sync = () => {
      if (inView.current && !document.hidden) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05 }
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [src]);

  return (
    <span data-protect-media className={cn("relative block", className)}>
      <ProtectedImage
        src={poster}
        alt={alt}
        className={cn(
          "absolute inset-0 size-full object-cover object-top",
          // Fades out only once the video is mostly in, so she never looks see-through.
          playing && "opacity-0 transition-opacity delay-300 duration-300"
        )}
      />
      {src ? (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload noplaybackrate noremoteplayback"
          onPlaying={() => setPlaying(true)}
          onError={() => {
            setSrc(null);
            setPlaying(false);
          }}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            playing ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
    </span>
  );
}
