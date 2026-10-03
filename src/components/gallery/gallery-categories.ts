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

export const GALLERY_PILL_CLASS =
  "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60";
export const GALLERY_PILL_ACTIVE_CLASS =
  "border-[#e85a7a]/60 bg-[#e85a7a]/20 text-[#fff5f7]";
export const GALLERY_PILL_IDLE_CLASS =
  "border-[#f3b8c4]/20 text-[#f3b8c4]/70 hover:border-[#f3b8c4]/40 hover:text-[#fff5f7]";
