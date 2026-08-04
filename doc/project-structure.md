# Project Structure — Mild-R Fanclub Website

โครงสร้างโปรเจกต์ Next.js (App Router) ที่ออกแบบมาสำหรับ scrollytelling, GSAP ScrollTrigger, และ layered parallax assets

```
Mild-R_Project/
├── .cursorrules                 # Cursor workflow & stack rules
├── doc/                         # Project documentation
│   ├── project-structure.md     # This file
│   ├── vtuber-data-schema.md    # Mild-R data schema
│   └── setup-guide.md           # Dependency install commands
├── public/
│   └── assets/
│       ├── layers/              # Transparent PNGs for parallax
│       ├── images/              # Static images (portraits, banners)
│       ├── icons/               # Favicons, brand marks, oshi mark
│       └── fonts/               # Self-hosted web fonts (if needed)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # Root layout, fonts, global providers
│   │   ├── page.tsx             # Main scrollytelling landing page
│   │   ├── globals.css          # Tailwind + global styles
│   │   └── favicon.ico
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── animations/          # GSAP wrappers & scroll triggers
│   │   ├── sections/            # Full-page narrative sections
│   │   └── layout/              # Site chrome (nav, footer, skip links)
│   ├── data/
│   │   └── vtuber-data.ts       # Mild-R mock / content data
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities (cn helper, GSAP register)
│   └── types/                   # Shared TypeScript types / interfaces
├── components.json              # shadcn/ui config
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Folder Descriptions

### `/doc`
เอกสารออกแบบและคู่มือโปรเจกต์ (schema, structure, setup) ไม่รวมโค้ดที่รันบนเว็บ

### `/public/assets`
ไฟล์ static ที่เสิร์ฟตรงจาก root URL

| Path | Purpose |
|------|---------|
| `/public/assets/layers` | PNG โปร่งใสแยกชั้นสำหรับ parallax (background, midground, character, foreground, particles) |
| `/public/assets/images` | รูปทั่วไป เช่น portrait, banner, gallery thumbnails |
| `/public/assets/icons` | favicon, oshi mark, social brand icons ถ้าไม่ใช้ lucide |
| `/public/assets/fonts` | ฟอนต์ self-hosted (ถ้าใช้แทน Google Fonts) |

### `/src/app`
Next.js App Router — routing, layout, และหน้าหลักของเว็บ

| File | Purpose |
|------|---------|
| `layout.tsx` | Root HTML shell, font loading, metadata |
| `page.tsx` | ประกอบ sections เป็น scrollytelling page เดียว |
| `globals.css` | Tailwind directives + CSS variables / base tokens |

### `/src/components/ui`
คอมโพเนนต์ฐานจาก **shadcn/ui** (Button, Dialog, Card, ฯลฯ) ที่ปรับแต่งผ่าน Tailwind ได้เต็มที่ และไม่ขัดกับ GSAP

### `/src/components/animations`
Wrapper และ utilities สำหรับ GSAP

ตัวอย่างไฟล์ที่คาดว่าจะมี:
- `ParallaxLayer.tsx` — วาง layer ตาม `src` + `speed`
- `ScrollReveal.tsx` — fade / slide เข้าเมื่อเข้า viewport
- `ScrollTriggerProvider.tsx` — register ScrollTrigger + cleanup
- `useGsapContext.ts` หรือ hook ที่เกี่ยวข้อง (อาจย้ายไป `/src/hooks`)

### `/src/components/sections`
ส่วนเนื้อหาแบบเต็มหน้าสำหรับ narrative flow

| Section | Purpose |
|---------|---------|
| `Hero.tsx` | Opening + ชื่อ Mild-R + ภาพบรรยากาศ parallax |
| `Profile.tsx` | ข้อมูลพื้นฐาน, greeting, debut |
| `Lore.tsx` | พื้นหลัง / เรื่องราวตัวละคร |
| `Gallery.tsx` | แกลเลอรีภาพ / artwork |
| `Socials.tsx` | ลิงก์ YouTube, X, hashtags, streaming |

### `/src/components/layout`
โครงไซต์ที่ไม่ใช่เนื้อหา narrative เช่น `Header.tsx`, `Footer.tsx`, navigation

### `/src/data`
ข้อมูลคอนเทนต์ (mock หรือ static content) เช่น `vtuber-data.ts` รวม `parallax_layers`

### `/src/hooks`
Custom hooks เช่น scroll progress, media query, GSAP-safe lifecycle

### `/src/lib`
Helper functions เช่น `cn()` (clsx + tailwind-merge), การ register GSAP plugins ครั้งเดียว

### `/src/types`
TypeScript interfaces / types ที่ใช้ร่วมกันทั้งโปรเจกต์ (อาจ derive จาก schema ใน `doc/`)

---

## Asset Naming Conventions (recommended)

**Parallax layers** ใน `/public/assets/layers`:

```
hero-bg.png
hero-mid.png
hero-character.png
hero-fg.png
hero-particles.png
```

อ้างอิงในโค้ดผ่าน path สาธารณะ เช่น `/assets/layers/hero-bg.png` (ไม่ใส่คำว่า `public` ใน URL)

---

## Animation Responsibility Split

| Layer | Responsibility |
|-------|----------------|
| Sections | โครงสร้าง HTML/semantic + content binding |
| Animations | GSAP timelines, ScrollTrigger, parallax speed |
| Data | Content + layer metadata (`id`, `src`, `speed`) |
| UI | Reusable controls (buttons, dialogs) via shadcn/ui |

โครงสร้างนี้แยก **เนื้อหา** / **เอฟเฟกต์** / **UI ฐาน** ออกจากกัน เพื่อให้ขยาย section ใหม่หรือเพิ่ม parallax layer ได้โดยไม่ผูกติดกันเกินไป
