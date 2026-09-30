"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import {
  GALLERY_CATEGORIES,
  GALLERY_PILL_ACTIVE_CLASS,
  GALLERY_PILL_CLASS,
  GALLERY_PILL_IDLE_CLASS,
} from "@/components/gallery/gallery-categories";
import { cn } from "@/lib/utils";

/** Category pills in the /gallery layout; active state comes from the URL segment. */
export function GalleryCategoryTabs() {
  const segment = useSelectedLayoutSegment();

  return (
    <nav aria-label="หมวด Gallery" className="mt-8 flex flex-wrap gap-2">
      {GALLERY_CATEGORIES.map((category) => {
        const active = category.key === segment;
        return (
          <Link
            key={category.key}
            href={category.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              GALLERY_PILL_CLASS,
              active ? GALLERY_PILL_ACTIVE_CLASS : GALLERY_PILL_IDLE_CLASS
            )}
          >
            {category.label}
          </Link>
        );
      })}
    </nav>
  );
}
