import type { Metadata } from "next";
import { BackLink } from "@/components/layout/BackLink";

import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import {
  PROJECTS_DESCRIPTION,
  PROJECTS_TITLE,
  ProjectsComingSoonPage,
  ProjectsHeading,
} from "@/components/projects/ProjectsComingSoon";
import { ProjectCardR, sortProjects } from "@/components/sections/Projects";
import { mildRData } from "@/data/vtuber-data";
import { PROJECTS_COMING_SOON } from "@/lib/site-flags";

export const metadata: Metadata = PROJECTS_COMING_SOON
  ? {
      title: `${PROJECTS_TITLE} | Mild-R Fanclub`,
      description: PROJECTS_DESCRIPTION,
    }
  : {
      title: `${PROJECTS_TITLE} | Mild-R Fanclub`,
      description: "โปรเจกต์ที่ฮันนี่จัดทำเพื่อ Mild-R เช่น Cafe และ Fansong",
    };

export default function ProjectsPage() {
  const projects = sortProjects(mildRData.projects);

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-r-bg">
        {PROJECTS_COMING_SOON ? (
          <ProjectsComingSoonPage />
        ) : (
          <section className="relative px-5 pb-24 pt-28 text-r-text sm:px-10 sm:pt-32 lg:px-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(242,67,125,0.14),transparent_55%),radial-gradient(ellipse_at_0%_10%,rgba(34,214,191,0.08),transparent_50%)]" />

            <div className="relative mx-auto max-w-6xl">
              <BackLink href="/#projects" className="mb-8">
                กลับหน้าแรก
              </BackLink>
              <ProjectsHeading as="h1" />
              {projects.length === 0 ? (
                <p className="mt-10 text-sm text-r-text-3">ยังไม่มีโปรเจกต์</p>
              ) : (
                <ul className="mt-10 grid grid-cols-1 gap-2.5 sm:mt-12 md:grid-cols-3 md:gap-5">
                  {projects.map((project) => (
                    <li key={project.id} className="h-full min-w-0">
                      <ProjectCardR project={project} data={mildRData} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
