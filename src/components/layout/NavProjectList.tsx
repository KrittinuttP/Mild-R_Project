"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cake, Coffee } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProjectItem, VtuberProfile } from "@/types/vtuber";

type NavProject = {
  project: ProjectItem;
  title: string;
  href: string;
  /** Line under the title: what is happening now, or what the project is. */
  meta: string;
  /** Pink = open now (with glow) · soft pink = coming soon · none = released / ended. */
  dot: "open" | "soon" | null;
  action: { label: string; href: string } | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  hbd: "วันเกิด",
  cafe: "คาเฟ่",
  fansong: "Fansong",
  mv: "Fansong",
};

/** Cover crop for small thumbs, per category (the HBD card template is mostly blank paper). */
const THUMB_FOCUS: Record<string, { position: string; zoom: number }> = {
  hbd: { position: "27% 52%", zoom: 2.4 },
};

/** "6 Dec" in Bangkok time (dates stay in English). */
export function shortDate(iso: string | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(date);
}

/** A same-site "upload" CTA on an active project, e.g. HBD → send a birthday card. */
function openAction(project: ProjectItem) {
  if (project.status !== "active") return null;
  const cta = project.ctas?.find((c) => c.url.startsWith("/") && c.url.includes("upload"));
  return cta ? { label: "ส่ง Card", href: cta.url } : null;
}

function navProject(project: ProjectItem, data: VtuberProfile): NavProject {
  const category = project.category.toLowerCase();
  const action = openAction(project);
  const title = category === "hbd" && project.year ? `HBD ${project.year}` : (project.titleLocal && project.title.length > 22 ? project.titleLocal : project.title);
  const kind = [CATEGORY_LABEL[category] ?? project.category, project.year].filter(Boolean).join(" · ");

  let meta = kind;
  let dot: NavProject["dot"] = null;
  if (action) {
    meta = category === "hbd" ? "เปิดรับการ์ดอวยพร" : "เปิดรับอยู่";
    dot = "open";
  } else if (project.status === "upcoming") {
    const date = category === "cafe" ? shortDate(data.cafe.dispatch?.schedule?.startsAt) : null;
    meta = date ? `เร็วๆ นี้ · ${date}` : "เร็วๆ นี้";
    dot = "soon";
  }

  return { project, title, href: `/projects/${project.slug}`, meta, dot, action };
}

/** Open now → coming soon → released → ended. */
function rank(row: NavProject) {
  if (row.action) return 0;
  if (row.project.status === "upcoming") return 1;
  if (row.project.status === "active") return 2;
  return 3;
}

export function navProjects(data: VtuberProfile): NavProject[] {
  return data.projects
    .map((project) => navProject(project, data))
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index)
    .map(({ row }) => row);
}

function Thumb({ project, size }: { project: ProjectItem; size: number }) {
  const category = project.category.toLowerCase();
  const focus = THUMB_FOCUS[category];
  // The cafe card never shows its KV before opening, so the menu keeps the placeholder + cup.
  const isCafe = category === "cafe";
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-[10px] bg-[#2a1a20] ring-1 ring-r-text-2/15 ring-inset sm:rounded-xl"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {project.cover ? (
        <Image
          src={project.cover}
          alt=""
          fill
          sizes={`${size * 2}px`}
          unoptimized={project.cover.endsWith(".svg")}
          draggable={false}
          className="object-cover"
          style={focus ? { objectPosition: focus.position, transform: `scale(${focus.zoom})`, transformOrigin: focus.position } : undefined}
        />
      ) : null}
      {isCafe ? (
        <span className="absolute inset-0 flex items-center justify-center text-r-nurse/90">
          <Coffee className="size-[42%]" />
        </span>
      ) : null}
    </span>
  );
}

type NavProjectListProps = {
  data: VtuberProfile;
  /** md = mobile menu (48px covers) · sm = desktop dropdown (44px). */
  size: "sm" | "md";
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
  className?: string;
};

/**
 * Projects in the header menu (desktop dropdown + mobile menu): cover · name · one line of
 * real status. No row arrows — the whole row opens the project; the only button is the
 * project's open action (e.g. HBD "ส่ง Card"), kept on the right.
 */
export function NavProjectList({ data, size, onNavigate, className }: NavProjectListProps) {
  const rows = navProjects(data);
  const md = size === "md";
  return (
    <ul className={cn("flex flex-col gap-0.5", className)}>
      {rows.map((row) => (
        <li
          key={row.project.id}
          className={cn(
            "relative flex items-center gap-3 rounded-xl py-2 transition-colors hover:bg-r-text-2/8 has-[a:active]:bg-r-text-2/12",
            md ? "-mx-2.5 px-2.5" : "px-2.5"
          )}
        >
          <Thumb project={row.project} size={md ? 48 : 44} />
          <div className="min-w-0 flex-1">
            <Link
              href={row.href}
              onClick={(event) => onNavigate(event, row.href)}
              className={cn(
                "block truncate font-medium text-r-text outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-r-acc focus-visible:after:outline-solid",
                md ? "text-[15px]" : "text-sm"
              )}
            >
              {row.title}
            </Link>
            <span className={cn("mt-0.5 flex items-center gap-1.5 text-xs", row.dot ? "text-r-text-2/85" : "text-r-text-2/70")}>
              {row.dot ? (
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    row.dot === "open"
                      ? "bg-r-pri shadow-[0_0_0_3px_color-mix(in_srgb,var(--r-pri)_22%,transparent)]"
                      : "bg-r-text-2"
                  )}
                  aria-hidden
                />
              ) : null}
              <span className="truncate">{row.meta}</span>
            </span>
          </div>
          {row.action ? (
            <Link
              href={row.action.href}
              onClick={(event) => onNavigate(event, row.action!.href)}
              className={cn(
                "relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-r-pri font-semibold text-r-on-pri transition hover:bg-r-pri-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc",
                md ? "h-[34px] px-[13px] text-[12.5px]" : "h-[30px] px-[11px] text-xs"
              )}
            >
              <Cake className="size-3.5" aria-hidden />
              {row.action.label}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
