import Link from "next/link";
import { ArrowUpRight, Sparkles, Upload } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { BackLink } from "@/components/layout/BackLink";
import { HBD_CARD_TEMPLATE } from "@/lib/hbd-upload";
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
    body: "โปรเจกต์ฉลองวันเกิด Mild-R · 12.12.2026",
  },
] as const;

type HbdProjectDetailProps = {
  project: ProjectItem;
};

/** Birthday project landing — intro + CTAs only; gallery lives on /hbd/2026. */
export function HbdProjectDetail({ project }: HbdProjectDetailProps) {
  return (
    <article className="relative overflow-hidden text-[#fff5f7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-5%,rgba(232,90,122,0.28),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_30%,rgba(243,184,196,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-10 sm:pt-32 lg:px-16">
        <BackLink href="/projects" className="mb-8">
          โปรเจกต์ทั้งหมด
        </BackLink>

        <header className="mx-auto mt-10 max-w-3xl text-center sm:mt-12">
          <p className="inline-flex rounded-full bg-[#e85a7a]/15 px-3 py-1 text-xs tracking-[0.18em] text-[#f3b8c4] uppercase sm:text-sm">
            Birthday · 12.12.2026
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
            <p className="mt-3 text-xl text-[#f3b8c4]/85 sm:text-2xl">
              {project.titleLocal}
            </p>
          ) : null}

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg">
            {project.summary}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/hbd/2026"
              prefetch={false}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e85a7a] px-6 py-3.5 text-sm font-normal text-[#140a0d] shadow-[0_10px_30px_rgba(232,90,122,0.35)] transition hover:bg-[#f3b8c4] sm:w-auto"
            >
              <Sparkles className="size-4" />
              เปิดดูคำอวยพร
              <ArrowUpRight className="size-4 opacity-80" />
            </Link>
            <Link
              href="/hbd/2026/upload"
              prefetch={false}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#f3b8c4]/30 bg-white/[0.04] px-6 py-3.5 text-sm font-normal text-[#fff5f7] transition hover:border-[#e85a7a]/45 hover:bg-[#e85a7a]/15 sm:w-auto"
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
              className="rounded-2xl bg-white/[0.03] px-4 py-5 text-center ring-1 ring-white/10 sm:px-5"
            >
              <p className="text-xs tracking-[0.18em] text-[#e85a7a] uppercase sm:text-sm">
                {feature.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#f7d7de]/85">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>

        <section className="mt-16 text-center">
          <p className="text-xs tracking-[0.18em] text-[#f3b8c4]/75 uppercase sm:text-sm">
            Wish card
          </p>
          <h2 className={cn(DISPLAY, "mt-3 text-2xl font-normal sm:text-3xl")}>
            ตัวอย่างการ์ดอวยพร
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#f3b8c4]/80">
            การ์ดที่เป็นหัวใจของโปรเจกต์นี้
          </p>

          <div className="mx-auto mt-8 w-fit max-w-full overflow-hidden rounded-3xl bg-black/25 p-3 ring-1 ring-[#e85a7a]/25 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-4">
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
                className="text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        <footer className="mt-20 text-center">
          <div
            className="mx-auto h-px w-28 bg-[#e85a7a]/55 sm:w-40"
            aria-hidden
          />
          <p
            className={cn(
              DISPLAY,
              "mt-6 text-lg font-normal text-[#f3b8c4]/90 sm:text-xl"
            )}
          >
            เชิญชวนฮันนี่มาอวยพร mutant สาวของเรา · 12.12.2026
          </p>
        </footer>
      </div>
    </article>
  );
}
