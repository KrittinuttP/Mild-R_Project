import type { LucideIcon } from "lucide-react";

import { GalleryBoard } from "@/components/gallery/GalleryBoard";
import type { GalleryBoardMode, GalleryVariant } from "@/components/gallery/gallery-utils";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { BackLink } from "@/components/layout/BackLink";
import {
  BODY_CLASS,
  DISPLAY_H1_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/types/vtuber";

type HeadingSize = "h1" | "h2" | "h3";

const HEADING_CLASS: Record<HeadingSize, string> = {
  h1: DISPLAY_H1_CLASS,
  h2: DISPLAY_H2_CLASS,
  h3: DISPLAY_H3_CLASS,
};

type GallerySectionProps = {
  id: string;
  eyebrow?: string;
  icon?: LucideIcon;
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
  className?: string;
};

export function GallerySection({
  id,
  eyebrow,
  icon: Icon,
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
  className,
}: GallerySectionProps) {
  const size: HeadingSize = headingSize ?? (mode === "full" ? "h1" : "h2");

  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-20 px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16",
        variant === "archive" ? "bg-[#12080c]" : "bg-[#10070b]",
        className
      )}
    >
      {showTopFade ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent",
            variant === "archive" ? "from-[#140a0d]" : "from-[#140a0d]/80"
          )}
        />
      ) : null}

      {variant === "fan-art" && showTopFade ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(232,90,122,0.12),transparent_55%)]" />
      ) : null}

      <div className="relative mx-auto max-w-6xl">
        {backHref ? (
          <BackLink href={backHref} className="mb-8">
            {backLabel}
          </BackLink>
        ) : null}

        <ScrollReveal>
          {eyebrow ? (
            <div className="flex items-center gap-2">
              {Icon ? (
                <Icon className="size-4 text-[#e85a7a]" aria-hidden />
              ) : null}
              <p className={META_CLASS}>{eyebrow}</p>
            </div>
          ) : null}
          <h2 className={cn(eyebrow && "mt-3", HEADING_CLASS[size])}>
            {title}
          </h2>
          {description ? (
            <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>{description}</p>
          ) : null}
        </ScrollReveal>

        <GalleryBoard
          items={items}
          variant={variant}
          mode={mode}
          viewAllHref={viewAllHref}
        />
      </div>
    </section>
  );
}
