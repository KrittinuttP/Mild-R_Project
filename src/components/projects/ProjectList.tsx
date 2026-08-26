import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import {
  BADGE_ACCENT_CLASS,
  BADGE_SOFT_CLASS,
  DISPLAY_H3_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
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

type ProjectListProps = {
  projects: ProjectItem[];
  emptyLabel?: string;
};

export function ProjectList({ projects, emptyLabel }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <p className="mt-12 max-w-md text-sm text-[#f3b8c4]/75 sm:mt-16 sm:text-base">
        ยังไม่มีโปรเจกต์
        {emptyLabel ? ` ในหมวด ${CATEGORY_LABEL[emptyLabel] ?? emptyLabel}` : ""}
      </p>
    );
  }

  return (
    <ul className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {projects.map((project) => {
        const isHbd = project.category.toLowerCase() === "hbd";
        const ended = project.status === "ended";

        return (
          <li key={project.id} className="h-full">
            <Link
              href={`/projects/${project.slug}`}
              className={cn(
                "group flex h-full flex-col overflow-hidden rounded-3xl border bg-[#1a0c12]/60 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60",
                isHbd
                  ? "border-[#e85a7a]/30 shadow-[0_16px_40px_rgba(232,90,122,0.12)] hover:border-[#e85a7a]/55 hover:bg-[#1a0c12]"
                  : ended
                    ? "border-[#f3b8c4]/10 opacity-90 hover:border-[#f3b8c4]/25 hover:bg-[#1a0c12] hover:opacity-100"
                    : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
              )}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#12080c]">
                <ProtectedImage
                  src={project.cover}
                  alt=""
                  className={cn(
                    "h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]",
                    ended && "opacity-85"
                  )}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a0c12] via-[#1a0c12]/40 to-transparent" />
                <span
                  className={cn(
                    isHbd || project.status === "active" || project.status === "upcoming"
                      ? BADGE_ACCENT_CLASS
                      : BADGE_SOFT_CLASS,
                    "absolute top-3 left-3 uppercase backdrop-blur-sm"
                  )}
                >
                  {STATUS_LABEL[project.status]}
                </span>
              </div>

              <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={META_CLASS}>
                    {CATEGORY_LABEL[project.category] ?? project.category}
                  </span>
                  {project.year ? (
                    <span className={BADGE_SOFT_CLASS}>{project.year}</span>
                  ) : null}
                </div>

                <h2
                  className={cn(
                    "mt-2 transition group-hover:text-white",
                    DISPLAY_H3_CLASS
                  )}
                >
                  {project.title}
                </h2>
                {project.titleLocal ? (
                  <p className="mt-1 text-sm text-[#f3b8c4]/65">
                    {project.titleLocal}
                  </p>
                ) : null}

                {project.summary ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#f7d7de]/80">
                    {project.summary}
                  </p>
                ) : null}

                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm tracking-wide text-[#e85a7a] transition group-hover:gap-2.5">
                  ดูโปรเจกต์
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
