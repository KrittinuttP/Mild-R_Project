import {
  BookOpen,
  CalendarDays,
  Camera,
  Crown,
  Images,
  MonitorPlay,
  Palette,
  Radio,
  Rows3,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { GALLERY_CATEGORIES, type GalleryCategoryKey } from "@/components/gallery/gallery-categories";

export type NavKey = "about" | "live" | "media" | "gallery" | "events" | "projects";

export type NavChild = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** On the home page the link scrolls to this section instead of opening `href`. */
  homeHash?: string;
};

export type NavItem = {
  key: NavKey;
  label: string;
  /** Page the item opens (items without children); also the page that marks it active. */
  href?: string;
  /** On the home page the item scrolls here instead of opening `href`. */
  homeHash?: string;
  /** Home sections that mark the item active while they sit in the middle of the screen. */
  sections: readonly string[];
  /** Route prefixes (other than `href`) that mark the item active. */
  routes?: readonly string[];
  /** Items with a dropdown (▾). Projects builds its rows from data instead. */
  children?: readonly NavChild[];
  dropdown?: boolean;
  footer?: { label: string; href: string };
};

const GALLERY_ICONS: Record<GalleryCategoryKey, LucideIcon> = {
  archive: Camera,
  live: MonitorPlay,
  fanart: Palette,
};

/** Header menu, in home-page order (project R · header Final). */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "about",
    label: "About",
    sections: ["top", "profile", "lore", "member"],
    children: [
      // Hero+Profile scrollytelling starts at #top (desktop profile pin breaks #profile)
      { label: "แนะนำตัว", href: "/#top", icon: UserRound },
      { label: "Lore", href: "/#lore", icon: BookOpen },
      { label: "Member", href: "/#member", icon: Crown },
    ],
  },
  {
    key: "live",
    label: "Live",
    href: "/live",
    sections: ["live"],
    children: [
      { label: "ไลฟ์สัปดาห์นี้", href: "/live#this-week", homeHash: "#live", icon: Radio },
      { label: "ปฏิทินรายเดือน", href: "/live#calendar", icon: CalendarDays },
      { label: "ตารางรายสัปดาห์", href: "/live#weekly", icon: Rows3 },
    ],
    footer: { label: "ดู Live ทั้งหมด", href: "/live" },
  },
  { key: "media", label: "Media", href: "/media", homeHash: "#media", sections: ["media"] },
  {
    key: "gallery",
    label: "Gallery",
    href: "/gallery",
    sections: ["gallery"],
    routes: ["/fanart"],
    children: [
      // Home Gallery section (latest Moments · fan art · live covers).
      { label: "ล่าสุด", href: "/#gallery", homeHash: "#gallery", icon: Images },
      ...GALLERY_CATEGORIES.map((category) => ({
        label: category.label,
        href: category.href,
        icon: GALLERY_ICONS[category.key],
      })),
    ],
    footer: { label: "ดู Gallery ทั้งหมด", href: "/gallery" },
  },
  { key: "events", label: "Events", href: "/events", homeHash: "#events", sections: ["events"] },
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    sections: ["projects"],
    routes: ["/hbd", "/cafe"],
    dropdown: true,
    footer: { label: "ดูโปรเจกต์ทั้งหมด", href: "/projects" },
  },
];

export const SOCIALS_HASH = "#socials";
/** Follow row in the mobile menu, in this order. */
export const FOLLOW_PLATFORMS = ["youtube", "x", "tiktok", "discord", "facebook"] as const;
/** Moments photo on the mobile Gallery tile (falls back to the first photo). */
export const MENU_GALLERY_PHOTO_ID = "moment-x-mild";

export function hasDropdown(item: NavItem) {
  return Boolean(item.children?.length || item.dropdown);
}

/** Item whose route covers `pathname` (off the home page). */
export function navKeyForPath(pathname: string): NavKey | null {
  for (const item of NAV_ITEMS) {
    const routes = [item.href, ...(item.routes ?? [])].filter(Boolean) as string[];
    if (routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return item.key;
    }
  }
  return null;
}

/** Item whose home section has this id. */
export function navKeyForSection(id: string | null): NavKey | null {
  if (!id) return null;
  return NAV_ITEMS.find((item) => item.sections.includes(id))?.key ?? null;
}

export const HOME_SECTION_IDS = NAV_ITEMS.flatMap((item) => item.sections);
