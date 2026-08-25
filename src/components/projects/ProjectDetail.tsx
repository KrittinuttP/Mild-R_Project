import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
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

const META_CLASS =
  "text-xs tracking-[0.18em] text-[#f3b8c4]/75 uppercase sm:text-sm";

const BADGE_CLASS =
  "rounded-full border px-3 py-1 text-xs tracking-wide sm:text-sm";

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
                BADGE_CLASS,
                isHbd
                  ? "border-[#e85a7a]/35 bg-[#e85a7a]/15 text-[#f3b8c4]"
                  : "border-[#f3b8c4]/20 text-[#f3b8c4]/80"
              )}
            >
              {STATUS_LABEL[project.status]}
            </span>
            {project.year ? (
              <span
                className={cn(
                  BADGE_CLASS,
                  "border-[#f3b8c4]/15 bg-white/[0.03] tabular-nums text-[#f3b8c4]/80"
                )}
              >
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
                      "rounded-2xl",
                      index === 0
                        ? "border-transparent bg-[#e85a7a] text-[#140a0d] shadow-[0_10px_30px_rgba(232,90,122,0.35)] hover:bg-[#f3b8c4]"
                        : "border-[#f3b8c4]/30 bg-transparent text-[#fff5f7] hover:border-[#e85a7a]/50 hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]"
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
              <span className="mb-2 block text-xs tracking-[0.18em] text-[#e85a7a] uppercase sm:text-sm">
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
          <p className="text-xs tracking-[0.18em] text-[#f3b8c4]/75 uppercase sm:text-sm">
            Watch
          </p>
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
