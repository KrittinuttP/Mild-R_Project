# Project Structure — Mild-R Fanclub Website

โครงสร้างโปรเจกต์ Next.js (App Router) ที่ออกแบบมาสำหรับ scrollytelling, GSAP ScrollTrigger, และ layered parallax assets

```
Mild-R_Project/
├── .cursorrules                 # Cursor workflow & stack rules
├── doc/                         # Project documentation
│   ├── project-structure.md     # This file
│   ├── vtuber-data-schema.md    # Type / field schema
│   ├── content-data.md          # JSON folders + Supabase mapping
│   ├── update.md                # Backlog / roadmap notes
│   └── setup-guide.md           # Dependency install commands
├── public/
│   └── assets/
│       ├── layers/              # Transparent PNGs for parallax
│       ├── images/              # Static images (portraits, gallery)
│       ├── mild/kv/             # Official key visual (hero)
│       ├── icons/
│       └── fonts/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Main scrollytelling landing
│   │   ├── gallery/page.tsx     # Archive เต็ม
│   │   ├── fan-art/page.tsx     # Fan art เต็ม
│   │   ├── hbd/page.tsx         # Birthday wishes scrollytelling
│   │   ├── projects/
│   │   │   ├── page.tsx         # รายการโปรเจกต์
│   │   │   └── [slug]/page.tsx  # รายละเอียด (cafe, mv, hbd, …)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── animations/
│   │   ├── sections/
│   │   ├── gallery/             # GalleryBoard, GallerySection (shared)
│   │   ├── hbd/                 # HbdScroll
│   │   ├── projects/            # ProjectList, ProjectDetail
│   │   ├── layout/
│   │   └── media/
│   ├── data/
│   │   ├── vtuber-data.ts       # Assembler → mildRData
│   │   └── mild-r/              # Content JSON by category
│   │       ├── meta.json
│   │       ├── basic.json
│   │       ├── lore.json
│   │       ├── character-design.json
│   │       ├── socials.json
│   │       ├── hashtags.json
│   │       ├── fan.json
│   │       ├── gallery.json
│   │       ├── fan-art.json
│   │       ├── media.json
│   │       ├── cafe.json
│   │       ├── hbd.json
│   │       ├── parallax-layers.json
│   │       └── projects.json    # Cafe summary, Fansong, HBD, …
│   ├── hooks/
│   ├── lib/
│   └── types/
│       └── vtuber.ts            # Shared TypeScript interfaces
├── components.json
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Folder Descriptions

### `/doc`
เอกสารออกแบบและคู่มือ (schema, structure, content layout, backlog)

| Doc | Purpose |
|-----|---------|
| `project-structure.md` | แผนผังโฟลเดอร์ |
| `vtuber-data-schema.md` | TypeScript field contract |
| `content-data.md` | วิธีแก้ JSON + ทิศทาง Supabase |
| `update.md` | รายการฟีเจอร์ที่ทำ / รอทำ |
| `setup-guide.md` | ติดตั้ง dependency |

### `/public/assets`
ไฟล์ static ที่เซิร์ฟตรงจาก root URL

| Path | Purpose |
|------|---------|
| `/public/assets/layers` | PNG/SVG แยกชั้น parallax |
| `/public/assets/images` | รูป gallery / placeholders |
| `/public/assets/mild/kv` | Key visual (ใช้ใน Hero ไม่ใส่ใน Gallery) |
| `/public/assets/icons` | favicon, brand marks |

### `/src/app`
Next.js App Router — routing และหน้าหลัก

### `/src/components`
| Folder | Role |
|--------|------|
| `ui/` | shadcn/ui |
| `animations/` | GSAP (parallax, scroll reveal, heart atmosphere) |
| `sections/` | Narrative sections |
| `layout/` | Header, Footer, SiteSplash, HomeEntry, SoftNavMarker, BackToTop |
| `media/` | Image protection helpers |

### `/src/data`
คอนเทนต์แยก JSON ตามหมวด (`mild-r/*`) + assembler ใน `vtuber-data.ts`  
รายละเอียด: [`content-data.md`](./content-data.md)

### `/src/lib`
Helpers เช่น `youtube.ts`, `media.ts` (จัดกลุ่ม playlist), `scroll-to-hash.ts`

### `/src/types`
`vtuber.ts` — interfaces ที่ JSON และ assembler ต้องตรงกัน

---

## Animation Responsibility Split

| Layer | Responsibility |
|-------|----------------|
| Sections | HTML/semantic + bind `mildRData` |
| Animations | GSAP timelines / ScrollTrigger |
| Data | Content + gallery / parallax metadata |
| UI | shadcn controls |

---

## Asset Naming (parallax)

```
hero-bg.* · hero-mid.* · hero-character / KV · hero-fg.* · hero-particles.*
```

อ้างอิงใน JSON ด้วย path สาธารณะ เช่น `/assets/layers/hero-bg.svg`
