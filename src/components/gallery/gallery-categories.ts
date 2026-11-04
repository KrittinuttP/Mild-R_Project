import { R_PILL_ACTIVE_CLASS } from "@/lib/site-ui";

export type GalleryCategoryKey = "archive" | "live" | "fanart";

export type GalleryCategory = {
  key: GalleryCategoryKey;
  label: string;
  href: string;
};

export const GALLERY_CATEGORIES: readonly GalleryCategory[] = [
  { key: "archive", label: "Moments", href: "/gallery/archive" },
  { key: "live", label: "Live covers", href: "/gallery/live" },
  { key: "fanart", label: "Fan art", href: "/gallery/fanart" },
];

export const DEFAULT_GALLERY_CATEGORY: GalleryCategoryKey = "archive";

export function parseGalleryCategory(value: unknown): GalleryCategoryKey {
  return GALLERY_CATEGORIES.some((c) => c.key === value)
    ? (value as GalleryCategoryKey)
    : DEFAULT_GALLERY_CATEGORY;
}

/** Capsule holding the category pills (CI A+ segmented style). */
export const GALLERY_PILL_GROUP_CLASS =
  "inline-flex max-w-full flex-wrap gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-r-line ring-inset";
export const GALLERY_PILL_CLASS =
  // Narrower below 360px so the 3 pills stay on one line on 320px phones.
  "inline-flex h-9 items-center rounded-full px-3 text-[13px] min-[360px]:px-4 min-[360px]:text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";
export const GALLERY_PILL_ACTIVE_CLASS = R_PILL_ACTIVE_CLASS;
export const GALLERY_PILL_IDLE_CLASS = "text-r-text-2 hover:text-r-text";
