import Link from "next/link";
import { ExternalLink, Music2 } from "lucide-react";

import { THAI_BREAK, ThaiPhrases } from "@/components/common/ThaiPhrases";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { CafeProjectCover } from "@/components/projects/CafeProjectCover";
import { BackLink } from "@/components/layout/BackLink";
import {
  R_BODY_CLASS,
  R_CHIP_SOFT_CLASS,
  R_CTA_OUTLINE_CLASS,
  R_CTA_PRIMARY_CLASS,
  R_EYEBROW_CLASS,
  R_H1_CLASS,
  R_H2_CLASS,
  R_CARD_TITLE_CLASS,
} from "@/lib/site-ui";
import { getYoutubeEmbedUrl, getYoutubeVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/types/vtuber";

const CATEGORY_LABEL: Record<string, string> = {
  cafe: "Cafe",
  fansong: "Fansong",
  hbd: "Birthday",
  mv: "Fansong",
};

/** Copy with `|` markers wraps only at those (see `ThaiPhrases`); plain copy renders as is. */
function phrased(text: string) {
  return text.includes(THAI_BREAK) ? <ThaiPhrases text={text} /> : text;
}

type ProjectDetailProps = {
  project: ProjectItem;
};

export function ProjectDetail({ project }: ProjectDetailProps) {
  const videoId = getYoutubeVideoId(project.youtubeUrl);
  const categoryKey = project.category.toLowerCase();
  const categoryLabel = CATEGORY_LABEL[categoryKey] ?? project.category;
  const isHbd = categoryKey === "hbd";
  const isCafe = categoryKey === "cafe";
  const actions = [
    ...(project.cta ? [project.cta] : []),
    ...(project.ctas ?? []),
  ];

  return (
    <article className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-10 sm:pt-32 lg:px-16">
      <BackLink href="/projects" className="mb-8">
        โปรเจกต์ทั้งหมด
      </BackLink>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className={R_EYEBROW_CLASS}>{categoryLabel}</p>
            {project.year ? (
              <span className={cn(R_CHIP_SOFT_CLASS, "tabular-nums")}>
                {project.year}
              </span>
            ) : null}
          </div>

          <h1 className={cn("mt-4", R_H1_CLASS)}>
            {project.title}
          </h1>
          {project.titleLocal ? (
            <p className="mt-3 text-lg text-r-text-2 sm:text-xl">
              {project.titleLocal}
            </p>
          ) : null}

          <p className={cn("mt-4 max-w-xl", R_BODY_CLASS, "sm:text-lg")}>
            {phrased(project.summary)}
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
                    className={index === 0 ? R_CTA_PRIMARY_CLASS : R_CTA_OUTLINE_CLASS}
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
            "relative overflow-hidden bg-white/[0.03]",
            // Cafe: the 3:1 logo banner, cropped to 3:2 so the wordmark stays whole.
            isCafe ? "aspect-[3/2]" : "aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]",
            "rounded-3xl ring-1 ring-r-line shadow-[0_24px_60px_rgba(0,0,0,0.35)]",
            isHbd && "ring-r-pri/25"
          )}
        >
          {isCafe ? (
            // Cafe: the logo banner — never the Key Visual.
            <CafeProjectCover label={project.title} />
          ) : project.cover ? (
            <ProtectedImage src={project.cover} alt={project.title} className="h-full w-full object-cover" />
          ) : (
            // No cover yet (e.g. the fansong page before release): a quiet placeholder, no project image.
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--r-pri)_22%,transparent),rgb(255_255_255/0.02)_70%)] text-r-text-2/70">
              <Music2 aria-hidden className="size-10" />
              <span className="text-sm tracking-wide">เร็ว ๆ นี้</span>
            </div>
          )}
          {!isCafe ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-r-bg/70 via-transparent to-transparent" />
          ) : null}
        </div>
      </div>

      {project.highlights && project.highlights.length > 0 ? (
        <ul className="mt-14 grid gap-4 border-y border-r-line py-8 sm:grid-cols-3 sm:gap-6">
          {project.highlights.map((item) => (
            <li
              key={item}
              className="rounded-2xl bg-white/[0.03] px-4 py-4 text-sm leading-relaxed text-r-text-2 ring-1 ring-r-line sm:px-5 sm:text-base"
            >
              <span className={cn("mb-2 block", R_CARD_TITLE_CLASS, "text-r-pri")}>
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
            className="text-base leading-relaxed text-r-text-2 sm:text-lg"
          >
            {phrased(paragraph)}
          </p>
        ))}
      </div>

      {videoId ? (
        <div className="mt-16">
          <p className={R_EYEBROW_CLASS}>Watch</p>
          <h2 className={cn("mt-3", R_H2_CLASS)}>
            คลิปที่เกี่ยวข้อง
          </h2>
          <div className="relative mt-6 aspect-video overflow-hidden rounded-3xl bg-black/40 ring-1 ring-r-line">
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
