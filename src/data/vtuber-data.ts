/**
 * Mild-R profile assembler
 *
 * Content lives in JSON under `./mild-r/` (one file per category)
 * so it can later map 1:1 to Supabase tables / storage.
 *
 * Docs: doc/content-data.md · doc/vtuber-data-schema.md
 */

import type {
  CafeEventPage,
  CafePage,
  CalendarEvent,
  CalendarEventInput,
  CharacterDesign,
  EventGalleryImage,
  EventsBoard,
  FanArtItem,
  FanIdentity,
  GalleryItem,
  HashtagGroup,
  HbdPage,
  LoreBlock,
  MediaClip,
  MembershipInfo,
  ParallaxLayer,
  ProjectItem,
  SocialLink,
  VtuberBasic,
  VtuberProfile,
} from "@/types/vtuber";

import meta from "./mild-r/meta.json";
import basic from "./mild-r/basic.json";
import lore from "./mild-r/lore.json";
import characterDesign from "./mild-r/character-design.json";
import socials from "./mild-r/socials.json";
import hashtags from "./mild-r/hashtags.json";
import fan from "./mild-r/fan.json";
import membership from "./mild-r/membership.json";
import gallery from "./mild-r/gallery.json";
import fanArt from "./mild-r/fan-art.json";
import media from "./mild-r/media.json";
import parallaxLayers from "./mild-r/parallax-layers.json";
import projects from "./mild-r/projects.json";
import events from "./mild-r/events.json";
import hbd from "./mild-r/hbd.json";
import cafe from "./mild-r/cafe.json";
import cafeEvent from "./mild-r/cafe-event.json";
import eventGallery from "./mild-r/event-gallery.json";

import { bangkokTodayYmd, resolveEvents, sortEvents } from "@/lib/events";

const eventInputs = (events as { events: CalendarEventInput[] }).events;
const eventGalleryById = eventGallery as Record<string, EventGalleryImage[]>;

/** Events with `status` derived from today's Bangkok date — call per render. */
export function getEventsBoard(now: Date = new Date()): EventsBoard {
  const events = resolveEvents(eventInputs, bangkokTodayYmd(now)).map((event) => ({
    ...event,
    galleryCount: eventGalleryById[event.id]?.length ?? 0,
  }));
  return { events, liveWeeks: [] };
}

export function getEventIds(): string[] {
  return eventInputs.map((event) => event.id);
}

/** Event plus its chronological neighbours (older / newer) for detail pages. */
export function getEventById(
  id: string,
  now: Date = new Date()
): { event: CalendarEvent; older?: CalendarEvent; newer?: CalendarEvent } | undefined {
  const sorted = sortEvents(getEventsBoard(now).events);
  const index = sorted.findIndex((event) => event.id === id);
  if (index === -1) return undefined;
  return { event: sorted[index], older: sorted[index - 1], newer: sorted[index + 1] };
}

export function getEventGallery(id: string): EventGalleryImage[] {
  return eventGalleryById[id] ?? [];
}

/** Merge category JSON into a single profile document. */
export function loadMildRProfile(): VtuberProfile {
  return {
    id: meta.id,
    basic: basic as VtuberBasic,
    lore: lore as LoreBlock,
    characterDesign: characterDesign as CharacterDesign,
    socials: socials as SocialLink[],
    hashtags: hashtags as HashtagGroup[],
    fan: fan as FanIdentity,
    membership: membership as MembershipInfo,
    gallery: gallery as GalleryItem[],
    fanArt: fanArt as FanArtItem[],
    media: media as MediaClip[],
    parallax_layers: parallaxLayers as ParallaxLayer[],
    projects: projects as ProjectItem[],
    events: getEventsBoard(),
    hbd: hbd as HbdPage,
    cafe: cafe as CafePage,
    cafeEvent: cafeEvent as CafeEventPage,
  };
}

export const mildRData: VtuberProfile = loadMildRProfile();

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return mildRData.projects.find((project) => project.slug === slug);
}

export function getProjectsByCategory(category: string): ProjectItem[] {
  return mildRData.projects.filter(
    (project) => project.category.toLowerCase() === category.toLowerCase()
  );
}

export function hasProjectCategory(category: string): boolean {
  return getProjectsByCategory(category).length > 0;
}

export default mildRData;

export type {
  CafeEventPage,
  CafeEventPanel,
  CafePage,
  CalendarEvent,
  CalendarEventFormat,
  CalendarEventScheduleItem,
  CalendarEventStatus,
  CalendarEventTheme,
  CharacterCompanion,
  CharacterDesign,
  CreditPerson,
  EventGalleryImage,
  EventsBoard,
  FanArtItem,
  FanIdentity,
  GalleryItem,
  GalleryTileSize,
  HashtagGroup,
  HbdPage,
  HbdWish,
  LivePlatform,
  LiveSlot,
  LiveWeek,
  LoreBlock,
  MediaCategory,
  MediaClip,
  MembershipBadge,
  MembershipEmoji,
  MembershipInfo,
  MembershipPerk,
  MembershipTier,
  ParallaxLayer,
  ProjectCta,
  ProjectItem,
  ProjectStatus,
  SocialLink,
  StaffCredit,
  VtuberBasic,
  VtuberProfile,
} from "@/types/vtuber";
