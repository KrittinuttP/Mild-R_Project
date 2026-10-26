import type { ReactNode, Ref } from "react";

import { SectionGlow } from "@/components/common/SectionGlow";
import { cn } from "@/lib/utils";

type SectionProps = {
  id: string;
  children: ReactNode;
  /** Stronger corner light — Member · Follow (CI A+). */
  strong?: boolean;
  /** Gradient hairline along the top edge (pink → nurse white → mint). */
  hairline?: boolean;
  /** Extra classes on <section> (e.g. overflow-hidden, safe-area padding). */
  className?: string;
  /** Extra classes on the max-w-6xl content wrapper. */
  innerClassName?: string;
  ref?: Ref<HTMLElement>;
  "aria-labelledby"?: string;
};

/**
 * Project R home section frame: anchor offset, spacing, CI A+ corner light,
 * top hairline and the max-w-6xl content column. The floor colour comes from
 * <main> (bg-r-bg), so sections stay transparent.
 */
export function Section({
  id,
  children,
  strong = false,
  hairline = true,
  className,
  innerClassName,
  ref,
  ...rest
}: SectionProps) {
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={rest["aria-labelledby"]}
      className={cn(
        "relative scroll-mt-20 px-5 py-20 text-r-text sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16",
        className
      )}
    >
      <SectionGlow strong={strong} />
      {hairline ? <div aria-hidden className="r-hairline absolute inset-x-0 top-0" /> : null}
      <div className={cn("relative mx-auto max-w-6xl", innerClassName)}>{children}</div>
    </section>
  );
}
