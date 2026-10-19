import { isCafeMission } from "@/lib/cafe-board";
import type { CafePage } from "@/types/vtuber";

export const CAFE_SECTION_KEYS = [
  "mainSiteLink",
  "heroCutout",
  "dispatch",
  "daySchedule",
  "operations",
  "signatureMenu",
  "preorder",
  "venueMenu",
  "goods",
  "caseFile",
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
  preorder: {
    label: "Pre-order",
    labelLocal: "เทปเหลือง + กล่องจอง · โชว์เมื่อเมนูเปิด และซ่อนเองหลัง 20 พ.ย. 2026",
  },
  venueMenu: {
    label: "Venue Menu",
    labelLocal: "เมนูร้าน",
  },
  goods: {
    label: "The Clue Dossier",
    labelLocal: "แฟ้มรวบรวมเบาะแส",
  },
  caseFile: {
    label: "Case File",
    labelLocal: "แฟ้มคดี · เว็บตูน /cafe/event (ปิด = เข้าไม่ได้)",
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
    preorder: true,
    venueMenu: true,
    goods: true,
    caseFile: true,
    closing: true,
  };
}

/** Same length as the real text, so the black bar drawn over it keeps a natural width. */
function filler(text: string) {
  return text.replace(/\S/g, "x");
}

function fill(text?: string) {
  return text ? filler(text) : text;
}

/**
 * The booking tape and box stay up through `endsAt` (20 Nov 2026, 23:59).
 * A missing end date stays listed; the menu and preorder toggles are separate.
 */
export function preorderIsListed(
  preorder: CafePage["preorder"],
  now = Date.now()
): boolean {
  if (!preorder?.endsAt) return true;
  const ends = Date.parse(preorder.endsAt);
  return !Number.isFinite(ends) || now < ends;
}

/**
 * Hidden sections keep their layout but lose their content: text becomes
 * filler, photos, links and dates are dropped, and ids are renumbered.
 * Section headings stay real.
 */
function redactSections(
  cafe: CafePage,
  visibility: CafeSectionVisibilityMap
): CafePage {
  const out = { ...cafe };

  if (!visibility.dispatch) {
    const { schedule, location } = cafe.dispatch;
    out.dispatch = {
      ...cafe.dispatch,
      schedule: { label: filler(schedule.label), detail: fill(schedule.detail) },
      location: { label: filler(location.label), detail: fill(location.detail) },
    };
  }

  if (!visibility.daySchedule && cafe.daySchedule) {
    out.daySchedule = {
      ...cafe.daySchedule,
      dateLabel: fill(cafe.daySchedule.dateLabel),
      items: cafe.daySchedule.items.map((item) => ({
        time: filler(item.time),
        title: filler(item.title),
        titleLocal: fill(item.titleLocal),
        detail: fill(item.detail),
      })),
    };
  }

  if (!visibility.operations && cafe.operations) {
    out.operations = {
      ...cafe.operations,
      intro: fill(cafe.operations.intro),
      groups: cafe.operations.groups.map((group) => ({
        ...group,
        detail: fill(group.detail),
        items: group.items.map((item, index) => ({
          id: `${group.id}-${index + 1}`,
          kind: isCafeMission(item) ? "mission" : (item.kind ?? "teaser"),
          name: filler(item.name),
          nameLocal: fill(item.nameLocal),
          detail: fill(item.detail),
        })),
      })),
    };
  }

  if (!visibility.signatureMenu) {
    out.signatureMenu = {
      ...cafe.signatureMenu,
      items: cafe.signatureMenu.items.map((item, index) => ({
        id: `menu-${index + 1}`,
        name: filler(item.name),
        nameLocal: fill(item.nameLocal),
        description: fill(item.description),
        priceLabel: fill(item.priceLabel),
      })),
    };
    if (cafe.promoSets) {
      out.promoSets = {
        ...cafe.promoSets,
        note: fill(cafe.promoSets.note),
        items: cafe.promoSets.items.map((item, index) => ({
          id: `set-${index + 1}`,
          name: filler(item.name),
          priceLabel: fill(item.priceLabel),
          menu: item.menu?.map(filler),
          // No image and no link into the dossier: only the shape of the list.
          gifts: item.gifts?.map((gift) => ({ name: filler(gift.name), qty: gift.qty })),
          giveaways: item.giveaways?.map(filler),
          highlight: item.highlight,
        })),
      };
    }
  }

  const offerPreorder =
    visibility.signatureMenu &&
    visibility.preorder &&
    preorderIsListed(cafe.preorder);
  if (!offerPreorder) out.preorder = undefined;

  if (!visibility.venueMenu && cafe.venueMenu) {
    out.venueMenu = {
      ...cafe.venueMenu,
      note: fill(cafe.venueMenu.note),
      items: cafe.venueMenu.items.map((item, index) => ({
        id: `venue-${index + 1}`,
        image: "",
        caption: fill(item.caption),
        captionLocal: fill(item.captionLocal),
        group: fill(item.group),
      })),
    };
  }

  if (!visibility.goods && cafe.goods) {
    out.goods = {
      ...cafe.goods,
      items: cafe.goods.items.map((item, index) => ({
        id: `goods-${index + 1}`,
        kind: item.kind,
        name: filler(item.name),
        nameLocal: fill(item.nameLocal),
        description: fill(item.description),
      })),
    };
  }

  // The disclaimer stays real: the footer prints it on every cafe page.
  if (!visibility.closing) {
    out.closing = { ...cafe.closing, body: [] };
  }

  return out;
}

/**
 * The cafe data as the browser may see it. Hidden content is replaced on the
 * server — the KV by its blacked-out copy, hidden sections by filler — so
 * nothing classified is ever sent.
 */
export function cafeForVisibility(
  cafe: CafePage,
  visibility: CafeSectionVisibilityMap
): CafePage {
  const { heroCutoutSilhouette, ...listed } = cafe;
  // Goods for sale are not announced yet: drop them before anything is sent.
  const rest =
    listed.goods && !listed.goods.saleListed
      ? {
          ...listed,
          goods: {
            ...listed.goods,
            items: listed.goods.items.filter((item) => item.kind === "giveaway"),
          },
        }
      : listed;
  const redacted = redactSections(rest, visibility);
  if (visibility.heroCutout || !heroCutoutSilhouette) return redacted;

  const color = cafe.heroCutout;
  return {
    ...redacted,
    heroCutout: heroCutoutSilhouette,
    goods: redacted.goods
      ? {
          ...redacted.goods,
          items: redacted.goods.items.map((item) =>
            item.image === color
              ? { ...item, image: heroCutoutSilhouette }
              : item
          ),
        }
      : redacted.goods,
  };
}

export function isCafeSectionKey(value: string): value is CafeSectionKey {
  return (CAFE_SECTION_KEYS as readonly string[]).includes(value);
}

export const CAFE_SETTINGS_COOKIE = "mild_r_site_admin";
