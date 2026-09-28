import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { HbdProjectDetail } from "@/components/projects/HbdProjectDetail";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import {
  PROJECTS_DESCRIPTION,
  PROJECTS_TITLE,
  ProjectsComingSoonPage,
} from "@/components/projects/ProjectsComingSoon";
import { getProjectBySlug, mildRData } from "@/data/vtuber-data";
import { PROJECTS_COMING_SOON } from "@/lib/site-flags";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return mildRData.projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return { title: "Project | Mild-R Fanclub" };
  }

  if (PROJECTS_COMING_SOON) {
    return {
      title: `${PROJECTS_TITLE} | Mild-R Fanclub`,
      description: PROJECTS_DESCRIPTION,
    };
  }

  return {
    title: `${project.title} | Mild-R Projects`,
    description: project.summary,
  };
}

export default async function ProjectSlugPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const isHbd =
    project.slug === "hbd" || project.category.toLowerCase() === "hbd";

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="relative flex-1 bg-[#140a0d] text-[#fff5f7]">
        {PROJECTS_COMING_SOON ? (
          <ProjectsComingSoonPage />
        ) : isHbd ? (
          <HbdProjectDetail project={project} />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_70%_0%,rgba(232,90,122,0.14),transparent_50%)]" />
            <ProjectDetail project={project} />
          </>
        )}
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
