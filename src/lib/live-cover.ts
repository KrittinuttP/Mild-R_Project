import type { LiveSlot } from "@/types/vtuber";

/** Real uploaded/cached cover only — no YouTube id fallback. */
export function getSlotCoverUrl(slot: LiveSlot): string | null {
  if (slot.coverUrl) {
    let url = slot.coverUrl;
    if (
      url.includes("i.ytimg.com/vi/") &&
      (url.includes("/hqdefault.jpg") ||
        url.includes("/sddefault.jpg") ||
        url.includes("/default.jpg"))
    ) {
      return url.replace(
        /\/hqdefault\.jpg|\/sddefault\.jpg|\/default\.jpg/,
        "/mqdefault.jpg"
      );
    }
    return url;
  }
  if (slot.coverHistory && slot.coverHistory.length > 0) {
    return slot.coverHistory[0].url;
  }
  return null;
}
