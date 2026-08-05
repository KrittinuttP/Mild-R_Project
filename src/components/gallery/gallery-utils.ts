import type { FanArtItem, GalleryItem, GalleryTileSize } from "@/types/vtuber";

export const GALLERY_LOAD_MORE_STEP = 6;
export const GALLERY_PREVIEW_COUNT = 8;

export const SIZE_CLASS: Record<GalleryTileSize, string> = {
  sm: "col-span-1 row-span-1",
  md: "col-span-1 row-span-1 sm:row-span-2",
  lg: "col-span-2 row-span-2",
  tall: "col-span-1 row-span-2",
  wide: "col-span-2 row-span-1",
};

export type GalleryVariant = "archive" | "fan-art";
export type GalleryBoardMode = "preview" | "full";

export function sortGalleryItems<T extends GalleryItem>(items: T[]) {
  return [...items].sort((a, b) => {
    const aLazy = a.loadOnDemand ? 1 : 0;
    const bLazy = b.loadOnDemand ? 1 : 0;
    return aLazy - bLazy;
  });
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFanArtItem(item: GalleryItem): item is FanArtItem {
  return "artist" in item && Boolean((item as FanArtItem).artist);
}

export function artistCredit(item: GalleryItem) {
  if (!isFanArtItem(item)) return item.credit ?? "";
  const handle = item.artist.handle ? ` · ${item.artist.handle}` : "";
  return `${item.artist.name}${handle}`;
}

export function initialVisibleCount(
  items: GalleryItem[],
  mode: GalleryBoardMode,
  previewCount = GALLERY_PREVIEW_COUNT
) {
  if (mode === "preview") {
    return Math.min(previewCount, items.length);
  }
  const eager = items.filter((item) => !item.loadOnDemand).length;
  return Math.max(eager || 6, Math.min(12, items.length));
}
