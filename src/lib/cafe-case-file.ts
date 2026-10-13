import { mildRData } from "@/data/vtuber-data";

export type CafeCaseFileCover = { image: string; imageAlt?: string };

/**
 * Cover of the `/cafe/event` webtoon. Server-only, so pages can leave it out
 * of the client payload while the case file is hidden.
 */
export function caseFileCover(): CafeCaseFileCover | null {
  const panel = mildRData.cafeEvent.panels.find((item) => item.image);
  return panel?.image ? { image: panel.image, imageAlt: panel.imageAlt } : null;
}
