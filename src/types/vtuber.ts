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

export interface CharacterDesign {
  illustrator: {
    name: string;
    handle?: string;
    url?: string;
  };
  rigger: {
    name: string;
    handle?: string;
    url?: string;
  };
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
  originalSong?: {
    title: string;
    titleEn?: string;
    url?: string;
    releasedAt?: string;
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
  hbd: HbdPage;
  cafe: CafePage;
}
