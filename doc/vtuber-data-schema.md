# VTuber Data Schema — Mild-R

Schema สำหรับเก็บข้อมูลแนะนำตัว Mild-R (Lumina-World-End / Lumina Project)  
ใช้เป็นสัญญาข้อมูลร่วมระหว่าง documentation, TypeScript types, และ JSON content

**เนื้อหาจริงแยกไฟล์:** ดู [`content-data.md`](./content-data.md)

---

## Type locations

| Piece | Path |
|-------|------|
| Interfaces | `src/types/vtuber.ts` |
| Assembler (`mildRData`) | `src/data/vtuber-data.ts` |
| JSON by category | `src/data/mild-r/*.json` |

---

## TypeScript Interfaces

```ts
/** Social / streaming platform link */
export interface SocialLink {
  id: string;
  platform: "youtube" | "x" | "tiktok" | "facebook" | "discord" | "twitch" | "other";
  label: string;
  url: string;
  handle?: string;
}

/** Hashtag group (general / art / meme / fan tags) */
export interface HashtagGroup {
  id: string;
  category: "general" | "art" | "meme" | "fan" | "other";
  tags: string[];
}

/** Character design credits */
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

/** Lore / background story block */
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

/** Fan identity */
export interface FanIdentity {
  fanName: string;
  fanNameEn?: string;
  oshiMark: string;
  greetingToFans?: string;
}

/** Parallax layer metadata for GSAP scroll speed */
export interface ParallaxLayer {
  id: string;
  src: string;
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
  size?: GalleryTileSize;
  loadOnDemand?: boolean;
}

export interface FanArtItem extends GalleryItem {
  artist: {
    name: string;
    handle?: string;
    url?: string;
  };
}

export type MediaCategory =
  | "original"
  | "cover"
  | "event"
  | "birthday-pv"
  | "worldend-pv"
  | "debut-pv";

export interface MediaClip {
  id: string;
  title: string;
  titleLocal?: string;
  description?: string;
  youtubeUrl: string;
  category: MediaCategory;
  /** true = iframe embed; false/omitted = thumbnail → open YouTube */
  embedExternal?: boolean;
  featured?: boolean;
}

export interface HbdWish {
  id: string;
  from: string;
  message: string;
  image?: string;
  alt?: string;
  fromUpload?: boolean;
  loadOnDemand?: boolean;
}

export interface HbdPage {
  title: string;
  titleLocal?: string;
  subtitle: string;
  year?: number;
  occasionLabel?: string;
  closingMessage?: string;
  wishes: HbdWish[];
}

export interface VtuberBasic {
  name: string;
  nameLocal?: string;
  unit: string;
  agency: string;
  greeting: string;
  catchphrase?: string;
  debutDate: string; // ISO YYYY-MM-DD
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
  cta?: ProjectCta;
  ctas?: ProjectCta[];
  youtubeUrl?: string;
}

export interface CafePage {
  title: string;
  titleLocal?: string;
  tagline: string;
  status: ProjectStatus;
  statusLabel?: string;
  /** Broadsheet / dossier chrome */
  edition?: {
    masthead: string;
    kicker?: string;
    caseNo?: string;
    dateline?: string;
  };
  heroImage: string;
  heroAlt?: string;
  /** Atmosphere / venue / sample art plates */
  visuals?: Array<{
    id: string;
    src: string;
    alt: string;
    caption?: string;
    kind?: "atmosphere" | "location" | "art" | "other";
  }>;
  schedule: { label: string; detail?: string };
  location: {
    label: string;
    detail?: string;
    mapUrl?: string;
    image?: string;
    imageAlt?: string;
  };
  daySchedule?: {
    title: string;
    titleLocal?: string;
    dateLabel?: string;
    items: Array<{
      time: string;
      title: string;
      titleLocal?: string;
      detail?: string;
    }>;
  };
  highlights: string[];
  menu: Array<{
    id: string;
    name: string;
    nameLocal?: string;
    description?: string;
    priceLabel?: string;
    image?: string;
    imageAlt?: string;
  }>;
  goods?: Array<{
    id: string;
    name: string;
    nameLocal?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
  }>;
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
```

---

## JSON file map (source of truth for content)

| File | Type |
|------|------|
| `meta.json` | `{ id: string }` |
| `basic.json` | `VtuberBasic` |
| `lore.json` | `LoreBlock` |
| `character-design.json` | `CharacterDesign` |
| `socials.json` | `SocialLink[]` |
| `hashtags.json` | `HashtagGroup[]` |
| `fan.json` | `FanIdentity` |
| `gallery.json` | `GalleryItem[]` |
| `fan-art.json` | `FanArtItem[]` |
| `media.json` | `MediaClip[]` |
| `cafe.json` | `CafePage` |
| `hbd.json` | `HbdPage` |
| `parallax-layers.json` | `ParallaxLayer[]` |
| `projects.json` | `ProjectItem[]` |

Assembler รวมเป็น `VtuberProfile` ใน `loadMildRProfile()`.

---

## Field Notes

| Field | Notes |
|-------|--------|
| `basic.debutDate` | ISO `YYYY-MM-DD` |
| `basic.greeting` | bio สั้นจากโซเชียล |
| `lore.chapters` | ฉากสำหรับ scrollytelling |
| `gallery.size` | bento span |
| `gallery.loadOnDemand` | รอ「โหลดเพิ่ม」 |
| `parallax_layers.speed` | GSAP parallax (<1 = ไกล/ช้า) |
| `parallax_layers.src` | path ใต้ `public/` โดยไม่ใส่คำว่า `public` ใน URL |

---

## Suggested Supabase tables

ดูตาราง mapping เต็มใน [`content-data.md`](./content-data.md)
