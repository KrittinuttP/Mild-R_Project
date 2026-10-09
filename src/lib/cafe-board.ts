import type { CafeOperationsItem } from "@/types/vtuber";

const MISSION_IDS = new Set([
  "evidence-board-mission",
  "case-file-stamp-rally",
  "costume-clearance",
  "case-hashtag",
]);

/** Temporary art and missing files stay off the board until a real photo exists. */
export function isStandInCafeImage(src?: string, alt?: string) {
  if (!src) return true;
  if (/\(placeholder\)/i.test(alt ?? "")) return true;
  return /\/assets\/images\/gallery-\d+\.svg$/.test(src);
}

/** Empty and classified prices are not shown. */
export function visiblePrice(label?: string) {
  const value = label?.trim() ?? "";
  if (!value || /^classified$/i.test(value)) return "";
  return value;
}

export function isCafeMission(item: Pick<CafeOperationsItem, "id" | "kind">) {
  if (item.kind === "mission") return true;
  if (item.kind) return false;
  return MISSION_IDS.has(item.id);
}
