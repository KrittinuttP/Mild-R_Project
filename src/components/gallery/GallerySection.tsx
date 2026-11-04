import type { ReactNode } from "react";

import { GalleryBoard } from "@/components/gallery/GalleryBoard";
import type { GalleryBoardMode, GalleryVariant } from "@/components/gallery/gallery-utils";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { BackLink } from "@/components/layout/BackLink";
import {
  R_BODY_CLASS,
  R_EYEBROW_CLASS,
  R_H1_CLASS,
  R_H2_CLASS,
  R_H3_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/types/vtuber";

type HeadingSize = "h1" | "h2" | "h3";

const HEADING_CLASS: Record<HeadingSize, string> = {
  h1: R_H1_CLASS,
  h2: R_H2_CLASS,
  h3: R_H3_CLASS,
};

type GallerySectionProps = {
  id: string;
  eyebrow?: string;
  title: string;
  /** Defaults to h1 style in full mode, h2 in preview. */
  headingSize?: HeadingSize;
  /** Top fade/glow blending into the previous section. */
  showTopFade?: boolean;
  description?: string;
  items: GalleryItem[];
  variant: GalleryVariant;
  mode: GalleryBoardMode;
  viewAllHref?: string;
  backHref?: string;
  backLabel?: string;
  /** Shown instead of the board when there are no items. */
  empty?: ReactNode;
  /** Small action on the right of the heading row (e.g. the fan art upload button). */
  headerAction?: ReactNode;
  className?: string;
};

export function GallerySection({
  id,
  eyebrow,
  title,
  headingSize,
  showTopFade = true,
  description,
  items,
  variant,
  mode,
  viewAllHref,
  backHref,
  backLabel = "กลับหน้าแรก",
  empty,
  headerAction,
  className,
}: GallerySectionProps) {
  const size: HeadingSize = headingSize ?? (mode === "full" ? "h1" : "h2");

  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-20 px-5 py-20 text-r-text sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16",
        variant === "archive" ? "bg-r-bg" : "bg-r-bg",
        className
      )}
    >
      {showTopFade ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent",
            variant === "archive" ? "from-r-bg" : "from-r-bg/80"
          )}
        />
      ) : null}

      {variant === "fan-art" && showTopFade ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(242,67,125,0.12),transparent_55%)]" />
      ) : null}

      <div className="relative mx-auto max-w-6xl">
        {backHref ? (
          <BackLink href={backHref} className="mb-8">
            {backLabel}
          </BackLink>
        ) : null}

        <ScrollReveal>
          {eyebrow ? (
            <p className={R_EYEBROW_CLASS}>{eyebrow}</p>
          ) : null}
          {headerAction ? (
            <div className={cn("flex items-center justify-between gap-4", eyebrow && "mt-3")}>
              <h2 className={cn("min-w-0", HEADING_CLASS[size])}>{title}</h2>
              <div className="shrink-0">{headerAction}</div>
            </div>
          ) : (
            <h2 className={cn(eyebrow && "mt-3", HEADING_CLASS[size])}>
              {title}
            </h2>
          )}
          {description ? (
            <p className={cn("mt-4 max-w-xl", R_BODY_CLASS)}>{description}</p>
          ) : null}
        </ScrollReveal>

        {items.length === 0 && empty ? (
          empty
        ) : (
          <GalleryBoard
            items={items}
            variant={variant}
            mode={mode}
            viewAllHref={viewAllHref}
          />
        )}
      </div>
    </section>
  );
}
