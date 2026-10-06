"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Heart, Lock, Play, Search, SlidersHorizontal, X } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { useLoadMoreOnScroll } from "@/hooks/useLoadMoreOnScroll";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
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
const MEMBERSHIP_JOIN_URL = "https://www.youtube.com/@MildRWorldEnd/join";

/** "member" = members-only uploads; they show in "all" and "member" but not in the kind tabs. */
type KindFilter = "all" | VideoKind | "member";
type ChannelFilter = "all" | "own" | "collab";

const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "video", label: VIDEO_KIND_LABEL.video },
  { key: "short", label: VIDEO_KIND_LABEL.short },
  { key: "premiere", label: VIDEO_KIND_LABEL.premiere },
  { key: "member", label: "Member" },
];

function matchesKind(item: VideoItem, filter: KindFilter): boolean {
  if (filter === "all") return true;
  if (filter === "member") return item.membersOnly;
  return !item.membersOnly && item.kind === filter;
}

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
      {item.membersOnly ? (
        <span
          className={cn(
            LIVE_BADGE_PILL_SM,
            "inline-flex items-center gap-1 text-[0.6rem]",
            LIVE_BADGE_MEMBER
          )}
        >
          <Lock className="size-2.5" aria-hidden />
          Member
        </span>
      ) : null}
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

function MembershipIntro({ item }: { item: VideoItem }) {
  const [playing, setPlaying] = useState(false);
  const views = formatVideoViews(item.views);

  return (
    <section
      aria-label="คลิปแนะนำการสมัครสมาชิก"
      className="mt-6 grid gap-4 overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#1a0c12]/70 p-3 sm:mt-8 sm:p-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-6"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {playing ? (
          <iframe
            title={item.title}
            src={getYoutubeEmbedUrl(item.videoId, true)}
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
            aria-label={`เล่นคลิปแนะนำ ${item.title}`}
          >
            <ProtectedImage
              src={item.coverUrl}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/10">
              <span className="flex size-14 items-center justify-center rounded-full bg-[#e85a7a]/90 text-white shadow-lg transition group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-[#fff5f7]/70">
                <Play className="size-6 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="px-1 pb-1 md:px-0 md:pb-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(LIVE_BADGE_PILL_SM, "inline-flex items-center gap-1 text-[0.6rem]", LIVE_BADGE_MEMBER)}>
            <Lock className="size-2.5" aria-hidden />
            Membership
          </span>
          {item.durationLabel ? (
            <span className="text-xs text-[#f3b8c4]/55">
              {item.durationLabel}
              {views ? ` · ${views}` : null}
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg leading-snug text-[#fff5f7] sm:text-xl">
          มาเป็นสมาชิกช่อง Mild-R กัน
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#f3b8c4]/70">
          สมาชิกช่องดูคลิปเมมเบอร์ทั้งหมดในหน้านี้ได้บน YouTube ดูรายละเอียดสิทธิพิเศษได้จากคลิปแนะนำ
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={MEMBERSHIP_JOIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), CTA_PRIMARY_CLASS, "px-5")}
          >
            <Heart className="size-4" aria-hidden />
            สมัครสมาชิก
          </a>
          <a
            href={item.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), CTA_OUTLINE_CLASS, "px-5")}
          >
            ดูบน YouTube
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const activeFilterCount = Number(channel !== "all") + Number(year !== "all");

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
    const out: Record<KindFilter, number> = {
      all: scoped.length,
      video: 0,
      short: 0,
      premiere: 0,
      member: 0,
    };
    for (const v of scoped) out[v.membersOnly ? "member" : v.kind] += 1;
    return out;
  }, [scoped]);

  const filtered = useMemo(
    () => scoped.filter((v) => matchesKind(v, kind)),
    [scoped, kind]
  );
  const hasMembers = useMemo(() => videos.some((v) => v.membersOnly), [videos]);
  const membershipIntro = useMemo(() => videos.find((v) => v.membershipIntro) ?? null, [videos]);
  const visible = filtered.slice(0, visibleCount);
  const shortsOnly = kind === "short";
  const active = activeId ? (videos.find((v) => v.videoId === activeId) ?? null) : null;

  const hasMore = visible.length < filtered.length;
  const { sentinelRef, auto: autoLoad } = useLoadMoreOnScroll({
    hasMore,
    onLoadMore: () => setVisibleCount(visible.length + PAGE_STEP),
    resetKey: `${kind}|${channel}|${year}|${normalizedQuery}`,
  });

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
    if (item.embeddable || item.membersOnly) setActiveId(item.videoId);
    else window.open(item.youtubeUrl, "_blank", "noopener,noreferrer");
  };

  if (videos.length === 0) {
    return <p className="mt-8 text-sm text-[#f3b8c4]/60">ยังไม่มีคลิป</p>;
  }

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2" role="tablist" aria-label="ประเภทคลิป">
          {KIND_FILTERS.filter(({ key }) => key !== "member" || hasMembers).map(({ key, label }) => (
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

        <div className="flex w-full gap-2 lg:w-64">
          <label className="relative block min-w-0 flex-1">
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
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            aria-haspopup="dialog"
            aria-label={activeFilterCount ? `ตัวกรอง (${activeFilterCount})` : "ตัวกรอง"}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition sm:hidden",
              activeFilterCount
                ? "border-[#e85a7a]/55 bg-[#e85a7a]/15 text-[#fff5f7]"
                : "border-[#f3b8c4]/15 bg-[#1a0c12]/70 text-[#f3b8c4]/80"
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            ตัวกรอง
            {activeFilterCount ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-[#e85a7a] text-[0.65rem] font-medium text-[#140a0d]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex" role="group" aria-label="กรองตามช่องและปี">
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

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>ตัวกรอง</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-6 px-5 pb-4">
            <fieldset>
              <legend className="text-xs tracking-[0.12em] text-[#f3b8c4]/60 uppercase">ช่อง</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHANNEL_FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={channel === key}
                    onClick={() => selectChannel(key)}
                    className={cn(PILL_CLASS, "px-4 py-2", channel === key ? PILL_ACTIVE_CLASS : PILL_IDLE_CLASS)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {years.length > 1 ? (
              <fieldset>
                <legend className="text-xs tracking-[0.12em] text-[#f3b8c4]/60 uppercase">ปี</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["all", ...years].map((key) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={year === key}
                      onClick={() => selectYear(key)}
                      className={cn(PILL_CLASS, "px-4 py-2", year === key ? PILL_ACTIVE_CLASS : PILL_IDLE_CLASS)}
                    >
                      {key === "all" ? "ทุกปี" : key}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </SheetBody>
          <div className="flex shrink-0 gap-2 border-t border-[#f3b8c4]/10 px-5 pt-3">
            <button
              type="button"
              disabled={!activeFilterCount}
              onClick={() => {
                selectChannel("all");
                selectYear("all");
              }}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), CTA_OUTLINE_CLASS, "flex-1 disabled:opacity-40")}
            >
              ล้างตัวกรอง
            </button>
            <SheetClose className={cn(buttonVariants({ size: "lg" }), CTA_PRIMARY_CLASS, "flex-1")}>
              ดู {filtered.length} คลิป
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      {kind === "member" && membershipIntro ? <MembershipIntro item={membershipIntro} /> : null}

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

      {autoLoad ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}

      {hasMore && !autoLoad ? (
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
                {active.membersOnly ? (
                  <>
                    <ProtectedImage
                      src={active.coverUrl}
                      alt={active.title}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover opacity-35 blur-[2px]"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-[#140a0d]/90 via-[#140a0d]/40 to-transparent p-4 text-center">
                      <span className="flex size-14 items-center justify-center rounded-full border border-[#f3b8c4]/30 bg-[#140a0d]/70 text-[#f3b8c4] shadow-lg">
                        <Lock className="size-6" aria-hidden />
                      </span>
                      <p className="font-[family-name:var(--font-display)] text-base text-[#fff5f7] sm:text-lg">
                        คลิปนี้สำหรับสมาชิกช่อง (Member) เท่านั้น
                      </p>
                      <p className="max-w-sm text-xs text-[#f3b8c4]/70 sm:text-sm">
                        ดูได้บน YouTube เมื่อเป็นสมาชิกช่อง Mild-R
                      </p>
                    </div>
                  </>
                ) : (
                  <iframe
                    key={active.videoId}
                    title={active.title}
                    src={getYoutubeEmbedUrl(active.videoId, true)}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>

              {active.membersOnly ? (
                <div className="flex flex-col gap-2 px-1 pt-3 sm:flex-row sm:justify-end sm:px-2">
                  <a
                    href={MEMBERSHIP_JOIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), CTA_OUTLINE_CLASS, "px-5")}
                  >
                    <Heart className="size-4" aria-hidden />
                    สมัครสมาชิก
                  </a>
                  <a
                    href={active.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: "lg" }), CTA_PRIMARY_CLASS, "px-5")}
                  >
                    ดูบน YouTube
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                </div>
              ) : (
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
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
