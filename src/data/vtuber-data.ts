/**
 * Mild-R content / mock data
 * Shape follows: doc/vtuber-data-schema.md
 *
 * NOTE: Public profile fields are filled from known sources (social bio, debut timing,
 * design credits, fan tags). Lore paragraphs are placeholders for scrollytelling copy.
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

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
}

export interface VtuberProfile {
  id: string;
  basic: {
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
  };
  lore: LoreBlock;
  characterDesign: CharacterDesign;
  socials: SocialLink[];
  hashtags: HashtagGroup[];
  fan: FanIdentity;
  gallery: GalleryItem[];
  parallax_layers: ParallaxLayer[];
}

export const mildRData: VtuberProfile = {
  id: "mild-r",
  basic: {
    name: "Mild-R",
    nameLocal: "มายด์-อาร์",
    unit: "Pixela-World-End",
    agency: "Pixela Project",
    greeting: "マイ-R ใครแอบใจโยกน่ะ ฉันเห็นนะ 👀",
    catchphrase: "ฮันนี่รายงานตัว~",
    debutDate: "2024-05-23",
    originalSong: {
      title: "รักษาหัวใจ",
      titleEn: "Heart Cure",
      url: "https://www.youtube.com/watch?v=-fxIAm8dozk",
      releasedAt: "2024-05-19",
    },
  },
  lore: {
    summary:
      "Mild-R เป็นสมาชิกยูนิต Pixela-World-End จาก Pixela Project ในคอนเซปต์ภัยพิบัติของโลกที่ใกล้ถึงจุดจบ",
    theme: "Mutant / viral outbreak · fan motif 💉",
    paragraphs: [
      "ในโลกที่ภัยพิบัติรูปแบบต่าง ๆ ปะทุพร้อมกัน Mild-R คือหนึ่งในตัวตนที่ผูกกับความไม่แน่นอนของการระบาดและความโกลาหลที่ค่อย ๆ กัดกินชีวิตประจำวัน",
      "แม้ธีมจะหนัก แต่คาแรคเตอร์ของเธอเต็มไปด้วยพลังงานเล่นใหญ่ ความน่ารักแบบอันตราย และสายตาที่จับได้ทุกจังหวะใจโยกของฮันนี่",
      "เรื่องราวฉบับเต็มจะถูกเล่าผ่าน scrollytelling ทีละฉาก — จากเปิดตัว สู่ต้นกำเนิด และความสัมพันธ์กับเหล่าฮันนี่",
    ],
    chapters: [
      {
        id: "arrival",
        title: "จุดเริ่มต้นที่ปลายโลก",
        body: "วันเดบิวต์คือจุดที่ประตูเปิด — Mild-R ก้าวเข้ามาในโลกสตรีม พร้อมธีมภัยพิบัติและรอยยิ้มที่ไม่บอกทั้งหมดในครั้งเดียว",
      },
      {
        id: "outbreak",
        title: "สัญญาณระบาด",
        body: "บรรยากาศโลกหลังภัยเริ่มเปลี่ยน มีเพียงเสียงหัวเราะ การร้อง และการรายงานตัวของฮันนี่ที่ยังฟังดูอบอุ่นท่ามกลางความวุ่นวาย",
      },
      {
        id: "honey",
        title: "ฮันนี่คือยาต้าน",
        body: "ใครก็ตามที่อยู่ฝั่ง Mild-R มีชื่อว่าฮันนี่ — พวกเขาคือทั้งแฟนคลับ และส่วนหนึ่งของจังหวะหายใจในแต่ละไลฟ์",
      },
    ],
  },
  characterDesign: {
    illustrator: {
      name: "atwomaru",
      handle: "@atwomaru",
      url: "https://x.com/atwomaru",
    },
    rigger: {
      name: "Karamo Kitchen",
      handle: "@karamomokitchen",
      url: "https://x.com/karamomokitchen",
    },
    notes: "Mama: illustrator · Papa: rigger (as credited on official socials)",
  },
  socials: [
    {
      id: "youtube",
      platform: "youtube",
      label: "YouTube",
      handle: "@MildRWorldEnd",
      url: "https://www.youtube.com/@MildRWorldEnd",
    },
    {
      id: "x",
      platform: "x",
      label: "X (Twitter)",
      handle: "@MildRWorldEnd",
      url: "https://x.com/MildRWorldEnd",
    },
  ],
  hashtags: [
    {
      id: "tag-general",
      category: "general",
      tags: ["#MildReverse"],
    },
    {
      id: "tag-art",
      category: "art",
      tags: ["#MildRArt"],
    },
    {
      id: "tag-meme",
      category: "meme",
      tags: ["#MildRMeme"],
    },
    {
      id: "tag-fan",
      category: "fan",
      tags: ["#ฮันนี่รายงานตัว", "#วันๆของฮันนี่"],
    },
  ],
  fan: {
    fanName: "ฮันนี่",
    fanNameEn: "Honey",
    oshiMark: "💉",
    greetingToFans: "ฮันนี่รายงานตัว~",
  },
  gallery: [
    {
      id: "gallery-01",
      src: "/assets/images/gallery-01.svg",
      alt: "Mild-R portrait placeholder",
      caption: "Portrait study",
      credit: "Placeholder · replace with official / fan art",
    },
    {
      id: "gallery-02",
      src: "/assets/images/gallery-02.svg",
      alt: "Mild-R stage atmosphere placeholder",
      caption: "Outbreak stage",
      credit: "Placeholder · replace with stream key art",
    },
    {
      id: "gallery-03",
      src: "/assets/images/gallery-03.svg",
      alt: "Mild-R soft glow placeholder",
      caption: "Honey glow",
      credit: "Placeholder · replace with #MildRArt",
    },
    {
      id: "gallery-04",
      src: "/assets/images/gallery-04.svg",
      alt: "Mild-R motif placeholder",
      caption: "Signal motif",
      credit: "Placeholder · replace with campaign visual",
    },
  ],
  parallax_layers: [
    {
      id: "hero-bg",
      src: "/assets/layers/hero-bg.svg",
      speed: 0.15,
      alt: "Hero background atmosphere",
      zIndex: 0,
    },
    {
      id: "hero-mid",
      src: "/assets/layers/hero-mid.svg",
      speed: 0.35,
      alt: "Hero midground environment",
      zIndex: 1,
    },
    {
      id: "hero-character",
      src: "/assets/layers/hero-character.svg",
      speed: 0.55,
      alt: "Mild-R character layer",
      zIndex: 2,
    },
    {
      id: "hero-fg",
      src: "/assets/layers/hero-fg.svg",
      speed: 0.85,
      alt: "Hero foreground props",
      zIndex: 3,
    },
    {
      id: "hero-particles",
      src: "/assets/layers/hero-particles.svg",
      speed: 1.1,
      alt: "Foreground particles / atmosphere",
      zIndex: 4,
    },
  ],
};

export default mildRData;
