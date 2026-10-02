import { ProjectCard } from "@/components/projects/ProjectCard";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/types/vtuber";

type ProjectListProps = {
  projects: ProjectItem[];
  /** Card title tag — h3 when the list sits under a section h2 (home). */
  headingAs?: "h2" | "h3";
  className?: string;
};

export function ProjectList({
  projects,
  headingAs = "h2",
  className,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <p className="mt-12 max-w-md text-sm text-[#f3b8c4]/75 sm:mt-16 sm:text-base">
        ยังไม่มีโปรเจกต์
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3",
        className
      )}
    >
      {projects.map((project) => (
        <li key={project.id} className="h-full">
          <ProjectCard project={project} headingAs={headingAs} />
        </li>
      ))}
    </ul>
  );
}
