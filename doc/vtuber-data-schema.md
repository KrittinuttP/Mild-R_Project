# VTuber Data Schema — Mild-R

Schema สำหรับเก็บข้อมูลแนะนำตัว Mild-R (Pixela-World-End / Pixela Project)  
ใช้เป็นสัญญาข้อมูลร่วมระหว่าง documentation, TypeScript types, และ mock data

---

## TypeScript Interfaces

```ts
/** Social / streaming platform link */
export interface SocialLink {
  id: string;
  platform: "youtube" | "x" | "tiktok" | "facebook" | "twitch" | "other";
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
  /** Optional extended lore beats for scrollytelling scenes */
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
  /** Public URL path, e.g. `/assets/layers/hero-bg.png` */
  src: string;
  /** Relative scroll speed (1 = normal, <1 = slower / farther, >1 = faster / closer) */
  speed: number;
  alt?: string;
  zIndex?: number;
}

/** Root VTuber profile document */
export interface VtuberProfile {
  id: string;
  basic: {
    name: string;
    nameLocal?: string;
    unit: string;
    agency: string;
    greeting: string;
    catchphrase?: string;
    debutDate: string; // ISO date YYYY-MM-DD
    originalSong?: {
      title: string;
      titleEn?: string;
      url?: string;
      releasedAt?: string;
    };
  };
  lore: LoreBlock;
  characterDesign: CharacterDesign;
  socials: SocialLink[];
  hashtags: HashtagGroup[];
  fan: FanIdentity;
  parallax_layers: ParallaxLayer[];
}
```

---

## JSON Example (shape reference)

```json
{
  "id": "mild-r",
  "basic": {
    "name": "Mild-R",
    "nameLocal": "มายด์-อาร์",
    "unit": "Pixela-World-End",
    "agency": "Pixela Project",
    "greeting": "マイ-R ใครแอบใจโยกน่ะ ฉันเห็นนะ 👀",
    "catchphrase": "",
    "debutDate": "2024-05-23",
    "originalSong": {
      "title": "รักษาหัวใจ",
      "titleEn": "Heart Cure",
      "url": "https://www.youtube.com/watch?v=-fxIAm8dozk",
      "releasedAt": "2024-05-19"
    }
  },
  "lore": {
    "summary": "สมาชิกยูนิต World End ภายใต้ธีมภัยพิบัติ",
    "theme": "Mutant / viral disaster (fanclub motif 💉)",
    "paragraphs": [],
    "chapters": []
  },
  "characterDesign": {
    "illustrator": {
      "name": "atwomaru",
      "handle": "@atwomaru"
    },
    "rigger": {
      "name": "Karamo Kitchen",
      "handle": "@karamomokitchen"
    }
  },
  "socials": [],
  "hashtags": [],
  "fan": {
    "fanName": "ฮันนี่",
    "fanNameEn": "Honey",
    "oshiMark": "💉"
  },
  "parallax_layers": [
    {
      "id": "hero-bg",
      "src": "/assets/layers/hero-bg.png",
      "speed": 0.2,
      "zIndex": 0
    }
  ]
}
```

---

## Field Notes

| Field | Notes |
|-------|--------|
| `basic.debutDate` | ใช้ ISO `YYYY-MM-DD` เพื่อ format ฝั่ง UI ได้ง่าย |
| `basic.greeting` | ข้อความแนะนำตัว / bio สั้นจากโซเชียล |
| `lore.chapters` | ตัดเป็นฉากสำหรับ scrollytelling ได้ทีละ section |
| `parallax_layers.speed` | map ตรงกับ GSAP `y` / scrub parallax (ยิ่งเล็กยิ่งเคลื่อนช้า = อยู่ไกล) |
| `parallax_layers.src` | path ภายใต้ `public/` แต่ใน URL **ไม่ใส่** คำว่า `public` |
| Social / hashtag `id` | slug คงที่สำหรับ key ใน React เช่น `youtube`, `tag-general` |

---

## Suggested File Mapping

| Schema piece | Runtime location |
|--------------|------------------|
| Interfaces | `src/types/vtuber.ts` (อนาคต) |
| Mock / content object | `src/data/vtuber-data.ts` |
| Layer image files | `public/assets/layers/*` |
