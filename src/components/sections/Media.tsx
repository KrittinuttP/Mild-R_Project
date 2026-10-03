"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Clapperboard,
  ExternalLink,
  History,
  Play,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useVideos } from "@/hooks/useVideos";
import { groupMediaByCategory } from "@/lib/media";
import {
  CTA_OUTLINE_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { videoSubtitle } from "@/lib/video-format";
import {
  getYoutubeEmbedUrl,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";
import type { MediaCategory, MediaClip, VtuberProfile } from "@/types/vtuber";
import type { VideoItem } from "@/types/video";

type MediaProps = {
  data: VtuberProfile;
};

type DynamicTabId = "latest" | "shorts";
type TabId = MediaCategory | DynamicTabId;

type DynamicTab = {
  id: DynamicTabId;
  label: string;
  labelLocal: string;
  icon: LucideIcon;
  query: string;
};

const DYNAMIC_TAB_LIMIT = 8;

const DYNAMIC_TABS: DynamicTab[] = [
  {
    id: "latest",
    label: "Latest",
    labelLocal: "คลิปล่าสุด",
    icon: History,
    query: `kind=video,premiere&limit=${DYNAMIC_TAB_LIMIT}`,
  },
  {
    id: "shorts",
    label: "Shorts",
    labelLocal: "คลิปสั้น",
    icon: Smartphone,
    query: `kind=short&limit=${DYNAMIC_TAB_LIMIT}`,
  },
];

/** Curated clips and fetched videos share one player + playlist. */
type PlayerClip = {
  id: string;
  title: string;
  titleLocal?: string;
  description?: string;
  youtubeUrl: string;
  embed: boolean;
};

function fromCurated(clip: MediaClip): PlayerClip {
  return {
    id: clip.id,
    title: clip.title,
    titleLocal: clip.titleLocal,
    description: clip.description,
    youtubeUrl: clip.youtubeUrl,
    embed: Boolean(clip.embedExternal),
  };
}

function fromVideo(video: VideoItem): PlayerClip {
  return {
    id: video.videoId,
    title: video.title,
    titleLocal: videoSubtitle(video),
    youtubeUrl: video.youtubeUrl,
    embed: video.embeddable,
  };
}

function isDynamicTab(tab: TabId): tab is DynamicTabId {
  return DYNAMIC_TABS.some((t) => t.id === tab);
}

function pickInitialClip(clips: MediaClip[]) {
  return clips.find((clip) => clip.featured) ?? clips[0] ?? null;
}

type TabOption = {
  id: TabId;
  icon: LucideIcon;
  label: string;
  sublabel: string;
};

const TAB_BUTTON_CLASS =
  "shrink-0 rounded-xl px-4 py-2.5 text-left transition sm:min-w-[7rem] lg:grow";

function TabButton({
  selected,
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  selected: boolean;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        TAB_BUTTON_CLASS,
        selected
          ? "bg-[#e85a7a] text-[#140a0d] shadow-sm"
          : "text-[#f3b8c4]/70 hover:bg-white/5 hover:text-[#f7d7de]"
      )}
    >
      <span className="block lg:mx-auto lg:w-fit">
        <span className="flex items-center gap-2">
          <Icon
            className={cn(
              "size-4 shrink-0",
              selected ? "text-[#140a0d]" : "text-[#f3b8c4]/55"
            )}
            aria-hidden
          />
          <span className="text-sm font-medium tracking-wide">{label}</span>
        </span>
        <span
          className={cn(
            "mt-0.5 block pl-6 text-xs",
            selected ? "text-[#140a0d]/70" : "text-[#f3b8c4]/50"
          )}
        >
          {sublabel}
        </span>
      </span>
    </button>
  );
}

export function Media({ data }: MediaProps) {
  const clips = data.media;
  const groups = useMemo(() => groupMediaByCategory(clips), [clips]);
  const initialClip = pickInitialClip(clips);
  const [activeTab, setActiveTab] = useState<TabId>(
    () => initialClip?.category ?? groups[0]?.id ?? "latest"
  );
  const [activeId, setActiveId] = useState(() => initialClip?.id ?? "");
  const [tabSheetOpen, setTabSheetOpen] = useState(false);

  const tabs = useMemo<TabOption[]>(
    () => [
      ...groups.map((group) => ({
        id: group.id,
        icon: group.icon,
        label: group.label,
        sublabel: group.labelLocal
          ? `${group.labelLocal} · ${group.clips.length}`
          : `${group.clips.length} คลิป`,
      })),
      ...DYNAMIC_TABS.map((tab) => ({
        id: tab.id,
        icon: tab.icon,
        label: tab.label,
        sublabel: tab.labelLocal,
      })),
    ],
    [groups]
  );
  const activeTabOption = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const dynamicTab = isDynamicTab(activeTab)
    ? DYNAMIC_TABS.find((t) => t.id === activeTab)
    : undefined;
  const {
    videos,
    status: videosStatus,
    retry: retryVideos,
  } = useVideos(Boolean(dynamicTab), dynamicTab?.query ?? "");

  const curatedGroup = dynamicTab
    ? undefined
    : (groups.find((group) => group.id === activeTab) ?? groups[0]);

  const playlist = useMemo<PlayerClip[]>(
    () =>
      dynamicTab
        ? videos.map(fromVideo)
        : (curatedGroup?.clips ?? []).map(fromCurated),
    [dynamicTab, videos, curatedGroup]
  );
  const active = playlist.find((clip) => clip.id === activeId) ?? playlist[0] ?? null;
  const playlistLabel = dynamicTab?.label ?? curatedGroup?.label;
  const loadingVideos = Boolean(dynamicTab) && videosStatus !== "ready";

  const videoId = getYoutubeVideoId(active?.youtubeUrl);
  const canEmbed = Boolean(active?.embed && videoId);
  const youtubeSocial = data.socials.find((s) => s.platform === "youtube");

  function selectTab(tab: TabId) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const group = groups.find((g) => g.id === tab);
    setActiveId(group?.clips[0]?.id ?? "");
  }

  if (clips.length === 0) return null;

  return (
    <section
      id="media"
      className="relative scroll-mt-20 bg-[#12080c] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#10080c] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.14),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <Clapperboard className="size-4 text-[#e85a7a]" aria-hidden />
            <p className={META_CLASS}>Media</p>
          </div>
          <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
            รับชมคลิป
          </h2>
        </ScrollReveal>

        <ScrollReveal className="mt-8 sm:mt-10">
          {activeTabOption ? (
            <button
              type="button"
              onClick={() => setTabSheetOpen(true)}
              aria-haspopup="dialog"
              className="flex w-full items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 text-left ring-1 ring-white/10 transition active:bg-black/35 sm:hidden"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e85a7a] text-[#140a0d]">
                <activeTabOption.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.65rem] tracking-[0.12em] text-[#f3b8c4]/55 uppercase">
                  หมวดคลิป
                </span>
                <span className="block truncate text-sm font-medium text-[#fff5f7]">
                  {activeTabOption.label}
                  <span className="ml-2 font-normal text-[#f3b8c4]/60">
                    {activeTabOption.sublabel}
                  </span>
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-[#f3b8c4]/70" aria-hidden />
            </button>
          ) : null}

          <div
            role="tablist"
            aria-label="หมวดคลิป"
            className="hidden gap-1.5 overflow-x-auto rounded-2xl bg-black/25 p-1 ring-1 ring-white/10 [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                selected={tab.id === activeTab}
                icon={tab.icon}
                label={tab.label}
                sublabel={tab.sublabel}
                onClick={() => selectTab(tab.id)}
              />
            ))}
          </div>
        </ScrollReveal>

        <Sheet open={tabSheetOpen} onOpenChange={setTabSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>เลือกหมวดคลิป</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <ul className="space-y-1 pb-2">
                {tabs.map((tab) => {
                  const selected = tab.id === activeTab;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          selectTab(tab.id);
                          setTabSheetOpen(false);
                        }}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                          selected
                            ? "bg-[#e85a7a]/15 text-[#fff5f7]"
                            : "text-[#f7d7de]/85 active:bg-white/[0.06]"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl",
                            selected ? "bg-[#e85a7a] text-[#140a0d]" : "bg-white/[0.05] text-[#f3b8c4]/70"
                          )}
                        >
                          <tab.icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{tab.label}</span>
                          <span className="block text-xs text-[#f3b8c4]/55">{tab.sublabel}</span>
                        </span>
                        {selected ? <Check className="size-4 shrink-0 text-[#e85a7a]" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SheetBody>
          </SheetContent>
        </Sheet>

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
          <ScrollReveal>
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-[#0e0609] ring-1 ring-[#f3b8c4]/15">
              {canEmbed && videoId ? (
                <iframe
                  key={videoId}
                  title={active?.title ?? "YouTube video"}
                  src={getYoutubeEmbedUrl(videoId)}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : active?.youtubeUrl ? (
                <Link
                  href={active.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute inset-0"
                  aria-label={`เปิด ${active.title} บน YouTube`}
                >
                  {videoId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getYoutubeThumbnailUrl(videoId)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-[#0e0609]" />
                  )}
                  <span className="absolute inset-0 bg-[#10070b]/45 transition group-hover:bg-[#10070b]/35" />
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-[#e85a7a] text-white shadow-lg transition group-hover:scale-105 sm:size-20">
                      <Play className="size-7 fill-current sm:size-8" />
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[#fff5f7] sm:text-base">
                      ดูบน YouTube
                      <ExternalLink className="size-4 opacity-80" />
                    </span>
                  </span>
                </Link>
              ) : loadingVideos ? (
                <div className="absolute inset-0 animate-pulse bg-[#1a0c12]" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <Play className="size-10 text-[#e85a7a]/80" />
                  <p className="text-sm text-[#f3b8c4]/75">ไม่มีลิงก์คลิป</p>
                </div>
              )}
            </div>

            {active ? (
              <div className="mt-5 border-t border-[#f3b8c4]/15 pt-5">
                <h3 className={DISPLAY_H3_CLASS}>
                  {active.title}
                  {active.titleLocal ? (
                    <span className="mt-1 block text-base font-medium text-[#f3b8c4]/75">
                      {active.titleLocal}
                    </span>
                  ) : null}
                </h3>
                {active.description ? (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#f7d7de]/80 sm:text-base">
                    {active.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </ScrollReveal>

          <div className="flex flex-col gap-6">
            <ScrollReveal>
              <h3 className={META_MUTED_CLASS}>
                Playlist
                {playlistLabel ? (
                  <span className="ml-2 tracking-normal text-[#f3b8c4]/50 normal-case">
                    {playlistLabel}
                  </span>
                ) : null}
              </h3>

              <ul className="mt-4 max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto rounded-3xl border border-[#f3b8c4]/12 bg-[#1a0c12]/40 p-2 [scrollbar-color:rgba(243,184,196,0.35)_transparent] [scrollbar-width:thin]">
                {dynamicTab && videosStatus === "error" ? (
                  <li className="flex flex-wrap items-center gap-3 px-3 py-3">
                    <p className="text-sm text-[#f3b8c4]/60">โหลดคลิปไม่สำเร็จ</p>
                    <button
                      type="button"
                      onClick={retryVideos}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        CTA_OUTLINE_CLASS
                      )}
                    >
                      ลองใหม่
                    </button>
                  </li>
                ) : loadingVideos ? (
                  Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="flex min-h-14 items-start gap-3 px-3 py-3">
                      <span className="mt-1 size-4 shrink-0 animate-pulse rounded bg-[#241019]" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3.5 w-4/5 animate-pulse rounded bg-[#241019]" />
                        <span className="block h-3 w-2/5 animate-pulse rounded bg-[#241019]" />
                      </span>
                    </li>
                  ))
                ) : playlist.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[#f3b8c4]/60">ยังไม่มีคลิปในหมวดนี้</li>
                ) : (
                  playlist.map((clip) => {
                    const selected = clip.id === active?.id;
                    return (
                      <li key={clip.id}>
                        <button
                          type="button"
                          onClick={() => setActiveId(clip.id)}
                          className={cn(
                            "flex w-full min-h-14 items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                            selected
                              ? "bg-[#e85a7a]/15 text-[#fff5f7]"
                              : "text-[#f7d7de]/80 hover:bg-white/[0.04] hover:text-[#fff5f7]"
                          )}
                        >
                          <Play
                            className={cn(
                              "mt-1 size-4 shrink-0",
                              selected ? "text-[#e85a7a]" : "text-[#f3b8c4]/55"
                            )}
                          />
                          <span>
                            <span className="block text-sm font-medium sm:text-base">
                              {clip.title}
                            </span>
                            {clip.titleLocal ? (
                              <span className="mt-0.5 block text-xs text-[#f3b8c4]/65 sm:text-sm">
                                {clip.titleLocal}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </ScrollReveal>

            <ScrollReveal className="space-y-3">
              {active?.youtubeUrl ? (
                <Link
                  href={active.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    CTA_OUTLINE_CLASS,
                    "w-full justify-between"
                  )}
                >
                  เปิดคลิปนี้บน YouTube
                  <ExternalLink className="size-4 opacity-70" />
                </Link>
              ) : null}

              <Link
                href="/media"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "w-full justify-between text-[#f3b8c4]/80 hover:text-[#fff5f7]"
                )}
              >
                คลังคลิปทั้งหมด
                <span aria-hidden>→</span>
              </Link>

              {youtubeSocial ? (
                <Link
                  href={youtubeSocial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "w-full justify-between text-[#f3b8c4]/80 hover:text-[#fff5f7]"
                  )}
                >
                  ช่อง {youtubeSocial.handle ?? "YouTube"}
                  <ExternalLink className="size-4 opacity-70" />
                </Link>
              ) : null}
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
