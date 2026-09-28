import Link from "next/link";

import {
  GALLERY_CATEGORIES,
  GALLERY_PILL_ACTIVE_CLASS,
  GALLERY_PILL_CLASS,
  GALLERY_PILL_IDLE_CLASS,
  type GalleryCategoryKey,
} from "@/components/gallery/gallery-categories";
import { BackLink } from "@/components/layout/BackLink";
import { cn } from "@/lib/utils";

type GallerySubNavProps = {
  active: GalleryCategoryKey;
  className?: string;
};

/** Top bar on /gallery/* pages: back to hub + sibling category links. */
export function GallerySubNav({ active, className }: GallerySubNavProps) {
  return (
    <div
      className={cn(
        "px-5 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <BackLink href="/gallery">Gallery</BackLink>
        <nav aria-label="หมวด Gallery" className="flex flex-wrap gap-2">
          {GALLERY_CATEGORIES.map((category) => {
            const isActive = category.key === active;
            return (
              <Link
                key={category.key}
                href={category.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  GALLERY_PILL_CLASS,
                  isActive ? GALLERY_PILL_ACTIVE_CLASS : GALLERY_PILL_IDLE_CLASS
                )}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
