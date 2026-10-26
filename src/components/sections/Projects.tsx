import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ProjectList } from "@/components/projects/ProjectList";
import {
  ProjectsComingSoonBox,
  ProjectsHeading,
} from "@/components/projects/ProjectsComingSoon";
import { buttonVariants } from "@/components/ui/button";
import { PROJECTS_COMING_SOON } from "@/lib/site-flags";
import { CTA_OUTLINE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";
import { Section } from "@/components/common/Section";

type ProjectsProps = {
  data: VtuberProfile;
};

/** Home: fan-made projects — shares the Fan art background as the "from Honey" group. */
export function Projects({ data }: ProjectsProps) {
  if (!PROJECTS_COMING_SOON && data.projects.length === 0) return null;

  return (
    <Section id="projects">
      <ScrollReveal>
        <ProjectsHeading />
      </ScrollReveal>

      {PROJECTS_COMING_SOON ? (
        <ScrollReveal>
          <ProjectsComingSoonBox className="mt-8 sm:mt-10" />
        </ScrollReveal>
      ) : (
        <>
          <ScrollReveal>
            <ProjectList
              projects={data.projects}
              headingAs="h3"
              className="mt-8 sm:mt-10"
            />
          </ScrollReveal>

          <ScrollReveal delay={0.08} className="mt-8 sm:mt-10">
            <Link
              href="/projects"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                CTA_OUTLINE_CLASS
              )}
            >
              ดูโปรเจกต์ทั้งหมด
              <ArrowUpRight className="size-4" />
            </Link>
          </ScrollReveal>
        </>
      )}
    </Section>
  );
}
