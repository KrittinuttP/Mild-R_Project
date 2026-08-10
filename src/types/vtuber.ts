/**
 * Mild-R content types
 * Shape follows: doc/vtuber-data-schema.md
 */

export interface SocialLink {
  id: string;
  platform: "youtube" | "x" | "tiktok" | "facebook" | "twitch" | "other";
  label: string;
  url: string;
  handle?: string;
}

export interface HashtagGroup {
  id: string;
  category: "general" | "art" | "meme" | "fan" | "other";
  tags: string[];
}

/** Credited person (illustrator, rigger, BGM, etc.) */
export interface CreditPerson {
  name: string;
  handle?: string;
  url?: string;
  /** Public URL path under /public */
  image?: string;
}

/** Extra staff credit beyond mama/papa */
export interface StaffCredit extends CreditPerson {
  id: string;
  /** Display role, e.g. "BGM1", "Logo & Overlay" */
  role: string;
  roleLocal?: string;
}

/** Eye companions (LoVe) */
export interface CharacterCompanion {
  id: string;
  name: string;
  nameLocal?: string;
  /** From viewer's perspective of the character art */
  side: "left" | "right";
  personality?: string;
  description?: string;
}

export interface CharacterDesign {
  illustrator: CreditPerson;
  rigger: CreditPerson;
  /** Mama / Papa nicknames (optional labels) */
  illustratorLabel?: string;
  riggerLabel?: string;
  credits?: StaffCredit[];
  /** Group label for eye companions */
  companionGroupName?: string;
  companionGroupNameLocal?: string;
  companions?: CharacterCompanion[];
  notes?: string;
}

export interface LoreBlock {
  summary: string;
  theme?: string;
  paragraphs: string[];
  chapters?: Array<{
    id: string;
    title: string;
    body: string;
  }>;
}

export interface FanIdentity {
  fanName: string;
  fanNameEn?: string;
  oshiMark: string;
  greetingToFans?: string;
}

export interface ParallaxLayer {
  id: string;
  /** Public URL path under /public (omit the `public` segment) */
  src: string;
  /** GSAP scroll parallax factor (<1 farther / slower, >1 closer / faster) */
  speed: number;
  alt?: string;
  zIndex?: number;
}

export type GalleryTileSize = "sm" | "md" | "lg" | "tall" | "wide";

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  /** Bento span preset */
  size?: GalleryTileSize;
  /**
   * When true, item is held for "load more" batches
   * (and should not be eagerly fetched until revealed).
   */
  loadOnDemand?: boolean;
}

/** Fan-submitted / community art (separate from official archive gallery) */
export interface FanArtItem extends GalleryItem {
  artist: {
    name: string;
    handle?: string;
    url?: string;
  };
}

export interface VtuberBasic {
  name: string;
  nameLocal?: string;
  unit: string;
  agency: string;
  greeting: string;
  catchphrase?: string;
  debutDate: string;
  /** Species / identity tag, e.g. "Mutant" */
  species?: string;
  /** Height in centimeters */
  heightCm?: number;
  /** Month-day without year, ISO-ish `MM-DD` */
  birthday?: string;
  /** Human label, e.g. "12 Dec" */
  birthdayLabel?: string;
  likes?: string[];
  dislikes?: string[];
  originalSong?: {
    title: string;
    titleEn?: string;
    url?: string;
    releasedAt?: string;
    /** Fun fact / lyric note */
    note?: string;
  };
}

export type ProjectStatus = "upcoming" | "active" | "ended";

export interface ProjectCta {
  label: string;
  url: string;
}

/** Promo / campaign project (Cafe, MV, …) listed under /projects */
export interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  titleLocal?: string;
  summary: string;
  cover: string;
  status: ProjectStatus;
  category: string;
  highlights?: string[];
  body: string[];
  /** Primary CTA (backwards compatible) */
  cta?: ProjectCta;
  /** Extra CTAs — rendered with `cta` when present */
  ctas?: ProjectCta[];
  /** Optional YouTube watch URL (e.g. MV pages) */
  youtubeUrl?: string;
}

/** Fan-facing calendar event (collab, cafe, stage, …) */
export type CalendarEventStatus = "upcoming" | "ongoing" | "ended";

export interface CalendarEvent {
  id: string;
  title: string;
  titleLocal?: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  endDate?: string;
  timeLabel?: string;
  venue?: string;
  platform?: string;
  url?: string;
  status: CalendarEventStatus;
  summary?: string;
  /** Cover image path under /public */
  cover: string;
  coverAlt?: string;
}

export type LivePlatform = "youtube" | "x" | "other";

/** Stream flavor for calendar accents */
export type LiveSlotKind = "solo" | "collab" | "special";

/** Single live/stream slot inside a week */
export interface LiveSlot {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Display time, e.g. "20:00" or "LIVE" (primary / current) */
  time: string;
  /** Previous scheduled time when rescheduled (strikethrough) */
  timePrevious?: string;
  /** New scheduled time when timePrevious is set */
  timeUpdated?: string;
  title: string;
  titleLocal?: string;
  platform?: LivePlatform;
  url?: string;
  note?: string;
  /** Manual preview placeholder until a real YouTube live is linked */
  isPreview?: boolean;
  /** Members-only stream (manual or tagged) */
  isMember?: boolean;
  /** Default solo — collab gets calendar accent when not own */
  kind?: LiveSlotKind;
  isOwnChannel?: boolean;
  /** Short roster title (e.g. Xonebu) for guest channel badge */
  sourceTitle?: string | null;
  /** Stream lifecycle for modal/detail */
  status?: "live" | "upcoming" | "ended" | "cancelled";
  /** Scheduled display (same style as table; may include reschedule) */
  scheduledLabel?: string;
  scheduledPrevious?: string;
  scheduledUpdated?: string;
  /** Actual start HH:mm Bangkok */
  actualStartLabel?: string | null;
  /** Actual end HH:mm Bangkok */
  actualEndLabel?: string | null;
  /** Human duration e.g. "2 ชม. 15 นาที" */
  durationLabel?: string | null;
  viewsOnEnd?: number | null;
  latestViews?: number | null;
  channelName?: string | null;
  /** Best available cover (Storage current → YouTube → generated) */
  coverUrl?: string | null;
  /** Archived cover versions, newest first */
  coverHistory?: { url: string; capturedAt: string }[];
}

/** Day intentionally marked offline (no stream) — driven by content JSON */
export interface LiveOfflineDay {
  /** ISO date YYYY-MM-DD */
  date: string;
  note?: string;
}

/** One calendar week of lives (Sunday-start) */
export interface LiveWeek {
  id: string;
  /** Sunday of the week, ISO YYYY-MM-DD */
  weekStart: string;
  label?: string;
  slots: LiveSlot[];
  /** Explicit offline days — only these show the Offline badge */
  offlineDays?: LiveOfflineDay[];
}

export interface EventsBoard {
  events: CalendarEvent[];
  liveWeeks: LiveWeek[];
}

/** Playlist group for home Media section */
export type MediaCategory =
  | "original"
  | "cover"
  | "event"
  | "birthday-pv"
  | "worldend-pv"
  | "debut-pv";

/** Homepage / media strip YouTube clip */
export interface MediaClip {
  id: string;
  title: string;
  titleLocal?: string;
  description?: string;
  youtubeUrl: string;
  /** Playlist group (Original, Cover, Event, PV, …) */
  category: MediaCategory;
  /**
   * When true, embed with iframe on the site.
   * When false/omitted, show thumbnail and open on YouTube (avoids embed blocks).
   */
  embedExternal?: boolean;
  /** Show as primary selection on home Media section */
  featured?: boolean;
}

/** Birthday wish card (image optional — ready for future upload/Storage) */
export interface HbdWish {
  id: string;
  from: string;
  message: string;
  image?: string;
  alt?: string;
  /** Future: sourced from Supabase Storage upload */
  fromUpload?: boolean;
  loadOnDemand?: boolean;
}

/** Birthday wishes page content */
export interface HbdPage {
  title: string;
  titleLocal?: string;
  subtitle: string;
  year?: number;
  occasionLabel?: string;
  closingMessage?: string;
  wishes: HbdWish[];
}

export interface CafeMenuItem {
  id: string;
  name: string;
  nameLocal?: string;
  description?: string;
  priceLabel?: string;
  /** Menu photo path under /public */
  image?: string;
  imageAlt?: string;
}

export interface CafeGoodsItem {
  id: string;
  name: string;
  nameLocal?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

export interface CafeScheduleItem {
  time: string;
  title: string;
  titleLocal?: string;
  detail?: string;
}

export interface CafeDaySchedule {
  title: string;
  titleLocal?: string;
  dateLabel?: string;
  items: CafeScheduleItem[];
}

/** Broadsheet / dossier chrome for `/cafe` */
export interface CafeEdition {
  /** e.g. "The Honey Pulse Gazette" */
  masthead: string;
  /** e.g. "SPECIAL EDITION" */
  kicker?: string;
  /** e.g. "CASE · MR-HP-001" */
  caseNo?: string;
  /** e.g. "Vol. I · No. 1 · Mild-R Fanclub" */
  dateline?: string;
}

export type CafeVisualKind = "atmosphere" | "location" | "art" | "other";

/** Atmosphere / location / sample art plates on `/cafe` */
export interface CafeVisual {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  kind?: CafeVisualKind;
}

/** Dedicated cafe promo page (`/cafe`) */
export interface CafePage {
  title: string;
  titleLocal?: string;
  tagline: string;
  status: ProjectStatus;
  statusLabel?: string;
  /** Newspaper / Sherlock editorial frame */
  edition?: CafeEdition;
  heroImage: string;
  heroAlt?: string;
  /** Atmosphere, venue, sample art (not the home Gallery board) */
  visuals?: CafeVisual[];
  schedule: {
    label: string;
    detail?: string;
  };
  location: {
    label: string;
    detail?: string;
    mapUrl?: string;
    image?: string;
    imageAlt?: string;
  };
  /** In-day activity timeline */
  daySchedule?: CafeDaySchedule;
  highlights: string[];
  menu: CafeMenuItem[];
  goods?: CafeGoodsItem[];
  body: string[];
  ctas: ProjectCta[];
  disclaimer?: string;
}

export interface VtuberProfile {
  id: string;
  basic: VtuberBasic;
  lore: LoreBlock;
  characterDesign: CharacterDesign;
  socials: SocialLink[];
  hashtags: HashtagGroup[];
  fan: FanIdentity;
  gallery: GalleryItem[];
  fanArt: FanArtItem[];
  media: MediaClip[];
  parallax_layers: ParallaxLayer[];
  projects: ProjectItem[];
  events: EventsBoard;
  hbd: HbdPage;
  cafe: CafePage;
}
