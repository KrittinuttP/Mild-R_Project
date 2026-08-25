import { GalleryBoard } from "@/components/gallery/GalleryBoard";
import type { GalleryBoardMode, GalleryVariant } from "@/components/gallery/gallery-utils";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { BackLink } from "@/components/layout/BackLink";
import { META_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/types/vtuber";

type GallerySectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
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
  title,
  description,
  items,
  variant,
  mode,
  viewAllHref,
  backHref,
  backLabel = "กลับหน้าแรก",
  className,
}: GallerySectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-20 px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16",
        variant === "archive" ? "bg-[#12080c]" : "bg-[#10070b]",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent",
          variant === "archive" ? "from-[#140a0d]" : "from-[#140a0d]/80"
        )}
      />

      {variant === "fan-art" ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_80%_0%,rgba(232,90,122,0.12),transparent_55%)]" />
      ) : null}

      <div className="relative mx-auto max-w-6xl">
        {backHref ? (
          <BackLink href={backHref} className="mb-8">
            {backLabel}
          </BackLink>
        ) : null}

        <ScrollReveal>
          <p className={META_CLASS}>{eyebrow}</p>
          <h2
            className={cn(
              "mt-3 font-[family-name:var(--font-display)] font-bold tracking-tight",
              mode === "full"
                ? "text-4xl sm:text-5xl md:text-6xl"
                : "text-3xl sm:text-4xl md:text-5xl"
            )}
          >
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-sm text-[#f7d7de]/85 sm:text-base">
            {description}
          </p>
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
