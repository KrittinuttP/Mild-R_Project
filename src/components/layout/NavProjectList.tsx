"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Music2 } from "lucide-react";

import { CafeLensMark } from "@/components/projects/CafeLensMark";
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
};

const CATEGORY_LABEL: Record<string, string> = {
  hbd: "วันเกิด",
  cafe: "คาเฟ่",
  fansong: "Fansong",
  mv: "Fansong",
};

/** HBD: the whole card, landscape (25 Nov · was a square crop on the character). */
const HBD_THUMB = "/assets/hbd/template/hbd-card-cover.jpg";
/** Card ratio 2840 × 2015 · every thumb is this shape (25 Nov), so the rows match. */
const SLOT_RATIO = 1.42;

/** "6 Dec" in Bangkok time (dates stay in English). */
export function shortDate(iso: string | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(date);
}

/**
 * Active project taking submissions (a same-site "upload" CTA), e.g. HBD cards.
 * The menu only says so in the status line — no send button (4 Nov).
 */
function isOpenForSubmissions(project: ProjectItem) {
  if (project.status !== "active") return false;
  return Boolean(project.ctas?.some((c) => c.url.startsWith("/") && c.url.includes("upload")));
}

function navProject(project: ProjectItem, data: VtuberProfile): NavProject {
  const category = project.category.toLowerCase();
  const open = isOpenForSubmissions(project);
  // Projects go by their own name (e.g. "Mild-R: Sherlock Sweetie"), never the Thai one on its own.
  const title = category === "hbd" && project.year ? `HBD ${project.year}` : project.title;
  const kind = [CATEGORY_LABEL[category] ?? project.category, project.year].filter(Boolean).join(" · ");

  let meta = kind;
  let dot: NavProject["dot"] = null;
  if (open) {
    meta = category === "hbd" ? "เปิดรับการ์ดอวยพร" : "เปิดรับอยู่";
    dot = "open";
  } else if (project.status === "upcoming") {
    const date = category === "cafe" ? shortDate(data.cafe.dispatch?.schedule?.startsAt) : null;
    meta = date ? `เร็วๆ นี้ · ${date}` : "เร็วๆ นี้";
    dot = "soon";
  }

  return { project, title, href: `/projects/${project.slug}`, meta, dot };
}

/** Open now → coming soon → released → ended. */
function rank(row: NavProject) {
  if (row.dot === "open") return 0;
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
  const slot = Math.round(size * SLOT_RATIO);
  // HBD: the whole card. Cafe: the gold heart lens on the cafe's green (the wordmark is too small here).
  const isHbd = category === "hbd";
  const isCafe = category === "cafe";
  return (
    <span className="flex shrink-0 items-center justify-center" style={{ width: slot }} aria-hidden>
      {isHbd ? (
        <span
          className="relative overflow-hidden rounded-[7px] shadow-[0_3px_10px_rgba(0,0,0,0.4)] ring-1 ring-white/10 ring-inset"
          style={{ width: slot, height: size }}
        >
          <Image src={HBD_THUMB} alt="" fill sizes={`${slot * 2}px`} draggable={false} className="object-cover" />
        </span>
      ) : (
        <span
          className="relative overflow-hidden rounded-[7px] bg-[#2a1a20] ring-1 ring-r-text-2/15 ring-inset"
          style={{ width: slot, height: size }}
        >
          {isCafe ? (
            <CafeLensMark />
          ) : project.cover ? (
            <Image
              src={project.cover}
              alt=""
              fill
              sizes={`${size * 2}px`}
              unoptimized={project.cover.endsWith(".svg")}
              draggable={false}
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-r-text-2/60">
              <Music2 className="size-[42%]" />
            </span>
          )}
        </span>
      )}
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
 * real status. No row arrows and no buttons — the whole row opens the project
 * (no "ส่ง Card" in the menu, 4 Nov).
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
        </li>
      ))}
    </ul>
  );
}
