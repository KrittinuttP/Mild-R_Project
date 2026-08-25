import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  BADGE_ACCENT_CLASS,
  BADGE_SOFT_CLASS,
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { getYoutubeEmbedUrl, getYoutubeVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import type { ProjectItem, ProjectStatus } from "@/types/vtuber";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  upcoming: "เร็วๆ นี้",
  active: "กำลังดำเนินการ",
  ended: "สิ้นสุดแล้ว",
};

const CATEGORY_LABEL: Record<string, string> = {
  cafe: "Cafe",
  fansong: "Fansong",
  hbd: "Birthday",
  mv: "Fansong",
};

type ProjectDetailProps = {
  project: ProjectItem;
};

export function ProjectDetail({ project }: ProjectDetailProps) {
  const videoId = getYoutubeVideoId(project.youtubeUrl);
  const categoryKey = project.category.toLowerCase();
  const categoryLabel = CATEGORY_LABEL[categoryKey] ?? project.category;
  const isHbd = categoryKey === "hbd";
  const backHref =
    categoryKey === "fansong" ? "/projects?category=fansong" : "/projects";
  const backLabel =
    categoryKey === "fansong" ? "Fansong ทั้งหมด" : "โปรเจกต์ทั้งหมด";

  const actions = [
    ...(project.cta ? [project.cta] : []),
    ...(project.ctas ?? []),
  ];

  return (
    <article className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-10 sm:pt-32 lg:px-16">
      <BackLink href={backHref} className="mb-8">
        {backLabel}
      </BackLink>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className={META_CLASS}>{categoryLabel}</p>
            <span
              className={cn(
                isHbd ? BADGE_ACCENT_CLASS : BADGE_SOFT_CLASS
              )}
            >
              {STATUS_LABEL[project.status]}
            </span>
            {project.year ? (
              <span className={cn(BADGE_SOFT_CLASS, "tabular-nums")}>
                {project.year}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[#fff5f7] sm:text-5xl md:text-6xl">
            {project.title}
          </h1>
          {project.titleLocal ? (
            <p className="mt-3 text-lg text-[#f3b8c4]/80 sm:text-xl">
              {project.titleLocal}
            </p>
          ) : null}

          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg">
            {project.summary}
          </p>

          {actions.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {actions.map((action, index) => {
                const external = action.url.startsWith("http");
                return (
                  <Link
                    key={action.url + action.label}
                    href={action.url}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={cn(
                      buttonVariants({
                        size: "lg",
                        variant: index === 0 ? "default" : "outline",
                      }),
                      index === 0 ? CTA_PRIMARY_CLASS : CTA_OUTLINE_CLASS
                    )}
                  >
                    {action.label}
                    {external ? (
                      <ExternalLink className="size-4 opacity-80" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "relative aspect-[4/5] overflow-hidden bg-[#1a0c12] sm:aspect-[5/4] lg:aspect-[4/5]",
            "rounded-3xl ring-1 ring-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]",
            isHbd && "ring-[#e85a7a]/25"
          )}
        >
          <ProtectedImage
            src={project.cover}
            alt={project.title}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/70 via-transparent to-transparent" />
        </div>
      </div>

      {project.highlights && project.highlights.length > 0 ? (
        <ul className="mt-14 grid gap-4 border-y border-[#f3b8c4]/12 py-8 sm:grid-cols-3 sm:gap-6">
          {project.highlights.map((item) => (
            <li
              key={item}
              className="rounded-2xl bg-white/[0.03] px-4 py-4 text-sm leading-relaxed text-[#f7d7de]/85 ring-1 ring-white/5 sm:px-5 sm:text-base"
            >
              <span className={cn(META_CLASS, "mb-2 block text-[#e85a7a]")}>
                Highlight
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-12 max-w-2xl space-y-5">
        {project.body.map((paragraph) => (
          <p
            key={paragraph.slice(0, 24)}
            className="text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {videoId ? (
        <div className="mt-16">
          <p className={META_CLASS}>Watch</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
            คลิปที่เกี่ยวข้อง
          </h2>
          <div className="relative mt-6 aspect-video overflow-hidden rounded-3xl bg-[#0e0609] ring-1 ring-[#f3b8c4]/15">
            <iframe
              title={`${project.title} video`}
              src={getYoutubeEmbedUrl(videoId)}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
