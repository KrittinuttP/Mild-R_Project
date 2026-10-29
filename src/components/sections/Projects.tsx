import Link from "next/link";
import { ArrowRight, ArrowUpRight, Cake, Coffee, Music2, type LucideIcon } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { ProjectsComingSoonBox, ProjectsHeading } from "@/components/projects/ProjectsComingSoon";
import { PROJECTS_COMING_SOON } from "@/lib/site-flags";
import { R_CTA_OUTLINE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import { getYoutubeVideoId } from "@/lib/youtube";
import type { ProjectItem, ProjectStatus, VtuberProfile } from "@/types/vtuber";

type ProjectsProps = {
  data: VtuberProfile;
  /**
   * Cover of the cafe card: the cutout `/cafe` shows (full KV, spoil or
   * silhouette, per the Key Visual mode), and only once the cafe has opened
   * (gate phase "open"). `null` before then, so the card never shows the KV early.
   */
  cafeCover: string | null;
};

const STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: "กำลังดำเนินการ", className: "text-r-acc" },
  upcoming: { label: "เร็วๆ นี้", className: "text-r-pri-hover" },
  ended: { label: "สิ้นสุดแล้ว", className: "text-r-text-2" },
};
const STATUS_ORDER: Record<ProjectStatus, number> = { upcoming: 0, active: 1, ended: 2 };

const CATEGORY: Record<string, { label: string; icon: LucideIcon }> = {
  hbd: { label: "วันเกิด", icon: Cake },
  cafe: { label: "คาเฟ่", icon: Coffee },
  fansong: { label: "Fansong", icon: Music2 },
  mv: { label: "Fansong", icon: Music2 },
};
const categoryOf = (project: ProjectItem) =>
  CATEGORY[project.category.toLowerCase()] ?? { label: project.category, icon: Music2 };

/** "6 Dec" / "19 May 2024" (dates stay in English). */
function enDate(iso: string | undefined, withYear: boolean) {
  const ymd = iso?.slice(0, 10);
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** One date line per project, from the data it belongs to (cafe: opening day only — no pre-order dates). */
function whenLine(project: ProjectItem, data: VtuberProfile): string | null {
  switch (project.category.toLowerCase()) {
    case "cafe": {
      const open = enDate(data.cafe.dispatch?.schedule?.startsAt, false);
      return open ? `เปิด ${open}` : null;
    }
    case "hbd":
      return data.basic.birthdayLabel ?? null;
    case "fansong":
    case "mv": {
      const song = data.basic.originalSong;
      const same = song?.url && project.youtubeUrl && getYoutubeVideoId(song.url) === getYoutubeVideoId(project.youtubeUrl);
      const date = same ? enDate(song.releasedAt, true) : null;
      return date ? `MV · ${date}` : null;
    }
    default:
      return project.year ? String(project.year) : null;
  }
}

/** Cover per card: the cafe card shows the same cutout as `/cafe`, once the cafe has opened. */
function coverOf(project: ProjectItem, cafeCover: string | null): string | null {
  if (project.category.toLowerCase() === "cafe") return cafeCover;
  return project.cover;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-r-bg/82 px-[11px] py-[5px] text-xs whitespace-nowrap ring-1 ring-r-text-2/15 ring-inset backdrop-blur-[6px]",
        STATUS[status].className
      )}
    >
      {STATUS[status].label}
    </span>
  );
}

function Cover({ src, category, className }: { src: string | null; category: ReturnType<typeof categoryOf>; className?: string }) {
  const Icon = category.icon;
  return (
    <span
      className={cn(
        "relative block aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--r-pri)_25%,transparent),rgb(255_255_255/0.025)_70%)] ring-1 ring-r-text-2/15 ring-inset",
        className
      )}
    >
      {src ? (
        <ProtectedImage
          src={src}
          alt=""
          loading="lazy"
          className={cn("absolute inset-0 size-full object-top", src.endsWith(".svg") || src.includes("/kv/") ? "object-contain" : "object-cover")}
        />
      ) : (
        <Icon aria-hidden className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-r-text-2/60" />
      )}
    </span>
  );
}

function ProjectCardR({ project, data, cafeCover }: { project: ProjectItem; data: VtuberProfile; cafeCover: string | null }) {
  const category = categoryOf(project);
  const Icon = category.icon;
  const cover = coverOf(project, cafeCover);
  const when = whenLine(project, data);
  const href = `/projects/${project.slug}`;
  const cta = project.ctas?.find((c) => c.url.includes("upload")) ?? project.cta;
  const ctaExternal = cta?.url.startsWith("http");

  return (
    <article className="relative r-card rounded-[20px] p-3 md:rounded-3xl md:px-2.5 md:pt-2.5 md:pb-5">
      {/* phones: thumb left · text right */}
      <div className="flex gap-3.5 md:hidden">
        <Cover src={cover} category={category} className="w-[118px] shrink-0 self-start rounded-xl" />
        <div className="min-w-0 flex-1">
          <StatusBadge status={project.status} />
          <h3 className="mt-2 text-[0.96875rem] leading-[1.35] text-r-text">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none">
              {project.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-r-text-2">
            <Icon aria-hidden className="size-3.5" />
            {category.label}
          </p>
          {when ? <p className="mt-0.5 text-xs text-r-text-3">{when}</p> : null}
          {cta ? (
            <a
              href={cta.url}
              target={ctaExternal ? "_blank" : undefined}
              rel={ctaExternal ? "noopener noreferrer" : undefined}
              className="relative z-10 mt-2.5 inline-flex items-center gap-[5px] text-[0.8125rem] text-r-pri hover:text-r-pri-hover"
            >
              {cta.label}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      {/* tablet + desktop: cover on top */}
      <div className="hidden md:block">
        <span className="relative block">
          <Cover src={cover} category={category} className="rounded-[18px]" />
          <span className="absolute top-3 left-3">
            <StatusBadge status={project.status} />
          </span>
        </span>
        <div className="px-2 pt-4">
          <p className="flex items-center gap-[7px] text-[0.78125rem] text-r-text-2">
            <Icon aria-hidden className="size-3.5" />
            {category.label}
            {project.year ? <span className="text-r-text-3">· {project.year}</span> : null}
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg leading-[1.4] text-r-text">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none">
              {project.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-[1.55] text-r-text-3">
            {[project.titleLocal, project.summary].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </article>
  );
}

function AllProjectsLink({ className }: { className?: string }) {
  return (
    <Link href="/projects" className={cn(R_CTA_OUTLINE_CLASS, className)}>
      ดูโปรเจกต์ทั้งหมด
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Home · โปรเจกต์แฟนคลับ (project R · PJ1). */
export function Projects({ data, cafeCover }: ProjectsProps) {
  if (PROJECTS_COMING_SOON) {
    return (
      <Section id="projects">
        <ScrollReveal>
          <ProjectsHeading />
        </ScrollReveal>
        <ScrollReveal>
          <ProjectsComingSoonBox className="mt-8 sm:mt-10" />
        </ScrollReveal>
      </Section>
    );
  }
  if (data.projects.length === 0) return null;

  // Coming soon first, then running, then finished; newer years first within each.
  const projects = [...data.projects].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (b.year ?? 0) - (a.year ?? 0)
  );

  return (
    <Section id="projects">
      <ScrollReveal>
        <SectionHeader
          eyebrow="Fan Projects"
          title="โปรเจกต์แฟนคลับ"
          description={<span className="text-r-text-3">โปรเจกต์ที่{data.fan.fanName}ทำให้ {data.basic.name}</span>}
          action={<AllProjectsLink className="hidden md:inline-flex" />}
        />
      </ScrollReveal>

      <ScrollReveal className="mt-6 md:mt-7">
        <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-5">
          {projects.map((project) => (
            <li key={project.id} className="min-w-0">
              <ProjectCardR project={project} data={data} cafeCover={cafeCover} />
            </li>
          ))}
        </ul>
      </ScrollReveal>

      <AllProjectsLink className="mt-6 md:hidden" />
    </Section>
  );
}
