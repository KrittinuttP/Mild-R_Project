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

/** Same spans as SIZE_CLASS, from `sm` up (below `sm` the Moments board is masonry). */
export const SIZE_CLASS_FROM_SM: Record<GalleryTileSize, string> = {
  sm: "sm:col-span-1 sm:row-span-1",
  md: "sm:col-span-1 sm:row-span-2",
  lg: "sm:col-span-2 sm:row-span-2",
  tall: "sm:col-span-1 sm:row-span-2",
  wide: "sm:col-span-2 sm:row-span-1",
};

/** Masonry grid rows per column width; one extra row is the vertical gap. */
export const MASONRY_UNITS = 20;
const MASONRY_RATIO_MIN = 0.45;
const MASONRY_RATIO_MAX = 1.75;
const FALLBACK_RATIO: Record<GalleryTileSize, number> = {
  sm: 1,
  md: 1.5,
  lg: 1,
  tall: 1.5,
  wide: 0.5,
};

export type MasonrySlot = { column: 1 | 2; row: number; span: number };

/**
 * Two-column masonry: each item goes into the shorter column, so the result for
 * a prefix never changes when more items are appended ("load more" is stable).
 */
export function masonrySlots(items: GalleryItem[]): MasonrySlot[] {
  const heights = [0, 0];
  return items.map((item) => {
    const raw =
      item.width && item.height
        ? item.height / item.width
        : FALLBACK_RATIO[item.size ?? "md"];
    const ratio = Math.min(MASONRY_RATIO_MAX, Math.max(MASONRY_RATIO_MIN, raw));
    const span = Math.round(ratio * MASONRY_UNITS) + 1;
    const column = heights[0] <= heights[1] ? 0 : 1;
    const row = heights[column] + 1;
    heights[column] += span;
    return { column: column === 0 ? 1 : 2, row, span };
  });
}

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
