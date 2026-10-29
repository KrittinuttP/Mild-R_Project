"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, Lightbulb, Play, Smartphone, type LucideIcon } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { useVideos } from "@/hooks/useVideos";
import { groupMediaClips, MEDIA_CATEGORY_LABEL, type MediaGroupId } from "@/lib/media";
import { R_CTA_OUTLINE_CLASS, R_CTA_PRIMARY_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import { getYoutubeEmbedUrl, getYoutubePosterUrl, getYoutubeThumbnailUrl, getYoutubeVideoId } from "@/lib/youtube";
import type { MediaClip, VtuberProfile } from "@/types/vtuber";
import type { VideoItem } from "@/types/video";

type MediaProps = {
  data: VtuberProfile;
};

/* ── tabs ─────────────────────────────────────────────────────────── */

type DynamicTabId = "latest" | "shorts";
type TabId = MediaGroupId | DynamicTabId;

const DYNAMIC_TAB_LIMIT = 8;
const DYNAMIC_TABS: Array<{ id: DynamicTabId; label: string; icon: LucideIcon; query: string }> = [
  { id: "latest", label: "คลิปล่าสุด", icon: Clock, query: `kind=video,premiere&limit=${DYNAMIC_TAB_LIMIT}` },
  { id: "shorts", label: "Shorts", icon: Smartphone, query: `kind=short&limit=${DYNAMIC_TAB_LIMIT}` },
];

function TabChip({
  selected,
  icon: Icon,
  label,
  count,
  mint = false,
  onClick,
}: {
  selected: boolean;
  icon: LucideIcon;
  label: string;
  count?: number;
  /** auto-updating tabs (latest · Shorts) get a mint icon */
  mint?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-[7px] rounded-full py-[7px] pr-3.5 pl-[11px] text-[0.8125rem] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
        selected
          ? "bg-r-pri text-r-on-pri"
          : "text-r-text/85 ring-1 ring-r-text-2/15 ring-inset hover:bg-white/[0.04] hover:text-r-text"
      )}
    >
      <Icon aria-hidden className={cn("size-3.5", selected ? "text-r-on-pri" : mint ? "text-r-acc" : "text-r-text-2")} />
      {label}
      {count !== undefined ? <span className="opacity-60">{count}</span> : null}
    </button>
  );
}

/* ── one shape for curated clips and fetched videos ──────────────── */

type PlayerClip = {
  id: string;
  title: string;
  /** Chip on the poster, e.g. "เพลงประจำตัว · Original Song" */
  tag: string;
  /** Line under the poster title, e.g. "รักษาหัวใจ · 19 May 2024" */
  subtitle: string;
  /** One line in the playlist, e.g. "ออริจินัล · รักษาหัวใจ · Original song MV" */
  meta: string;
  /** "รู้ไหม …" chip under the player */
  funFact?: string;
  youtubeUrl: string;
  videoId: string | null;
  embed: boolean;
  /** Original songs / covers say "ดู MV", everything else "เล่นคลิป". */
  isMusic: boolean;
  thumbUrl: string | null;
  posterUrl: string | null;
};

/** "19 May 2024" for a `YYYY-MM-DD` date (dates stay in English). */
function formatYmd(ymd: string | null | undefined) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ");

function fromCurated(clip: MediaClip, originalSong: VtuberProfile["basic"]["originalSong"]): PlayerClip {
  const videoId = getYoutubeVideoId(clip.youtubeUrl);
  const category = MEDIA_CATEGORY_LABEL[clip.category];
  // The signature song carries its release date and fun fact from basic.json.
  const isSignature = Boolean(originalSong?.url && videoId && getYoutubeVideoId(originalSong.url) === videoId);
  return {
    id: clip.id,
    title: clip.title,
    tag: clip.category === "original" ? `เพลงประจำตัว · ${category.en}` : category.local,
    subtitle: join(clip.titleLocal, isSignature ? formatYmd(originalSong?.releasedAt) : null),
    meta: join(category.local, clip.titleLocal, clip.description),
    funFact: isSignature && originalSong?.note ? `รู้ไหม ${originalSong.note}` : undefined,
    youtubeUrl: clip.youtubeUrl,
    videoId,
    embed: Boolean(clip.embedExternal && videoId),
    isMusic: clip.category === "original" || clip.category === "cover",
    thumbUrl: videoId ? getYoutubeThumbnailUrl(videoId) : null,
    posterUrl: videoId ? getYoutubePosterUrl(videoId) : null,
  };
}

function fromVideo(video: VideoItem): PlayerClip {
  const meta = join(video.channelLabel, formatYmd(video.date), video.durationLabel);
  return {
    id: video.videoId,
    title: video.title,
    tag: video.kind === "short" ? "Shorts" : video.kind === "premiere" ? "Premiere" : "คลิปล่าสุด",
    subtitle: join(video.channelLabel, formatYmd(video.date)),
    meta,
    youtubeUrl: video.youtubeUrl,
    videoId: video.videoId,
    embed: video.embeddable,
    isMusic: false,
    thumbUrl: video.thumbUrl,
    posterUrl: video.coverUrl,
  };
}

/* ── player pieces ───────────────────────────────────────────────── */

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

function YoutubeFrame({ clip }: { clip: PlayerClip }) {
  return (
    <iframe
      key={clip.videoId}
      title={clip.title}
      src={getYoutubeEmbedUrl(clip.videoId!, true)}
      className="absolute inset-0 size-full"
      allow={IFRAME_ALLOW}
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

/** Poster image; drops to `hqdefault` when the video has no 1280px poster. */
function Poster({ clip, className }: { clip: PlayerClip; className?: string }) {
  const [src, setSrc] = useState(clip.posterUrl);
  if (!src) return null;
  return (
    <ProtectedImage
      src={src}
      alt=""
      onError={() => {
        if (clip.videoId && src !== getYoutubePosterUrl(clip.videoId, "hq")) setSrc(getYoutubePosterUrl(clip.videoId, "hq"));
      }}
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}

const STAGE_FRAME =
  "relative overflow-hidden rounded-3xl bg-r-bg shadow-[0_40px_80px_-45px_color-mix(in_srgb,var(--r-pri)_60%,transparent)] ring-1 ring-r-text-2/15";

/** Big player: poster with title + play, the YouTube player once played, or a YouTube-only card. */
function Stage({
  clip,
  position,
  total,
  playing,
  onPlay,
}: {
  clip: PlayerClip;
  position: number;
  total: number;
  playing: boolean;
  onPlay: () => void;
}) {
  if (playing && clip.embed) {
    return (
      <div className={cn(STAGE_FRAME, "aspect-video")}>
        <YoutubeFrame clip={clip} />
      </div>
    );
  }

  return (
    <div className={cn(STAGE_FRAME, "min-h-[300px] md:aspect-video md:min-h-0")}>
      <Poster key={clip.id} clip={clip} className="object-[center_30%]" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--r-bg)_92%,transparent)_0%,color-mix(in_srgb,var(--r-bg)_60%,transparent)_55%,color-mix(in_srgb,var(--r-bg)_10%,transparent)_100%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--r-bg)_95%,transparent)_0%,color-mix(in_srgb,var(--r-bg)_70%,transparent)_40%,color-mix(in_srgb,var(--r-bg)_5%,transparent)_75%)]"
      />
      <span className="absolute top-3.5 right-3.5 rounded-full bg-r-bg/75 px-[11px] py-1 text-[0.71875rem] text-r-text/85 tabular-nums">
        {position} / {total}
      </span>
      <div className="absolute inset-x-5 bottom-5 md:inset-x-8 md:top-1/2 md:bottom-auto md:max-w-[400px] md:-translate-y-1/2">
        <span className="inline-flex rounded-full bg-white/[0.04] px-2.5 py-[3px] text-[0.71875rem] text-r-text-2 ring-1 ring-r-text-2/15 ring-inset backdrop-blur-sm">
          {clip.tag}
        </span>
        <p className="mt-3 line-clamp-2 font-[family-name:var(--font-display)] text-[2.125rem] leading-[1.1] font-light text-r-text md:text-[2.75rem]">
          {clip.title}
        </p>
        {clip.subtitle ? (
          <p className="mt-1.5 line-clamp-1 font-[family-name:var(--font-display)] text-base text-r-text-2">{clip.subtitle}</p>
        ) : null}
        <div className="mt-[18px] flex flex-wrap items-center gap-3">
          {clip.embed ? (
            <>
              <button type="button" onClick={onPlay} className={R_CTA_PRIMARY_CLASS}>
                <Play aria-hidden className="size-[13px] fill-current" />
                {clip.isMusic ? "ดู MV" : "เล่นคลิป"}
              </button>
            </>
          ) : (
            <>
              <a href={clip.youtubeUrl} target="_blank" rel="noopener noreferrer" className={R_CTA_OUTLINE_CLASS}>
                ดูบน YouTube
                <ExternalLink aria-hidden className="size-4" />
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-r-text-2">
                <ExternalLink aria-hidden className="size-3" />
                คลิปนี้เปิดดูได้บน YouTube เท่านั้น
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OpenOnYoutube({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded text-[0.8125rem] text-r-text-2 transition-colors hover:text-r-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
    >
      เปิดบน YouTube
      <ExternalLink aria-hidden className="size-3.5" />
    </a>
  );
}

/* ── playlist ────────────────────────────────────────────────────── */

const PANEL = "r-card rounded-3xl p-3 md:p-3.5";
/** Rows that fit before the list scrolls: 4 on phones, 6 from tablet up. */
const VISIBLE_ROWS = { phone: 4, wide: 6 } as const;

function PlaylistPanel({
  title,
  clips,
  activeId,
  onSelect,
  status,
  onRetry,
}: {
  title: string;
  clips: PlayerClip[];
  activeId: string | null;
  onSelect: (id: string) => void;
  status: "ready" | "loading" | "error";
  onRetry: () => void;
}) {
  const hasExternal = clips.some((clip) => !clip.embed);
  const morePhone = clips.length - VISIBLE_ROWS.phone;
  const moreWide = clips.length - VISIBLE_ROWS.wide;

  return (
    <div className={PANEL}>
      <div className="flex items-baseline justify-between gap-3 px-1.5 pt-0.5 pb-3">
        <p className="font-[family-name:var(--font-display)] text-base text-r-text">เพลย์ลิสต์ · {title}</p>
        {status === "ready" ? <span className="text-xs text-r-text-3">{clips.length} คลิป</span> : null}
      </div>

      {status === "error" ? (
        <div className="flex flex-wrap items-center gap-3 px-2 py-3">
          <p className="text-sm text-r-text-3">โหลดคลิปไม่สำเร็จ</p>
          <button type="button" onClick={onRetry} className={cn(R_CTA_OUTLINE_CLASS, "h-10")}>
            ลองใหม่
          </button>
        </div>
      ) : status === "loading" ? (
        <ul aria-busy="true" className="flex flex-col gap-1">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 p-2">
              <span className="w-[18px]" />
              <span className="aspect-video w-[104px] shrink-0 animate-pulse rounded-[10px] bg-white/[0.05] md:w-[120px]" />
              <span className="flex-1 space-y-2">
                <span className="block h-3.5 w-4/5 animate-pulse rounded bg-white/[0.05]" />
                <span className="block h-3 w-2/5 animate-pulse rounded bg-white/[0.05]" />
              </span>
            </li>
          ))}
        </ul>
      ) : clips.length === 0 ? (
        <p className="px-2 py-3 text-sm text-r-text-3">ยังไม่มีคลิปในหมวดนี้</p>
      ) : (
        <>
          <ul className="flex max-h-[312px] flex-col gap-1 overflow-y-auto [scrollbar-color:color-mix(in_srgb,var(--r-text-2)_35%,transparent)_transparent] [scrollbar-width:thin] md:max-h-[520px]">
            {clips.map((clip, index) => {
              const selected = clip.id === activeId;
              return (
                <li key={clip.id}>
                  <button
                    type="button"
                    aria-current={selected || undefined}
                    onClick={() => onSelect(clip.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-r-acc",
                      selected ? "bg-r-pri/10 ring-1 ring-r-pri/35 ring-inset" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <span className={cn("w-[18px] shrink-0 text-center text-xs", selected ? "text-r-pri" : "text-r-text-3")}>
                      {selected ? "▶" : index + 1}
                    </span>
                    <span className="relative aspect-video w-[104px] shrink-0 overflow-hidden rounded-[10px] bg-[linear-gradient(140deg,color-mix(in_srgb,var(--r-pri)_22%,var(--r-bg)),var(--r-bg))] ring-1 ring-r-text-2/15 md:w-[120px]">
                      {clip.thumbUrl ? (
                        <ProtectedImage src={clip.thumbUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                      ) : null}
                      <span className="absolute top-1/2 left-1/2 flex size-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-r-bg/60 text-r-text">
                        <Play aria-hidden className="size-3 fill-current" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-[family-name:var(--font-display)] text-sm leading-[1.35] text-r-text">
                        {clip.title}
                      </span>
                      <span className="mt-[3px] block truncate text-xs text-r-text-3">{clip.meta}</span>
                    </span>
                    {!clip.embed ? (
                      <ExternalLink aria-label="เปิดบน YouTube" className="size-3.5 shrink-0 text-r-text-2 opacity-85" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {morePhone > 0 || hasExternal ? (
            <p className="mx-1.5 mt-2.5 mb-0.5 flex justify-between gap-3 text-[0.78125rem] text-r-text-2">
              <span>
                {morePhone > 0 ? <span className="md:hidden">ดูอีก {morePhone} คลิป ↓</span> : null}
                {moreWide > 0 ? <span className="hidden md:inline">เลื่อนดูอีก {moreWide} คลิป ↓</span> : null}
              </span>
              {hasExternal ? (
                <span className="inline-flex items-center gap-[5px] text-r-text-3">
                  <ExternalLink aria-hidden className="size-3" /> = เปิดบน YouTube
                </span>
              ) : null}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ── Shorts ──────────────────────────────────────────────────────── */

function ShortsBoard({
  shorts,
  status,
  onRetry,
}: {
  shorts: PlayerClip[];
  status: "ready" | "loading" | "error";
  onRetry: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const active = shorts.find((s) => s.id === activeId) ?? shorts[0] ?? null;

  function select(id: string) {
    setActiveId(id);
    setPlaying(false);
  }

  return (
    <div className="grid grid-cols-1 items-center gap-[22px] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-[9/16] w-[min(222px,64vw)] overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--r-pri)_35%,var(--r-bg)),var(--r-bg)_70%)] ring-2 ring-r-pri lg:w-[252px]">
        {active && playing && active.embed ? (
          <YoutubeFrame clip={active} />
        ) : (
          <>
            {active ? <Poster key={active.id} clip={active} /> : null}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-r-bg/40 via-transparent to-r-bg/85" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs text-r-acc">
              <Smartphone aria-hidden className="size-3.5" /> Shorts
            </span>
            {active ? (
              active.embed ? (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={`เล่น ${active.title}`}
                  className="absolute top-1/2 left-1/2 flex size-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-r-pri text-r-on-pri transition-colors hover:bg-r-pri-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-r-acc"
                >
                  <Play aria-hidden className="size-5 fill-current" />
                </button>
              ) : (
                <a
                  href={active.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`ดู ${active.title} บน YouTube`}
                  className="absolute top-1/2 left-1/2 flex size-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-r-pri text-r-on-pri"
                >
                  <ExternalLink aria-hidden className="size-5" />
                </a>
              )
            ) : null}
            {active ? (
              <span className="absolute inset-x-3 bottom-3">
                <span className="line-clamp-2 text-[0.8125rem] leading-snug text-r-text">{active.title}</span>
                <span className="mt-0.5 block truncate text-[0.6875rem] text-r-text-3">{active.subtitle}</span>
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className={cn(PANEL, "md:p-[18px]")}>
        <div className="flex items-baseline justify-between gap-3 px-1 pb-3.5">
          <p className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-base text-r-text">
            <Smartphone aria-hidden className="size-4 text-r-acc" /> Shorts ล่าสุด
          </p>
        </div>
        {status === "error" ? (
          <div className="flex flex-wrap items-center gap-3 px-1 py-3">
            <p className="text-sm text-r-text-3">โหลดคลิปไม่สำเร็จ</p>
            <button type="button" onClick={onRetry} className={cn(R_CTA_OUTLINE_CLASS, "h-10")}>
              ลองใหม่
            </button>
          </div>
        ) : status === "ready" && shorts.length === 0 ? (
          <p className="px-1 py-3 text-sm text-r-text-3">ยังไม่มี Shorts</p>
        ) : (
          <ul
            aria-busy={status === "loading" || undefined}
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
          >
            {(status === "loading" ? Array.from({ length: DYNAMIC_TAB_LIMIT }, () => null) : shorts).map((short, i) => (
              <li key={short?.id ?? i} className="w-[84px] shrink-0 snap-start lg:w-auto">
                {short ? (
                  <button
                    type="button"
                    onClick={() => select(short.id)}
                    aria-current={short.id === active?.id || undefined}
                    title={short.title}
                    className={cn(
                      "relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-[linear-gradient(160deg,color-mix(in_srgb,var(--r-pri)_20%,var(--r-bg)),var(--r-bg))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
                      short.id === active?.id ? "ring-2 ring-r-pri" : "ring-1 ring-r-text-2/15 hover:ring-r-pri/45"
                    )}
                  >
                    {short.thumbUrl ? (
                      <ProtectedImage src={short.thumbUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                    ) : null}
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-r-text drop-shadow">
                      <Play aria-hidden className="size-3 fill-current" />
                    </span>
                  </button>
                ) : (
                  <span className="block aspect-[9/16] w-full animate-pulse rounded-xl bg-white/[0.05]" />
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 px-1 text-[0.78125rem] text-r-text-2 lg:hidden">ปัด / เลื่อนเพื่อดูคลิปถัดไป</p>
      </div>
    </div>
  );
}

/* ── section ─────────────────────────────────────────────────────── */

function ArchiveLink({ className }: { className?: string }) {
  return (
    <Link href="/media" className={cn(R_CTA_OUTLINE_CLASS, className)}>
      คลังคลิปทั้งหมด
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

function TabsRow({ children }: { children: ReactNode }) {
  return (
    <div
      role="tablist"
      aria-label="หมวดคลิป"
      className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 py-0.5 [scrollbar-width:none] sm:-mx-10 sm:px-10 lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

/**
 * Home · คลิปและเพลง (project R · Media6): category tabs, a big player with the clip's
 * poster (plays in place when YouTube allows it) and the playlist; Shorts get a phone frame.
 */
export function Media({ data }: MediaProps) {
  const originalSong = data.basic.originalSong;
  const groups = useMemo(() => groupMediaClips(data.media), [data.media]);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const dynamicTab = DYNAMIC_TABS.find((t) => t.id === activeTab);
  const { videos, status: videosStatus, retry } = useVideos(Boolean(dynamicTab), dynamicTab?.query ?? "");
  const group = groups.find((g) => g.id === activeTab) ?? groups[0];

  const playlist = useMemo<PlayerClip[]>(() => {
    if (dynamicTab) return videos.map(fromVideo);
    const clips = group?.clips ?? [];
    // ทั้งหมด opens on the featured clip (Heart Cure), the other tabs keep data order.
    const featured = group?.id === "all" ? clips.find((c) => c.featured) : undefined;
    const ordered = featured ? [featured, ...clips.filter((c) => c !== featured)] : clips;
    return ordered.map((clip) => fromCurated(clip, originalSong));
  }, [dynamicTab, videos, group, originalSong]);

  const status: "ready" | "loading" | "error" = !dynamicTab
    ? "ready"
    : videosStatus === "error"
      ? "error"
      : videosStatus === "ready"
        ? "ready"
        : "loading";
  const activeIndex = Math.max(0, playlist.findIndex((clip) => clip.id === activeId));
  const active = playlist[activeIndex] ?? null;

  function selectTab(tab: TabId) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setActiveId(null);
    setPlaying(false);
  }

  function selectClip(id: string) {
    setActiveId(id);
    setPlaying(false);
  }

  if (groups.length === 0) return null;

  return (
    <Section id="media">
      <ScrollReveal>
        <SectionHeader eyebrow="Media" title="คลิปและเพลง" action={<ArchiveLink className="hidden md:inline-flex" />} />
      </ScrollReveal>

      <ScrollReveal className="mt-[22px]">
        <TabsRow>
          {groups.map((g) => (
            <TabChip
              key={g.id}
              selected={g.id === activeTab}
              icon={g.icon}
              label={g.label}
              count={g.clips.length}
              onClick={() => selectTab(g.id)}
            />
          ))}
          <span aria-hidden className="mx-1 h-[22px] w-px shrink-0 bg-r-text-2/15" />
          {DYNAMIC_TABS.map((t) => (
            <TabChip key={t.id} selected={t.id === activeTab} icon={t.icon} label={t.label} mint onClick={() => selectTab(t.id)} />
          ))}
        </TabsRow>
      </ScrollReveal>

      <ScrollReveal className="mt-5">
        {activeTab === "shorts" ? (
          <ShortsBoard shorts={playlist} status={status} onRetry={retry} />
        ) : (
          <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              {active ? (
                <>
                  <Stage
                    clip={active}
                    position={activeIndex + 1}
                    total={playlist.length}
                    playing={playing}
                    onPlay={() => setPlaying(true)}
                  />
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                    {active.funFact ? (
                      <span className="inline-flex items-center gap-2 rounded-[14px] bg-r-pri/10 px-[13px] py-2 text-[0.8125rem] text-r-text-2">
                        <Lightbulb aria-hidden className="size-3.5 text-r-pri" />
                        {active.funFact}
                      </span>
                    ) : (
                      <span className="min-w-0 truncate text-[0.8125rem] text-r-text-3">{active.meta}</span>
                    )}
                    <OpenOnYoutube href={active.youtubeUrl} />
                  </div>
                </>
              ) : (
                <div className={cn(STAGE_FRAME, "aspect-video", status === "loading" && "animate-pulse")} />
              )}
            </div>
            <PlaylistPanel
              title={dynamicTab?.label ?? group?.label ?? ""}
              clips={playlist}
              activeId={active?.id ?? null}
              onSelect={selectClip}
              status={status}
              onRetry={retry}
            />
          </div>
        )}
      </ScrollReveal>

      <ArchiveLink className="mt-6 md:hidden" />
    </Section>
  );
}
