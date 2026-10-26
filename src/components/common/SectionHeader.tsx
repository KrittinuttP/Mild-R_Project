import type { ReactNode } from "react";

import { R_BODY_CLASS, R_EYEBROW_CLASS, R_H2_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  /** Small uppercase label above the title — mint (CI A+). */
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  /** Right-hand slot, e.g. a "ดูทั้งหมด" link. Wraps under the title on narrow screens. */
  action?: ReactNode;
  /** id for the <h2> so the section can use aria-labelledby. */
  titleId?: string;
  className?: string;
};

/** Project R section heading: eyebrow → title → description, optional action on the right. */
export function SectionHeader({ eyebrow, title, description, action, titleId, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-2xl">
        <p className={R_EYEBROW_CLASS}>{eyebrow}</p>
        <h2 id={titleId} className={cn("mt-3", R_H2_CLASS)}>
          {title}
        </h2>
        {description ? <div className={cn("mt-4 max-w-xl", R_BODY_CLASS)}>{description}</div> : null}
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </div>
  );
}
