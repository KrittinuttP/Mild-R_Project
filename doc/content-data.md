# Content Data — JSON layout (Supabase-ready)

คู่มือจัดเก็บคอนเทนต์ Mild-R แยกเป็น JSON ตามหมวด  
ใช้กับ `src/data/vtuber-data.ts` (assembler) และเตรียมย้ายไป Supabase ทีหลัง

ดู schema ราย field ได้ที่ [`vtuber-data-schema.md`](./vtuber-data-schema.md)

---

## โครงสร้างปัจจุบัน

```
src/data/
├── vtuber-data.ts          # loadMildRProfile() + export mildRData
└── mild-r/                 # เนื้อหาจริง แยกไฟล์ตามหมวด
    ├── meta.json           # id โปรไฟล์
    ├── basic.json          # ชื่อ, debut, เพลงต้นฉบับ
    ├── lore.json           # summary / paragraphs / chapters
    ├── character-design.json
    ├── socials.json        # array
    ├── hashtags.json       # array
    ├── fan.json
    ├── gallery.json        # array (+ size, loadOnDemand)
    ├── fan-art.json        # fan / community art (+ artist)
    ├── media.json          # YouTube clips for home Media section
    ├── cafe.json           # dedicated /cafe promo page
    ├── hbd.json            # birthday wishes scrollytelling
    ├── parallax-layers.json
    └── projects.json       # Cafe, MV, HBD, … (รายการใต้ /projects)
```

Types อยู่ที่ `src/types/vtuber.ts`  
Components ยัง import `mildRData` จาก `@/data/vtuber-data` ได้เหมือนเดิม

---

## แก้เนื้อหาอย่างไร

| อยากแก้ | แก้ไฟล์ |
|---------|---------|
| ชื่อ / greeting / debut | `mild-r/basic.json` |
| เรื่องราว / scrollytelling | `mild-r/lore.json` |
| เครดิต Mama / Papa | `mild-r/character-design.json` |
| ลิงก์โซเชียล | `mild-r/socials.json` |
| แฮชแท็ก | `mild-r/hashtags.json` |
| ชื่อแฟนคลับ / oshi mark | `mild-r/fan.json` |
| รูป gallery | `mild-r/gallery.json` |
| แฟนอาร์ต | `mild-r/fan-art.json` |
| คลิป Media (หน้าแรก) | `mild-r/media.json` |
| อวยพรวันเกิด (HBD) | `mild-r/hbd.json` |
| Cafe โปรโมท | `mild-r/cafe.json` |
| ชั้น parallax ใน Hero | `mild-r/parallax-layers.json` |
| โปรเจกต์ (Cafe / MV / HBD …) | `mild-r/projects.json` |

หลังแก้ JSON เซฟแล้ว dev server จะ hot-reload เอง

### Gallery flags

| Field | ความหมาย |
|-------|----------|
| `size` | `sm` \| `md` \| `lg` \| `tall` \| `wide` — จัด bento |
| `loadOnDemand` | `true` = รอไปโชว์ตอนกด「โหลดเพิ่ม」 |

อย่าใส่ KV Hero (`Mild-R_KV.png`) ใน gallery — ใช้เฉพาะ parallax / hero

### Fan art

| Field | ความหมาย |
|-------|----------|
| (fields ของ GalleryItem) | `src`, `size`, `loadOnDemand`, … |
| `artist.name` | ชื่อศิลปินแฟน |
| `artist.handle` / `url` | (optional) โซเชียล |

UI: หน้าแรกโชว์ **Archive** แล้วตามด้วย **Fan art** (เลื่อนต่อกัน) แต่ละโซนมีปุ่ม **View all**  
Routes คลังเต็ม: `/gallery` · `/fan-art`  
Hash บนหน้าแรก: `#gallery` · `#fan-art` (โซนพรีวิว)

### HBD

| Field | ความหมาย |
|-------|----------|
| `title` / `subtitle` / `closingMessage` | ข้อความหน้าประสบการณ์ |
| `wishes[]` | การ์ดอวยพร (`from`, `message`, `image?`) |
| `fromUpload` | เตรียมไว้ต่อ Storage ทีหลัง |
| `loadOnDemand` | lazy รูปตอนเลื่อนถึง |

Routes: `/hbd` (ประสบการณ์) · `/projects/hbd` (หน้าโปรเจกต์ + CTA)

### Media (หน้าแรก)

| Field | ความหมาย |
|-------|----------|
| `youtubeUrl` | ลิงก์ watch / youtu.be / shorts (ฝังได้) |
| `category` | กลุ่ม playlist: `original` · `cover` · `event` · `birthday-pv` · `worldend-pv` · `debut-pv` |
| `featured` | คลิปหลักตอนเปิด section |
| `embedExternal` | `true` = ฝัง iframe บนเว็บ · `false` = thumbnail แล้วเปิด YouTube |
| `title` / `titleLocal` / `description` | คำอธิบายใต้เครื่องเล่น |

Section `#media` อยู่ก่อน Connect — เพิ่มคลิปใน `media.json` ได้เลย  
แท็บหมวดอยู่เหนือ player + playlist เต็มความกว้าง มีไอคอนต่อหมวด (helper: `src/lib/media.ts`) — กดแท็บแล้วเล่นคลิปแรกของหมวด

Shared components: `src/components/gallery/GalleryBoard.tsx`, `GallerySection.tsx`

### Projects

| Field | ความหมาย |
|-------|----------|
| `slug` | path ใต้ `/projects/[slug]` เช่น `cafe`, `mv` |
| `status` | `upcoming` \| `active` \| `ended` |
| `category` | ป้ายหมวด เช่น `cafe`, `fansong`, `hbd` |
| `cover` | รูปปก |
| `highlights` | จุดเด่นสั้นๆ (optional) |
| `body` | ย่อหน้าเนื้อหา |
| `cta` | ปุ่มลิงก์หลัก |
| `ctas` | ปุ่มเพิ่ม (เช่น X) — แสดงคู่กับ `cta` |
| `youtubeUrl` | ลิงก์ YouTube — หน้า detail จะฝัง embed ถ้ามี |

Fansong กรองได้ที่ `/projects?category=fansong`  
Cafe มีหน้าโปรโมทแยกที่ `/cafe` (ข้อมูลใน `cafe.json`) — หน้า `/projects/cafe` เป็นสรุป + ลิงก์ไปโปรโมทและ X

Routes:
- `/projects` — รายการรวม
- `/projects?category=fansong` — hub Fansong
- `/projects/cafe`, `/projects/heart-cure`, … — สรุปรายละเอียด
- `/cafe` — หน้าโปรโมท Cafe เต็ม (layout แยก Header/Footer ของ Cafe)

### Cafe (`/cafe`)

แก้ที่ `mild-r/cafe.json` — `edition`, `heroImage` / `heroAlt`, `visuals[]` (atmosphere/location/art), `location.image`, `menu[].image`, `goods[].image`, daySchedule, highlights, ctas  
คอมโพเนนต์: `CafeHeader`, `CafeFooter`, `CafePromo` — ไม่ใช้ Header/Footer ของเว็บหลัก  
Nav ใน Cafe: Overview · Plates · Schedule · Menu · Goods · Case file (+ ลิงก์กลับ Mild-R)  
โทน: dark editorial ทั้งหน้า (ไม่มีแผ่นครีม) — copper/rose lines + Newsreader + รูปเป็นจังหวะ  
Loading: `CafeSplash` โทน gazette สั้นๆ (ข้าม soft-nav) + preload `heroImage`  
รูปจริง: แทน path ใน JSON ได้เลย (วางไฟล์ใต้ `public/`)

---

## Mapping ไป Supabase (อนาคต)

แต่ละไฟล์ JSON ≈ หนึ่งตารางหรือหนึ่ง document group

| JSON file | Suggested table / storage |
|-----------|---------------------------|
| `meta` + `basic` + `fan` | `profiles` (แถวเดียวต่อ talent) |
| `lore` | `lore` หรือ JSONB column บน profiles |
| `character-design` | `credits` หรือ JSONB |
| `socials` | `social_links` (`profile_id`, …) |
| `hashtags` | `hashtag_groups` |
| `gallery` | `gallery_items` + Storage bucket สำหรับไฟล์รูป |
| `fan-art` | `fan_art_items` (+ artist fields) |
| `media` | `media_clips` |
| `cafe` | `cafe_pages` (+ menu/goods related) |
| `hbd` | `hbd_pages` + `hbd_wishes` (+ Storage สำหรับรูป) |
| `parallax-layers` | `parallax_layers` หรือ config JSON |
| `projects` | `projects` (`slug` unique) |

### แนวทางย้าย

1. คง shape field ให้ใกล้เคียง JSON ปัจจุบัน  
2. เปลี่ยน `loadMildRProfile()` ให้ `fetch` จาก Supabase แทน `import` JSON  
3. รูปที่ `loadOnDemand` / HBD upload → Supabase Storage + signed หรือ public URL ใน `src`  
4. เก็บ JSON ใน repo เป็น fallback / seed จนกว่า production จะชี้ไป DB

ตัวอย่างฟังก์ชันอนาคต:

```ts
// ยังไม่ implement — เป็นทิศทางเท่านั้น
export async function loadMildRProfileFromSupabase(): Promise<VtuberProfile> {
  // const { data: basic } = await supabase.from("profiles").select(...).single()
  // const { data: gallery } = await supabase.from("gallery_items").select("*")
  // return assemble(...)
}
```

---

## Checklist เมื่อเพิ่มหมวดใหม่

1. เพิ่ม type ใน `src/types/vtuber.ts`  
2. เพิ่มไฟล์ JSON ใต้ `src/data/mild-r/`  
3. import ใน `loadMildRProfile()`  
4. อัปเดต `doc/vtuber-data-schema.md` + ไฟล์นี้  
5. (ถ้ามีหน้าใหม่) ผูกคอมโพเนนต์กับ field ใหม่
