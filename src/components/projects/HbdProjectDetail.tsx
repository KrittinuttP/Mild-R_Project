import Link from "next/link";
import { ArrowUpRight, Sparkles, Upload } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { BackLink } from "@/components/layout/BackLink";
import { HBD_CARD_TEMPLATE } from "@/lib/hbd-upload";
import { R_CTA_OUTLINE_CLASS, R_CTA_PRIMARY_CLASS, R_CARD_TITLE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/types/vtuber";

const DISPLAY = "font-[family-name:var(--font-display)]";

const FEATURES = [
  {
    title: "จากฮันนี่",
    body: "คำอวยพรจริงจากแฟนคลับถึง Mild-R",
  },
  {
    title: "ความทรงจำปีนี้",
    body: "เก็บคำอวยพรปีนี้ไว้เป็นความทรงจำร่วมกัน",
  },
  {
    title: "วันเกิด 2026",
    body: "โปรเจกต์ฉลองวันเกิด Mild-R · 12 Dec 2026",
  },
] as const;

type HbdProjectDetailProps = {
  project: ProjectItem;
};

/** Birthday project landing — intro + CTAs only; gallery lives on /hbd/2026. */
export function HbdProjectDetail({ project }: HbdProjectDetailProps) {
  return (
    <article className="relative overflow-hidden text-r-text">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-5%,rgba(242,67,125,0.22),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_30%,rgba(34,214,191,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-10 sm:pt-32 lg:px-16">
        <BackLink href="/projects" className="mb-8">
          โปรเจกต์ทั้งหมด
        </BackLink>

        <header className="mx-auto mt-10 max-w-3xl text-center sm:mt-12">
          <p className="inline-flex rounded-full bg-r-pri/15 px-3 py-1 text-xs tracking-[0.18em] text-r-text-2 uppercase sm:text-sm">
            Birthday · 12 Dec 2026
          </p>

          <h1
            className={cn(
              DISPLAY,
              "mt-5 text-4xl font-normal tracking-tight sm:text-5xl md:text-6xl"
            )}
          >
            {project.title}
          </h1>

          {project.titleLocal ? (
            <p className="mt-3 text-xl text-r-text-2 sm:text-2xl">
              {project.titleLocal}
            </p>
          ) : null}

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-r-text-2 sm:text-lg">
            {project.summary}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/hbd/2026"
              prefetch={false}
              className={cn(R_CTA_PRIMARY_CLASS, "w-full sm:w-auto")}
            >
              <Sparkles className="size-4" />
              เปิดดูคำอวยพร
              <ArrowUpRight className="size-4 opacity-80" />
            </Link>
            <Link
              href="/hbd/2026/upload"
              prefetch={false}
              className={cn(R_CTA_OUTLINE_CLASS, "w-full sm:w-auto")}
            >
              <Upload className="size-4" />
              ส่งการ์ดอวยพร
            </Link>
          </div>
        </header>

        <ul className="mt-16 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="r-card rounded-2xl px-4 py-5 text-center sm:px-5"
            >
              <p className={R_CARD_TITLE_CLASS}>
                {feature.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-r-text-2">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>

        <section className="mt-16 text-center">
          {/* HBD pages keep text off mint (decisions 3 Nov) */}
          <p className="text-xs tracking-[0.24em] text-r-text-2 uppercase">Wish card</p>
          <h2 className={cn(DISPLAY, "mt-3 text-2xl font-normal sm:text-3xl")}>
            ตัวอย่างการ์ดอวยพร
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-r-text-2">
            การ์ดที่เป็นหัวใจของโปรเจกต์นี้
          </p>

          <div className="mx-auto mt-8 w-fit max-w-full overflow-hidden rounded-3xl bg-black/25 p-3 ring-1 ring-r-pri/25 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-4">
            <ProtectedImage
              src={project.cover || HBD_CARD_TEMPLATE.path}
              alt="เทมเพลตการ์ดอวยพร Mild-R"
              className="mx-auto h-auto max-h-[min(70dvh,36rem)] w-auto max-w-full object-contain"
            />
          </div>
        </section>

        {project.body.length > 0 ? (
          <div className="mx-auto mt-14 max-w-xl space-y-4 text-center">
            {project.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="text-base leading-relaxed text-r-text-2 sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        <footer className="mt-20 text-center">
          <div
            className="mx-auto h-px w-28 bg-r-pri/55 sm:w-40"
            aria-hidden
          />
          <p
            className={cn(
              DISPLAY,
              "mt-6 text-lg font-normal text-r-text-2 sm:text-xl"
            )}
          >
            เชิญชวนฮันนี่มาอวยพร mutant สาวของเรา · 12 Dec 2026
          </p>
        </footer>
      </div>
    </article>
  );
}
