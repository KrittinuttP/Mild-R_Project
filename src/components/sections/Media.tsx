"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { buttonVariants } from "@/components/ui/button";
import { groupMediaByCategory } from "@/lib/media";
import {
  CTA_OUTLINE_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import {
  getYoutubeEmbedUrl,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";
import type { MediaCategory, MediaClip, VtuberProfile } from "@/types/vtuber";

type MediaProps = {
  data: VtuberProfile;
};

function pickInitialClip(clips: MediaClip[]) {
  return clips.find((clip) => clip.featured) ?? clips[0] ?? null;
}

export function Media({ data }: MediaProps) {
  const clips = data.media;
  const groups = useMemo(() => groupMediaByCategory(clips), [clips]);
  const [activeId, setActiveId] = useState(
    () => pickInitialClip(clips)?.id ?? ""
  );

  const active = useMemo(
    () => clips.find((clip) => clip.id === activeId) ?? pickInitialClip(clips),
    [activeId, clips]
  );

  const activeCategory: MediaCategory | undefined = active?.category;
  const activeGroup =
    groups.find((group) => group.id === activeCategory) ?? groups[0];
  const visibleClips = activeGroup?.clips ?? [];

  const videoId = getYoutubeVideoId(active?.youtubeUrl);
  const canEmbed = Boolean(active?.embedExternal && videoId);
  const youtubeSocial = data.socials.find((s) => s.platform === "youtube");
  const hasFansong = data.projects.some(
    (project) => project.category.toLowerCase() === "fansong"
  );

  function selectCategory(categoryId: MediaCategory) {
    if (active?.category === categoryId) return;
    const group = groups.find((g) => g.id === categoryId);
    const next = group?.clips[0];
    if (next) setActiveId(next.id);
  }

  if (clips.length === 0) return null;

  return (
    <section
      id="media"
      className="relative scroll-mt-20 bg-[#10070b] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#12080c] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.14),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <p className={META_CLASS}>Media</p>
          <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
            รับชมคลิป
          </h2>
        </ScrollReveal>

        <ScrollReveal className="mt-8 sm:mt-10">
          <div
            role="tablist"
            aria-label="หมวดคลิป"
            className="flex gap-1 overflow-x-auto rounded-2xl bg-black/25 p-1 ring-1 ring-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5"
          >
            {groups.map((group) => {
              const selected = group.id === activeGroup?.id;
              const Icon = group.icon;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectCategory(group.id)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2.5 text-left transition sm:min-w-[7rem] sm:px-4",
                    selected
                      ? "bg-[#e85a7a] text-[#140a0d] shadow-sm"
                      : "text-[#f3b8c4]/70 hover:bg-white/5 hover:text-[#f7d7de]"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        selected ? "text-[#140a0d]" : "text-[#f3b8c4]/55"
                      )}
                      aria-hidden
                    />
                    <span className="text-sm font-medium tracking-wide">
                      {group.label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block pl-6 text-xs",
                      selected ? "text-[#140a0d]/70" : "text-[#f3b8c4]/50"
                    )}
                  >
                    {group.labelLocal
                      ? `${group.labelLocal} · ${group.clips.length}`
                      : `${group.clips.length} คลิป`}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

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
                {activeGroup ? (
                  <span className="ml-2 tracking-normal text-[#f3b8c4]/50 normal-case">
                    {activeGroup.label}
                  </span>
                ) : null}
              </h3>

              <ul className="mt-4 max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto rounded-3xl border border-[#f3b8c4]/12 bg-[#1a0c12]/40 p-2 [scrollbar-color:rgba(243,184,196,0.35)_transparent] [scrollbar-width:thin]">
                {visibleClips.map((clip) => {
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
                })}
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

              {hasFansong ? (
                <Link
                  href="/projects?category=fansong"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "w-full justify-between text-[#f3b8c4]/80 hover:text-[#fff5f7]"
                  )}
                >
                  Fansong
                  <span aria-hidden>→</span>
                </Link>
              ) : null}
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
