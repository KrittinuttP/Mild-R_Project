import { HeartHandshake, Sparkles } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { BackLink } from "@/components/layout/BackLink";
import {
  BODY_CLASS,
  DISPLAY_H1_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

export const PROJECTS_TITLE = "Fan Projects";
export const PROJECTS_HEADING = "โปรเจกต์แฟนคลับ";
export const PROJECTS_DESCRIPTION = "โปรเจกต์ฮันนี่สำหรับ Mild-R";

type ProjectsHeadingProps = {
  as?: "h1" | "h2";
};

/** Shared Projects heading (home section + /projects pages). */
export function ProjectsHeading({ as: Heading = "h2" }: ProjectsHeadingProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <HeartHandshake className="size-4 text-[#e85a7a]" aria-hidden />
        <p className={META_CLASS}>{PROJECTS_TITLE}</p>
      </div>
      <Heading
        className={cn(
          "mt-3",
          Heading === "h1" ? DISPLAY_H1_CLASS : DISPLAY_H2_CLASS
        )}
      >
        {PROJECTS_HEADING}
      </Heading>
      <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>{PROJECTS_DESCRIPTION}</p>
    </>
  );
}

export function ProjectsComingSoonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        GLASS_CARD_CLASS,
        "relative flex flex-col items-center overflow-hidden px-6 py-14 text-center sm:py-20",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(232,90,122,0.16),transparent_65%)]" />
      <span className="relative flex size-12 items-center justify-center rounded-2xl bg-[#e85a7a]/10 text-[#f3b8c4]">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <p className={cn("relative mt-5 tracking-wide", DISPLAY_H3_CLASS)}>
        Coming soon
      </p>
      <p className="relative mt-2 text-sm text-[#f3b8c4]/70 sm:text-base">
        เร็วๆ นี้ รอติดตามกันนะ
      </p>
    </div>
  );
}

/** Full-page placeholder for /projects and /projects/[slug] while Projects are closed. */
export function ProjectsComingSoonPage() {
  return (
    <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.18),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl">
        <BackLink href="/#projects" className="mb-8">
          กลับหน้าแรก
        </BackLink>
        <ScrollReveal>
          <ProjectsHeading as="h1" />
        </ScrollReveal>
        <ScrollReveal>
          <ProjectsComingSoonBox className="mt-10 sm:mt-12" />
        </ScrollReveal>
      </div>
    </section>
  );
}
