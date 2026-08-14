export const CAFE_SECTION_KEYS = [
  "dispatch",
  "plates",
  "daySchedule",
  "highlights",
  "signatureMenu",
  "venueMenu",
  "goods",
  "closing",
] as const;

export type CafeSectionKey = (typeof CAFE_SECTION_KEYS)[number];

export type CafeSectionVisibilityMap = Record<CafeSectionKey, boolean>;

export const CAFE_SECTION_META: Record<
  CafeSectionKey,
  { label: string; labelLocal: string }
> = {
  dispatch: {
    label: "Window & Location",
    labelLocal: "กรอบเวลาและพิกัด",
  },
  plates: {
    label: "Photographic Plates",
    labelLocal: "บรรยากาศ · สถานที่ · อาร์ต",
  },
  daySchedule: {
    label: "Daily Schedule",
    labelLocal: "ตารางกิจกรรมในวัน",
  },
  highlights: {
    label: "Intelligence Brief",
    labelLocal: "จุดสังเกตของเคส",
  },
  signatureMenu: {
    label: "Signature Menu",
    labelLocal: "เมนูซิกเนเจอร์",
  },
  venueMenu: {
    label: "Venue Menu",
    labelLocal: "เมนูร้าน",
  },
  goods: {
    label: "Goods",
    labelLocal: "ของที่ระลึก",
  },
  closing: {
    label: "Closing Note",
    labelLocal: "สรุปฉบับนี้",
  },
};

export function defaultCafeVisibility(): CafeSectionVisibilityMap {
  return {
    dispatch: true,
    plates: true,
    daySchedule: true,
    highlights: true,
    signatureMenu: true,
    venueMenu: true,
    goods: true,
    closing: true,
  };
}

export function isCafeSectionKey(value: string): value is CafeSectionKey {
  return (CAFE_SECTION_KEYS as readonly string[]).includes(value);
}

export const CAFE_SETTINGS_COOKIE = "mild_r_cafe_settings";
