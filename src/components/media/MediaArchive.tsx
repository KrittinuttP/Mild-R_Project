"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Play, Search, X } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CTA_OUTLINE_CLASS,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MILD,
  LIVE_BADGE_PILL_SM,
  LIVE_BADGE_SOFT,
} from "@/lib/site-ui";
import {
  formatVideoDate,
  formatVideoViews,
  VIDEO_KIND_LABEL,
} from "@/lib/video-format";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import type { VideoItem, VideoKind } from "@/types/video";

const PAGE_STEP = 24;

type KindFilter = "all" | VideoKind;
type ChannelFilter = "all" | "own" | "collab";

const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "video", label: VIDEO_KIND_LABEL.video },
  { key: "short", label: VIDEO_KIND_LABEL.short },
  { key: "premiere", label: VIDEO_KIND_LABEL.premiere },
];

const CHANNEL_FILTERS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "ทุกช่อง" },
  { key: "own", label: "Mild-R" },
  { key: "collab", label: "Collab" },
];

const WIDE_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4";
const SHORTS_GRID_CLASS =
  "grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6";

const PILL_CLASS =
  "shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition sm:px-3.5 sm:text-sm";
const PILL_ACTIVE_CLASS = "border-[#e85a7a]/60 bg-[#e85a7a]/20 text-[#fff5f7]";
const PILL_IDLE_CLASS =
  "border-[#f3b8c4]/20 text-[#f3b8c4]/70 hover:border-[#f3b8c4]/40 hover:text-[#fff5f7]";
const SUB_PILL_CLASS = "rounded-full border px-3 py-1 text-[0.7rem] transition sm:text-xs";
const SUB_PILL_ACTIVE_CLASS = "border-[#f3b8c4]/45 bg-[#f3b8c4]/12 text-[#fff5f7]";
const SUB_PILL_IDLE_CLASS =
  "border-[#f3b8c4]/12 text-[#f3b8c4]/60 hover:border-[#f3b8c4]/35 hover:text-[#fff5f7]";

function normalizeSearch(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase();
}

function matchesChannel(item: VideoItem, filter: ChannelFilter): boolean {
  if (filter === "own") return item.isOwnChannel;
  if (filter === "collab") return !item.isOwnChannel;
  return true;
}

function yearsOf(items: VideoItem[]): string[] {
  const years = new Set<string>();
  for (const item of items) {
    const y = item.date?.slice(0, 4);
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

function VideoBadges({ item }: { item: VideoItem }) {
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
      {item.kind !== "video" ? (
        <span className={cn(LIVE_BADGE_PILL_SM, "text-[0.6rem]", LIVE_BADGE_SOFT)}>
          {VIDEO_KIND_LABEL[item.kind]}
        </span>
      ) : null}
    </>
  );
}

function VideoTile({
  item,
  vertical,
  onOpen,
}: {
  item: VideoItem;
  vertical: boolean;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left outline-none"
        aria-label={`ดูคลิป ${item.title}`}
      >
        <span
          className={cn(
            "relative block overflow-hidden rounded-xl border border-[#f3b8c4]/12 bg-[#1a0c12]",
            "transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#f3b8c4]/30",
            "group-focus-visible:ring-2 group-focus-visible:ring-[#e85a7a]/60",
            vertical ? "aspect-[9/16]" : "aspect-video"
          )}
        >
          {!loaded && !failed ? (
            <span className="absolute inset-0 animate-pulse bg-[#241019]" />
          ) : null}
          {failed ? (
            <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-[#f3b8c4]/50">
              {item.title}
            </span>
          ) : (
            <ProtectedImage
              src={vertical ? item.coverUrl : item.thumbUrl}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                loaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
          {item.durationLabel && !vertical ? (
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
              {item.durationLabel}
            </span>
          ) : null}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#e85a7a]/90 text-white shadow-lg">
              <Play className="size-5 fill-current" />
            </span>
          </span>
        </span>
        <span className="mt-2 block px-0.5">
          <span className="line-clamp-2 text-sm leading-snug text-[#fff5f7]/90">
            {item.title}
          </span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <VideoBadges item={item} />
            {item.date ? (
              <span className="shrink-0 text-[0.7rem] text-[#f3b8c4]/55">
                {formatVideoDate(item.date)}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

/** /media: every non-live upload (videos, Shorts, Premieres) with filters. */
export function MediaArchive({ videos }: { videos: VideoItem[] }) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [year, setYear] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [activeId, setActiveId] = useState<string | null>(null);

  const years = useMemo(() => yearsOf(videos), [videos]);
  const normalizedQuery = normalizeSearch(query);

  const scoped = useMemo(
    () =>
      videos.filter(
        (v) =>
          matchesChannel(v, channel) &&
          (year === "all" || v.date?.startsWith(year)) &&
          (!normalizedQuery ||
            normalizeSearch(`${v.title} ${v.channelLabel}`).includes(normalizedQuery))
      ),
    [videos, channel, year, normalizedQuery]
  );

  const counts = useMemo(() => {
    const out: Record<KindFilter, number> = { all: scoped.length, video: 0, short: 0, premiere: 0 };
    for (const v of scoped) out[v.kind] += 1;
    return out;
  }, [scoped]);

  const filtered = useMemo(
    () => (kind === "all" ? scoped : scoped.filter((v) => v.kind === kind)),
    [scoped, kind]
  );
  const visible = filtered.slice(0, visibleCount);
  const shortsOnly = kind === "short";
  const active = activeId ? (videos.find((v) => v.videoId === activeId) ?? null) : null;

  const resetPaging = () => setVisibleCount(PAGE_STEP);

  const selectKind = (next: KindFilter) => {
    setKind(next);
    resetPaging();
  };
  const selectChannel = (next: ChannelFilter) => {
    setChannel(next);
    resetPaging();
  };
  const selectYear = (next: string) => {
    setYear(next);
    resetPaging();
  };
  const changeQuery = (next: string) => {
    setQuery(next);
    resetPaging();
  };

  const openVideo = (item: VideoItem) => {
    if (item.embeddable) setActiveId(item.videoId);
    else window.open(item.youtubeUrl, "_blank", "noopener,noreferrer");
  };

  if (videos.length === 0) {
    return <p className="mt-8 text-sm text-[#f3b8c4]/60">ยังไม่มีคลิป</p>;
  }

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div
          className="-mx-5 flex min-w-0 gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-10 sm:gap-2 sm:px-10 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="ประเภทคลิป"
        >
          {KIND_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={kind === key}
              onClick={() => selectKind(key)}
              className={cn(PILL_CLASS, kind === key ? PILL_ACTIVE_CLASS : PILL_IDLE_CLASS)}
            >
              {label}
              <span className="ml-1.5 text-[#f3b8c4]/55">{counts[key]}</span>
            </button>
          ))}
        </div>

        <label className="relative block w-full lg:w-64">
          <span className="sr-only">ค้นหาคลิป</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#f3b8c4]/45"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="ค้นหาชื่อคลิป หรือช่อง…"
            enterKeyHint="search"
            className={cn(
              "h-10 w-full rounded-full border border-[#f3b8c4]/15 bg-[#1a0c12]/70 pr-9 pl-9 text-sm text-[#fff5f7] transition outline-none",
              "placeholder:text-[#f3b8c4]/40 focus:border-[#e85a7a]/55 focus:bg-[#1a0c12]",
              "[&::-webkit-search-cancel-button]:appearance-none"
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => changeQuery("")}
              aria-label="ล้างคำค้น"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#f3b8c4]/60 transition hover:bg-[#f3b8c4]/10 hover:text-[#fff5f7]"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="กรองตามช่อง">
        {CHANNEL_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={channel === key}
            onClick={() => selectChannel(key)}
            className={cn(SUB_PILL_CLASS, channel === key ? SUB_PILL_ACTIVE_CLASS : SUB_PILL_IDLE_CLASS)}
          >
            {label}
          </button>
        ))}
        {years.length > 1 ? (
          <>
            <span aria-hidden className="mx-1 self-center text-[#f3b8c4]/25">
              |
            </span>
            {["all", ...years].map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={year === key}
                onClick={() => selectYear(key)}
                className={cn(SUB_PILL_CLASS, year === key ? SUB_PILL_ACTIVE_CLASS : SUB_PILL_IDLE_CLASS)}
              >
                {key === "all" ? "ทุกปี" : key}
              </button>
            ))}
          </>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-[#f3b8c4]/60">
          {normalizedQuery ? `ไม่พบคลิปที่ตรงกับ “${query.trim()}”` : "ยังไม่มีคลิปในหมวดนี้"}
        </p>
      ) : (
        <ul className={cn("mt-6 sm:mt-8", shortsOnly ? SHORTS_GRID_CLASS : WIDE_GRID_CLASS)}>
          {visible.map((item) => (
            <VideoTile
              key={item.videoId}
              item={item}
              vertical={shortsOnly}
              onOpen={() => openVideo(item)}
            />
          ))}
        </ul>
      )}

      {visible.length < filtered.length ? (
        <div className="mt-10 flex justify-center sm:mt-12">
          <button
            type="button"
            onClick={() => setVisibleCount(visible.length + PAGE_STEP)}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), CTA_OUTLINE_CLASS, "px-6")}
          >
            โหลดเพิ่ม
            <span className="ml-2 text-[#f3b8c4]/70">({filtered.length - visible.length})</span>
          </button>
        </div>
      ) : null}

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[94dvh] w-[min(100%,calc(100vw-1rem))] overflow-y-auto border-[#f3b8c4]/20 bg-[#140a0d] p-3 text-[#fff5f7] sm:p-4",
            active?.kind === "short" ? "max-w-sm sm:max-w-sm" : "max-w-4xl sm:max-w-4xl"
          )}
          showCloseButton
        >
          {active ? (
            <>
              <DialogHeader className="px-1 pt-1 pr-10 sm:px-2">
                <DialogTitle className="font-[family-name:var(--font-display)] text-base leading-snug text-[#fff5f7] sm:text-lg">
                  {active.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-[#f3b8c4]/70">
                  <VideoBadges item={active} />
                  {active.date ? <span>{formatVideoDate(active.date)}</span> : null}
                  {formatVideoViews(active.views) ? (
                    <span>· {formatVideoViews(active.views)}</span>
                  ) : null}
                </DialogDescription>
              </DialogHeader>

              <div
                className={cn(
                  "relative mt-1 overflow-hidden rounded-xl bg-black",
                  active.kind === "short" ? "mx-auto aspect-[9/16] max-h-[72dvh]" : "aspect-video"
                )}
              >
                <iframe
                  key={active.videoId}
                  title={active.title}
                  src={getYoutubeEmbedUrl(active.videoId, true)}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <div className="px-1 pt-2 sm:px-2">
                <a
                  href={active.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#f3b8c4]/75 transition hover:text-[#f3b8c4]"
                >
                  ดูบน YouTube
                  <ExternalLink className="size-3.5 opacity-80" aria-hidden />
                </a>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
