import { CoverCard } from "@/components/cards/CoverCard";
import { BADGE_SOFT_CLASS, META_CLASS } from "@/lib/site-ui";
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

type ProjectCardProps = {
  project: ProjectItem;
  headingAs?: "h2" | "h3";
};

export function ProjectCard({ project, headingAs = "h2" }: ProjectCardProps) {
  const isHbd = project.category.toLowerCase() === "hbd";
  const ended = project.status === "ended";

  return (
    <CoverCard
      href={`/projects/${project.slug}`}
      cover={project.cover}
      coverAlt=""
      media="wide-cover"
      status={{
        label: STATUS_LABEL[project.status],
        tone: isHbd || !ended ? "accent" : "soft",
      }}
      tone={isHbd ? "featured" : ended ? "muted" : "default"}
      eyebrow={
        <div className="flex flex-wrap items-center gap-2">
          <span className={META_CLASS}>
            {CATEGORY_LABEL[project.category] ?? project.category}
          </span>
          {project.year ? (
            <span className={BADGE_SOFT_CLASS}>{project.year}</span>
          ) : null}
        </div>
      }
      title={project.title}
      subtitle={project.titleLocal}
      summary={project.summary}
      ctaLabel="ดูโปรเจกต์"
      headingAs={headingAs}
    />
  );
}
