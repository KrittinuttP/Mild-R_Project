import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
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
  "text-xs tracking-[0.18em] text-[#f3b8c4]/70 uppercase sm:text-sm";

const BADGE_CLASS =
  "rounded-full border px-3 py-1 text-xs tracking-wide sm:text-sm";

type ProjectListProps = {
  projects: ProjectItem[];
  emptyLabel?: string;
};

export function ProjectList({ projects, emptyLabel }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <p className="mt-12 max-w-md text-sm text-[#f3b8c4]/75 sm:mt-16 sm:text-base">
        ยังไม่มีโปรเจกต์
        {emptyLabel ? ` ในหมวด ${CATEGORY_LABEL[emptyLabel] ?? emptyLabel}` : ""}{" "}
        — เพิ่มได้ใน{" "}
        <code className="text-[#f7d7de]/90">projects.json</code>
      </p>
    );
  }

  return (
    <ul className="mt-12 space-y-5 sm:mt-16 sm:space-y-6">
      {projects.map((project, index) => {
        const isHbd = project.category.toLowerCase() === "hbd";

        return (
          <li key={project.id}>
            <Link
              href={`/projects/${project.slug}`}
              className={cn(
                "group grid overflow-hidden rounded-3xl border bg-[#1a0c12]/60 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60",
                "md:grid-cols-[minmax(0,14rem)_1fr]",
                isHbd
                  ? "border-[#e85a7a]/30 shadow-[0_16px_40px_rgba(232,90,122,0.12)] hover:border-[#e85a7a]/55 hover:bg-[#1a0c12]"
                  : "border-[#f3b8c4]/12 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
              )}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#12080c] md:aspect-auto md:min-h-[11rem]">
                <ProtectedImage
                  src={project.cover}
                  alt=""
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/50 to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#1a0c12]/40" />
              </div>

              <div className="flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className={META_CLASS}>
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {CATEGORY_LABEL[project.category] ?? project.category}
                  </span>
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

                <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[#fff5f7] transition group-hover:text-white sm:text-3xl">
                  {project.title}
                  {project.titleLocal ? (
                    <span className="mt-1 block text-base font-medium tracking-normal text-[#f3b8c4]/75 sm:text-lg">
                      {project.titleLocal}
                    </span>
                  ) : null}
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#f7d7de]/80 sm:text-base">
                  {project.summary}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm tracking-wide text-[#e85a7a] transition group-hover:gap-2.5">
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
