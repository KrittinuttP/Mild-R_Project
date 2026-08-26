import type { Metadata } from "next";
import { BackLink } from "@/components/layout/BackLink";

import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { ProjectList } from "@/components/projects/ProjectList";
import { getProjectsByCategory, mildRData } from "@/data/vtuber-data";
import { META_CLASS, DISPLAY_H1_CLASS, BODY_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const CATEGORY_COPY: Record<
  string,
  { eyebrow: string; title: string; description: string }
> = {
  fansong: {
    eyebrow: "Fansong",
    title: "Fansong",
    description: "เพลง / MV ของ Mild-R",
  },
};

type ProjectsPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({
  searchParams,
}: ProjectsPageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const key = category?.toLowerCase();
  const copy = key ? CATEGORY_COPY[key] : undefined;

  if (copy) {
    return {
      title: `${copy.title} | Mild-R Fanclub`,
      description: copy.description,
    };
  }

  return {
    title: "Projects | Mild-R Fanclub",
    description: "โปรเจกต์ของ Mild-R เช่น Cafe และ Fansong",
  };
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const { category: rawCategory } = await searchParams;
  const category = rawCategory?.trim().toLowerCase() || undefined;
  const copy = category ? CATEGORY_COPY[category] : undefined;

  const projects = category
    ? getProjectsByCategory(category)
    : mildRData.projects;

  const eyebrow = copy?.eyebrow ?? "Projects";
  const title = copy?.title ?? "รวมโปรเจกต์";
  const description =
    copy?.description ?? "โปรเจกต์ของ Mild-R เช่น Cafe และ Fansong";

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.18),transparent_55%)]" />

          <div className="relative mx-auto max-w-6xl">
            {category ? (
              <BackLink href="/projects" className="mb-8">
                โปรเจกต์ทั้งหมด
              </BackLink>
            ) : null}

            <p className={META_CLASS}>
              {eyebrow}
            </p>
            <h1 className={cn("mt-4 max-w-2xl", DISPLAY_H1_CLASS)}>
              {title}
            </h1>
            <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>
              {description}
            </p>

            <ProjectList projects={projects} emptyLabel={category} />
          </div>
        </section>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
