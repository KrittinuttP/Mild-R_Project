import type { Metadata } from "next";
import { BackLink } from "@/components/layout/BackLink";

import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import { ProjectList } from "@/components/projects/ProjectList";
import {
  PROJECTS_DESCRIPTION,
  PROJECTS_TITLE,
  ProjectsComingSoonPage,
  ProjectsHeading,
} from "@/components/projects/ProjectsComingSoon";
import { mildRData } from "@/data/vtuber-data";
import { PROJECTS_COMING_SOON } from "@/lib/site-flags";

export const metadata: Metadata = PROJECTS_COMING_SOON
  ? {
      title: `${PROJECTS_TITLE} | Mild-R Fanclub`,
      description: PROJECTS_DESCRIPTION,
    }
  : {
      title: "Projects | Mild-R Fanclub",
      description: "โปรเจกต์ที่ฮันนี่จัดทำเพื่อ Mild-R เช่น Cafe และ Fansong",
    };

export default function ProjectsPage() {
  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        {PROJECTS_COMING_SOON ? (
          <ProjectsComingSoonPage />
        ) : (
          <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.18),transparent_55%)]" />

            <div className="relative mx-auto max-w-6xl">
              <BackLink href="/#projects" className="mb-8">
                กลับหน้าแรก
              </BackLink>
              <ProjectsHeading as="h1" />
              <ProjectList projects={mildRData.projects} />
            </div>
          </section>
        )}
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
