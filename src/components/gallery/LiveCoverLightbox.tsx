"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Layers } from "lucide-react";

import { ImageLightbox, type ImageLightboxItem } from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import type { LiveCoverItem, LiveCoverVersion } from "@/lib/live-streams";
import {
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_MILD,
  LIVE_BADGE_PILL_SM,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

/** "29 ต.ค. 2026" (Bangkok). */
export function formatCoverDate(ymd: string | null): string {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH-u-ca-gregory", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function versionLabel(version: LiveCoverVersion): string {
  if (version.source === "x") return "X · HD";
  return version.capturedAt ? formatCaptured(version.capturedAt) : "YouTube";
}

function formatCaptured(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  });
}

const hdProbes = new Map<string, Promise<boolean>>();

/** YouTube answers a missing maxresdefault with a 120×90 placeholder (HTTP 404). */
function probeHdCover(url: string): Promise<boolean> {
  let probe = hdProbes.get(url);
  if (!probe) {
    probe = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 120);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    hdProbes.set(url, probe);
  }
  return probe;
}

function versionSrc(
  version: LiveCoverVersion | undefined,
  hdReady: ReadonlySet<string>
): string | undefined {
  if (!version) return undefined;
  return version.hdUrl && hdReady.has(version.hdUrl)
    ? version.hdUrl
    : version.url;
}

export function ChannelBadge({ item }: { item: LiveCoverItem }) {
  return (
    <>
      <span
        className={cn(
          LIVE_BADGE_PILL_SM,
          "min-w-0 truncate text-[0.6rem]",
          item.isOwnChannel ? LIVE_BADGE_MILD : LIVE_BADGE_COLLAB
        )}
      >
        {item.channelLabel}
      </span>
      {item.isOwnChannel && item.isCollab ? (
        <span className={cn(LIVE_BADGE_PILL_SM, "text-[0.6rem]", LIVE_BADGE_COLLAB)}>
          Collab
        </span>
      ) : null}
      {item.isMember ? (
        <span className={cn(LIVE_BADGE_PILL_SM, "text-[0.6rem]", LIVE_BADGE_MEMBER)}>
          Member
        </span>
      ) : null}
    </>
  );
}

type LiveCoverLightboxProps = {
  covers: LiveCoverItem[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
};

/**
 * Live cover viewer shared by /gallery/live and the home Gallery: HD cover when YouTube has
 * one, every archived cover version (X post, current, older captures) and a YouTube link.
 */
export function LiveCoverLightbox({ covers, activeIndex, onActiveIndexChange }: LiveCoverLightboxProps) {
  const [versionIndex, setVersionIndex] = useState(0);
  const [versionOf, setVersionOf] = useState<number | null>(activeIndex);
  const [hdReady, setHdReady] = useState<ReadonlySet<string>>(() => new Set());

  // Each cover opens on its first version.
  if (versionOf !== activeIndex) {
    setVersionOf(activeIndex);
    setVersionIndex(0);
  }

  const active = activeIndex !== null ? (covers[activeIndex] ?? null) : null;
  const items: ImageLightboxItem[] = covers.map((cover, index) => ({
    id: cover.videoId,
    src: versionSrc(cover.versions[index === activeIndex ? versionIndex : 0], hdReady) ?? cover.coverUrl,
    alt: cover.title,
  }));

  const hdProbeKey =
    activeIndex === null || covers.length === 0
      ? ""
      : [
          covers[activeIndex]?.versions[versionIndex]?.hdUrl,
          covers[(activeIndex + 1) % covers.length]?.versions[0]?.hdUrl,
          covers[(activeIndex - 1 + covers.length) % covers.length]?.versions[0]?.hdUrl,
        ]
          .filter(Boolean)
          .join(" ");

  useEffect(() => {
    if (!hdProbeKey) return;
    let cancelled = false;
    for (const url of hdProbeKey.split(" ")) {
      void probeHdCover(url).then((ok) => {
        if (!ok || cancelled) return;
        setHdReady((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [hdProbeKey]);

  return (
    <ImageLightbox
      items={items}
      activeIndex={active ? activeIndex : null}
      onActiveIndexChange={onActiveIndexChange}
      useProtectedImage
      prevLabel="ปกก่อนหน้า"
      nextLabel="ปกถัดไป"
      aspect="video"
      subtitle={
        active ? (
          <>
            <ChannelBadge item={active} />
            {active.date ? <span>{formatCoverDate(active.date)}</span> : null}
          </>
        ) : null
      }
      drawer={
        active && active.versions.length > 1
          ? {
              label: "ปกเวอร์ชันอื่น",
              count: active.versions.length,
              icon: Layers,
              content: (
                <ul className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto pb-1">
                  {active.versions.map((v, i) => (
                    <li key={v.url} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setVersionIndex(i)}
                        aria-label={`ปกเวอร์ชัน ${versionLabel(v)}`}
                        aria-pressed={versionIndex === i}
                        className={cn(
                          "block w-24 overflow-hidden rounded-lg border transition sm:w-28",
                          versionIndex === i
                            ? "border-[#e85a7a]/70"
                            : "border-[#f3b8c4]/15 opacity-70 hover:opacity-100"
                        )}
                      >
                        <ProtectedImage
                          src={v.thumbUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-video w-full object-cover"
                        />
                        <span className="block px-1.5 py-1 text-left text-[0.65rem] text-[#f3b8c4]/65">
                          {versionLabel(v)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ),
            }
          : undefined
      }
      footerStart={
        active ? (
          <a
            href={active.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#f3b8c4]/75 transition hover:text-[#f3b8c4]"
          >
            ดูบน YouTube
            <ExternalLink className="size-3.5 opacity-80" aria-hidden />
          </a>
        ) : null
      }
    />
  );
}
