/**
 * Mild-R content types
 * Shape follows: doc/vtuber-data-schema.md
 */

export interface SocialLink {
  id: string;
  platform:
    | "youtube"
    | "x"
    | "tiktok"
    | "facebook"
    | "discord"
    | "twitch"
    | "other";
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
  /** Campaign / release year shown on project cards */
  year?: number;
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
  /** DB row created_at — tie-break when same calendar time */
  createdAt?: string;
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
  /** Optional uploader avatar (defaults on UI if missing) */
  avatar?: string;
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

/** Venue / house menu plates (SOCIEFEE × CHOUXSTORY), separate from signature drinks */
export interface CafeVenueMenuItem {
  id: string;
  image: string;
  imageAlt?: string;
  caption?: string;
  captionLocal?: string;
}

/** @deprecated Use CafeVenueMenuItem */
export type CafeOtherMenuItem = CafeVenueMenuItem;

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

/** Section heading chrome on `/cafe` (eyebrow, stamp, bilingual title) */
export interface CafeSectionHead {
  eyebrow?: string;
  stamp?: string;
  title: string;
  titleLocal?: string;
}

export interface CafeScheduleWindow {
  label: string;
  detail?: string;
  /** ISO datetime for countdown (doors open), e.g. 2026-11-29T10:00:00+07:00 */
  startsAt?: string;
  /** ISO datetime when the case day ends */
  endsAt?: string;
}

export interface CafeLocation {
  label: string;
  detail?: string;
  mapUrl?: string;
  image?: string;
  imageAlt?: string;
}

export interface CafeDispatchSection extends CafeSectionHead {
  schedule: CafeScheduleWindow;
  location: CafeLocation;
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

export interface CafePlatesSection extends CafeSectionHead {
  items: CafeVisual[];
}

export interface CafeDayScheduleSection extends CafeSectionHead {
  dateLabel?: string;
  items: CafeScheduleItem[];
}

/** @deprecated Use CafeDayScheduleSection */
export type CafeDaySchedule = CafeDayScheduleSection;

export interface CafeOperationsItem {
  id: string;
  name: string;
  nameLocal?: string;
  detail?: string;
  /** Promo art path under /public — primary visual for HQ */
  image?: string;
  imageAlt?: string;
  /** Short label under the image (optional) */
  caption?: string;
}

export interface CafeOperationsGroup {
  id: string;
  code?: string;
  title: string;
  titleLocal?: string;
  detail?: string;
  /**
   * promo = image-first cards (default for teaser groups)
   * brief = compact rows with optional thumbnail
   */
  layout?: "promo" | "brief";
  items: CafeOperationsItem[];
}

/** Doc §8 — HQ briefing; promo images are the primary content */
export interface CafeOperationsSection extends CafeSectionHead {
  intro?: string;
  groups: CafeOperationsGroup[];
}

export interface CafeSignatureMenuSection extends CafeSectionHead {
  items: CafeMenuItem[];
}

export interface CafeVenueMenuSection extends CafeSectionHead {
  note?: string;
  items: CafeVenueMenuItem[];
}

/** @deprecated Use CafeVenueMenuSection */
export type CafeOtherMenu = CafeVenueMenuSection;

export interface CafeGoodsSection extends CafeSectionHead {
  items: CafeGoodsItem[];
}

export interface CafeClosingSection extends CafeSectionHead {
  body: string[];
  ctas?: ProjectCta[];
  disclaimer?: string;
}

/** Webtoon / manhwa-style scrollytelling under `/cafe/event` */
export type CafeEventPanelKind = "cover" | "scene" | "closing";

export interface CafeEventPanel {
  id: string;
  kind?: CafeEventPanelKind;
  /** Panel art under /public — TBA frame if missing */
  image?: string;
  imageAlt?: string;
  caption?: string;
  captionLocal?: string;
  /** Optional short blurb under the panel (legacy / secondary) */
  body?: string;
  /** Narration lines overlaid on the art — float up on scroll (≈5–6) */
  lines?: string[];
}

export interface CafeEventPage {
  title: string;
  titleLocal?: string;
  tagline?: string;
  status?: ProjectStatus;
  /** Dark-screen cold open — mysterious lines before any panel art */
  prologue?: {
    lines: string[];
  };
  panels: CafeEventPanel[];
  ctaBack?: ProjectCta;
}

/** Broadsheet / dossier chrome for `/cafe` */
export interface CafeEdition {
  /** e.g. "The Honey Pulse Gazette" */
  masthead: string;
  /** e.g. "SPECIAL EDITION" */
  kicker?: string;
  kickerLocal?: string;
  /** e.g. "CASE · MR-HP-001" */
  caseNo?: string;
  /** e.g. "Vol. I · No. 1 · Mild-R Fanclub" */
  dateline?: string;
}

/**
 * Dedicated cafe promo page (`/cafe`).
 * Content sections mirror Supabase visibility keys:
 * dispatch · daySchedule · operations · signatureMenu · venueMenu · goods · closing
 */
export interface CafePage {
  title: string;
  titleLocal?: string;
  tagline: string;
  status: ProjectStatus;
  statusLabel?: string;
  statusLabelLocal?: string;
  /** Newspaper / Sherlock editorial frame */
  edition?: CafeEdition;
  heroImage: string;
  heroAlt?: string;
  dispatch: CafeDispatchSection;
  daySchedule?: CafeDayScheduleSection;
  /** HQ briefing (doc §8) — replaces plates + highlights */
  operations?: CafeOperationsSection;
  signatureMenu: CafeSignatureMenuSection;
  venueMenu?: CafeVenueMenuSection;
  goods?: CafeGoodsSection;
  closing: CafeClosingSection;
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
  /** Comic / webtoon scrollytelling for cafe event */
  cafeEvent: CafeEventPage;
}
