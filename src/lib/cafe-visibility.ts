import type { CafePage } from "@/types/vtuber";

export const CAFE_SECTION_KEYS = [
  "mainSiteLink",
  "heroCutout",
  "dispatch",
  "daySchedule",
  "operations",
  "signatureMenu",
  "venueMenu",
  "goods",
  "closing",
] as const;

export type CafeSectionKey = (typeof CAFE_SECTION_KEYS)[number];

/** Content blocks on `/cafe` (excludes chrome / nav toggles). */
export const CAFE_CONTENT_SECTION_KEYS = CAFE_SECTION_KEYS.filter(
  (key) => key !== "mainSiteLink"
) as Exclude<CafeSectionKey, "mainSiteLink">[];

export type CafeSectionVisibilityMap = Record<CafeSectionKey, boolean>;

export const CAFE_SECTION_META: Record<
  CafeSectionKey,
  { label: string; labelLocal: string }
> = {
  mainSiteLink: {
    label: "Main Site Link",
    labelLocal: "ปุ่มกลับเว็บหลัก · เว็บหลัก →",
  },
  heroCutout: {
    label: "Key Visual",
    labelLocal: "รูป KV คาเฟ่ (ปิด = ถมดำ)",
  },
  dispatch: {
    label: "Crime Scene Details",
    labelLocal: "ข้อมูลสถานที่และเวลาเกิดเหตุ",
  },
  daySchedule: {
    label: "Case Incident Log",
    labelLocal: "บันทึกลำดับเหตุการณ์",
  },
  operations: {
    label: "Operations Briefing",
    labelLocal: "ประกาศจากกองอำนวยการสืบสวน",
  },
  signatureMenu: {
    label: "Investigator's Provisions",
    labelLocal: "แฟ้มรายการเสบียงนักสืบ",
  },
  venueMenu: {
    label: "Venue Menu",
    labelLocal: "เมนูร้าน",
  },
  goods: {
    label: "The Clue Dossier",
    labelLocal: "แฟ้มรวบรวมเบาะแส",
  },
  closing: {
    label: "Closing Note",
    labelLocal: "สรุปฉบับนี้",
  },
};

export function defaultCafeVisibility(): CafeSectionVisibilityMap {
  return {
    mainSiteLink: true,
    heroCutout: true,
    dispatch: true,
    daySchedule: true,
    operations: true,
    signatureMenu: true,
    venueMenu: true,
    goods: true,
    closing: true,
  };
}

/**
 * The cafe data as the browser may see it. A hidden KV is swapped for its
 * blacked-out copy on the server, so the real file's URL is never sent.
 */
export function cafeForVisibility(
  cafe: CafePage,
  visibility: CafeSectionVisibilityMap
): CafePage {
  const { heroCutoutSilhouette, ...rest } = cafe;
  if (visibility.heroCutout) return rest;
  return { ...rest, heroCutout: heroCutoutSilhouette };
}

export function isCafeSectionKey(value: string): value is CafeSectionKey {
  return (CAFE_SECTION_KEYS as readonly string[]).includes(value);
}

export const CAFE_SETTINGS_COOKIE = "mild_r_site_admin";
