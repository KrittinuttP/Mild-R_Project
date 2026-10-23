# 09 · Countdown Pages — Spec & To-Do

> สถานะ (2026-10-18): **สร้างหน้า CD1/CD2 เสร็จแล้ว (B, C, D)** และ commit แล้ว (`253222d`) · **แก้ข้อมูลคาเฟ่หลุดในซอร์สแล้ว** (D2) · **ล็อกหน้าตามเวลา + ตั้งค่าในหน้า settings เสร็จแล้ว (E)** — รอรัน `npm run db:migrate:cafe-gate` · ยังไม่ได้ทำ QA อัตโนมัติ (F)
> ไฟล์ใหม่: `src/lib/cafe-countdown.ts` (เป้าหมายเวลา + `FIRST_TEASER_YOUTUBE_ID`), `src/components/cafe/countdown/*` (`CountdownBoard`, `CountdownFrame`, `CountdownFooter`, `KeyholeMark`, `TeaserPlayer`), `src/components/cafe/CafeChromeGate.tsx` · แก้: `cafe/layout.tsx`, `CafeEntry.tsx`, `BackToTop.tsx`, `globals.css` (เพิ่ม `--color-cafe-drop`)
> ดีไซน์ต้นแบบ: ไฟล์ดีไซน์หน้า **Countdown (Sample)** → บอร์ด `CD1Countdown`, `CD1Mobile`, `CD2Teaser`, `CD2Mobile`
> โค้ด: `~/Mild-R_Project` (branch `main`)

## 1. หน้าเปล่าที่สร้างไว้

| หน้า | Route | ไฟล์ | เป้าหมายนับถอยหลัง |
|---|---|---|---|
| **CD1** ก่อนทีเซอร์ ไม่มีโลโก้ | `/cafe/countdown` | `src/app/cafe/countdown/page.tsx` | **23 ต.ค. 2026 18:12** (`2026-10-23T18:12:00+07:00`) |
| **CD2** โลโก้ + ทีเซอร์แรก | `/cafe/countdown/teaser` | `src/app/cafe/countdown/teaser/page.tsx` | **30 ต.ค. 2026 18:12** (`2026-10-30T18:12:00+07:00`) |

ทั้ง 2 หน้าสร้างตามสเปกด้านล่างแล้ว + metadata `robots: noindex` · ชื่อ route เป็นกลาง ไม่เอ่ยชื่องาน

## 2. สเปกจากดีไซน์ (สิ่งที่ตัดสินใจแล้ว)

**ร่วมกันทั้ง 2 หน้า**
- พื้น Bottle Green + radial glow, กรอบทองเส้นคู่ (inset), ลายน้ำแว่นขยาย/รูกุญแจ opacity 5% · ใช้ token `--color-cafe-*` ที่มีอยู่ใน `globals.css` (ground, glow, gold, cream, heart) ไม่เขียน hex ตายตัว
- ตัวนับ 4 ช่อง: **DAYS / HOURS / MINUTES / SECONDS** (วัน · ชั่วโมง · นาที · วินาที) ตัวเลข 2 หลัก `tabular-nums` · `role="timer"` `aria-live="off"`
- ขนาดทั้งหมดใช้ `clamp()` ให้ลื่นตั้งแต่ 390px ถึงจอใหญ่ ไม่มี horizontal scroll
- **ห้ามเขียนเวลา 18:12 บนหน้า** (ตัวนับบอกอยู่แล้ว และ 18:12 = ปริศนา 06.12 ที่เก็บไว้เฉลยวันที่ 30)
- Footer: เส้นทองจาง + บรรทัดเดียว `© 2026 Fan-made · Unofficial · Made with ♥ by ▇▇▇` (หัวใจสีชมพู, **ชื่อผู้จัดทำถูกเซ็นเซอร์ด้วยแถบครีมเอียง −1°** `aria-label="ชื่อผู้จัดทำถูกปิดไว้"`) · ไม่มีบรรทัดภาษาไทยใน footer

**CD1 (ไม่มีโลโก้)**
- มุมซ้ายบน `No. ????` · มุมขวาบน `SEALED`
- รูกุญแจเรืองแสง (สี `drop`) · หัวเรื่อง `SOMETHING IS BREWING.` · ไทย `บางอย่างกำลังจะถูกเปิดเผย` (2026-10-19: ตัดคำว่า case/คดี ไม่เผยธีมเร็ว · แท็บ `Something Is Brewing`)
- หัวตัวนับ `THE FILE OPENS IN` · **ไม่มีบรรทัดวันที่/เวลา**
- ครบเวลา: `THE FILE IS OPEN` / `แฟ้มถูกเปิดแล้ว` + ปุ่มทอง `ดูทีเซอร์ · WATCH`
- ห้ามมี: ชื่อ Mild-R, Sherlock Sweetie, 0612, ธีมนักสืบที่ชัดเจน (ตัดสินใจแล้วว่าใช้แบบเรียบ)

**CD2 (โลโก้ + ทีเซอร์)**
- มุมซ้ายบน `CASE No. 0612` · มุมขวาบน `SEALED` (ครบเวลา → `OPEN`)
- โลโก้ Sherlock Sweetie แบบ stack (h1, `aria-label` เต็ม) · หัวตัวนับ `CASE FILE OPENS IN` / `แฟ้มคดีจะเปิดใน` · ใต้ตัวนับแสดงเฉพาะวัน `30 · 10 · 2026`
- ส่วน **FIRST TEASER** (`หลักฐานชิ้นแรกของคดี`): กรอบวิดีโอ 16:9 กว้างสุด 880px, ปุ่มเล่นทอง, ป้าย `EVIDENCE No. 01`, ป้ายแหล่งที่มา `YOUTUBE`
- CD2 footer: แสดงชื่อผู้จัดทำ (`CAFE_DEVELOPER`) ไม่เซ็นเซอร์แล้ว
- CD2 คำบอกเลื่อนลง (`ScrollToTeaser`): `เลื่อนลงไปดูทีเซอร์แรก` + ลูกศร ติดกลางล่างจอ · แสดงเฉพาะตอนหัวข้อ FIRST TEASER ยังอยู่ใต้จอ (ไม่นับแถบล่าง 72px) · กดแล้วเลื่อนไปที่ทีเซอร์ · ลูกศรเด้งเบา 6px รอบละ 2 วิ เริ่มหลังเปิดหน้า 3 วิ (`animate-cafe-nudge`, หยุดเมื่อ reduced motion) ข้อความนิ่ง ไม่กระพริบ · มือถือและจอ 1920×1080 ขึ้นไปเห็นหัวข้ออยู่แล้วจึงไม่ขึ้น
- CD2 ย่อตามความสูงจอ (2026-10-23): ระยะบน `min(8vw,12svh)` · โลโก้ `min(7vw,11svh)` · ตัวเลข `min(4.8vw,6svh)` (ย่อตัวนับมากกว่าโลโก้ ให้โลโก้เด่น) → จอ 1280×720 ขึ้นไป ตัวนับ + วันที่อยู่ครบในจอแรก · CD1 (`large`/`center`) ไม่เปลี่ยน
- ครบเวลา: `CASE FILE · OPEN` / `แฟ้มคดีเปิดแล้ว` + ปุ่ม `เข้าสู่คาเฟ่ · ENTER`

## 3. To-Do

### A. ต้องตัดสินใจ / ต้องได้ข้อมูลก่อน
- [x] **ลิงก์ YouTube ทีเซอร์แรก** `QZG6Jfk8K5E` (https://youtu.be/QZG6Jfk8K5E) ใส่แล้ว 2026-10-23 · คลิปเผยแพร่บนช่อง 23 ต.ค. 18:00 · CD2 เปิด 18:12 · fallback "เร็ว ๆ นี้" ยังทำงานถ้า ID ว่าง
- [ ] **ชื่อโดเมน/URL ของหน้า CD1**: ถ้าเป็น `…r-project.vercel.app` คนเห็นลิงก์จะเดาได้ทันทีว่าเป็นงาน Mild-R → ถ้าอยากปิดความลับก่อนวันที่ 23 ควรใช้โดเมน/path ที่เป็นกลาง (ดู `CAFE_HOST` ใน `src/lib/cafe-host.ts`)
- [ ] ชื่อแฟนคลับในข้อความจริง: footer เว็บเดิมใช้ "Honeycomb" แต่คลังข้อมูลใช้ "ฮันนี่ (Honey)" → เช็กให้ตรงกัน
- [x] วันที่ **เปิดชื่อผู้จัดทำ** (ถอดแถบเซ็นเซอร์): **CD2 เปิดชื่อแล้ว** (ตัดสินใจ 2026-10-23) · CD1 ยังปิด
- [ ] ข้อความตอนครบเวลา (ทั้ง 2 หน้า) ยังเป็นร่างจากดีไซน์ ต้องดูให้ตรงกับคำว่า "เปิดเผย" ที่เพิ่งเปลี่ยนใน CD1
- [ ] **ช่วงที่ต้องแสดงหน้าไหน** (สมมติ ต้องยืนยัน): ก่อน 23 ต.ค. 18:12 → CD1 · 23 ต.ค. 18:12 ถึง 30 ต.ค. 18:12 → CD2 · หลังจากนั้น → `/cafe` จริง

### B. สร้างหน้า CD1
- [x] คอมโพเนนต์ตัวนับถอยหลังแบบ reusable (รับ `targetIso`) — ใช้ `useNow(1000)` ที่มีอยู่ (คืน `null` ตอน SSR กันค่าไม่ตรงตอน hydrate) · **อย่าใช้ `CafeCountdown.tsx` ตรง ๆ** เพราะนับแบบ เดือน/วัน ปฏิทิน ส่วนดีไซน์ใหม่ต้องการ วัน/ชม./นาที/วินาที รวม
- [x] ใช้ epoch ms จาก ISO ที่มี `+07:00` เสมอ (ไม่พึ่ง timezone เครื่องผู้ใช้)
- [x] ครบเวลาแล้วสลับเป็นสถานะ "open" + ปุ่มไปหน้าถัดไป (ยังไม่ใช้ `router.refresh()` รอเชื่อมเวลาฝั่ง server ในข้อ E)
- [x] รูกุญแจเรืองแสง (SVG `drop-shadow`) · ลายน้ำ · กรอบทองคู่ · มุมป้ายซ้าย/ขวา
- [x] Footer เซ็นเซอร์ชื่อ + หัวใจ SVG
- [x] `prefers-reduced-motion` — ไม่ได้ใส่แอนิเมชัน จึงไม่ต้องจัดการ
- [ ] metadata: title/description เป็นกลาง, `noindex`, **ค้าง:** OG image เฉพาะหน้านี้ (ตอนนี้ใช้ค่าจาก layout) ต้องเช็กว่าแชร์ลิงก์แล้วไม่หลุดความลับ

### C. สร้างหน้า CD2
- [x] ใช้ `SherlockSweetieLogo` (`variant="stack"`) ที่มีอยู่แล้ว · ตรวจว่าโลโก้ย่อ/ขยายตามจอได้โดยไม่ล้น
- [x] ตัวนับ (ใช้คอมโพเนนต์เดียวกับ CD1, เป้าหมายคนละวัน)
- [x] กรอบทีเซอร์ YouTube: ใช้ `youtube-nocookie.com/embed/<id>` แบบ **กดเล่นค่อยโหลด iframe** (facade) เพื่อไม่ให้หน้าหนัก · `title` ของ iframe, `loading="lazy"`, `referrerpolicy` เหมาะสม
  - ตามกฎ Library-First: facade สั้น ๆ เขียนเองได้ ถ้าจะใช้ไลบรารี (เช่น lite-youtube) ต้องเสนอชื่อ/เวอร์ชัน/ไลเซนส์ และ**รออนุมัติก่อนติดตั้ง**
- [x] เก็บ `videoId` ไว้ในที่เดียว (ไฟล์ data หรือ env) เพื่อเปลี่ยนเป็นทีเซอร์จริงวันที่ 30 โดยไม่แก้โค้ด
- [x] สถานะ OPEN: เปลี่ยนมุมป้ายเป็น `OPEN` + ปุ่ม `เข้าสู่คาเฟ่ · ENTER` ไป `/cafe`

### D. Layout ที่ครอบอยู่ (ต้องแก้เมื่อเริ่มทำจริง)
- [x] `src/app/cafe/layout.tsx` ครอบทุกหน้า `/cafe/*` ด้วย `CafeEntry` (splash), `CafeHeader`, `CafeFooter` → หน้าเปล่าทั้ง 2 หน้าตอนนี้จึงยังมี splash/เมนู/footer ของเว็บเต็ม
- [x] เพิ่ม `/cafe/countdown` ใน `skipSplash` ของ `CafeEntry.tsx` (ตรวจด้วย `pathname.startsWith`)
- [x] ซ่อน `CafeHeader`/`CafeFooter` บนหน้า countdown (ไม่งั้นเมนูเผยโครงเว็บและ footer ซ้ำกับของหน้า) — ทางที่แก้น้อยสุดคือเช็ก pathname แบบเดียวกับ `CafeEntry`
- [x] ตรวจ `cafe-host.ts` / `proxy.ts`: `/cafe/*` ผ่านเกตโดเมนอยู่แล้ว ไม่ต้องแก้

### D2. กันข้อมูลหลุดในซอร์ส (ทำแล้ว 2026-10-16)
- [x] `proxy.ts` ส่ง header `x-cafe-chrome` (`CAFE_CHROME_HEADER`) → `cafe/layout.tsx` ไม่ render `CafeEntry`/`CafeHeader`/`CafeFooter` และไม่โหลดข้อมูลคาเฟ่ เมื่อเป็นหน้า countdown **หรือคาเฟ่ยังล็อก** (เช่นหน้า login ของ settings) · เดิมข้อมูลคาเฟ่ทั้งก้อนติดไปใน RSC payload แม้ซ่อนบนจอ
- [x] ตัวนับรับ `targetMs` (ตัวเลข) แทนข้อความ ISO → "18:12" ไม่อยู่ในซอร์ส · ปุ่มตอนครบเวลาไป `/cafe` เสมอ (server เลือกหน้าเอง) · ปุ่มเป็น `<a>` (โหลดเต็มหน้า) เพราะ layout ไม่ render ใหม่ตอนเปลี่ยนหน้าแบบ client
- [x] `/cafe/secret` เดิมส่งข้อมูลคาเฟ่ทั้งหมดไปกับหน้าแม้ยังไม่ใส่รหัส (ล็อกแค่ฝั่ง client) → ตอนนี้ส่งข้อมูลเฉพาะเมื่อ server เห็นคุกกี้ทีม · ใส่รหัสแล้วโหลดหน้าใหม่
- [x] แยกตัวช่วยฝั่ง browser ไป `src/lib/cafe-countdown-view.ts` · `cafe-countdown.ts` เป็นข้อมูลฝั่ง server (ห้าม import จาก client component)
- ผลตรวจ HTML ที่ localhost:3001: CD1 ไม่พบ Mild-R / Sherlock / 0612 / ZAYZHIK / 18:12 / path ของ CD2 / ข้อมูลภารกิจ-เมนู · CD2 เหลือเฉพาะโลโก้ + CASE No. 0612 ที่ตั้งใจแสดง
- [ ] **ค้าง:** ไฟล์ JS ของ layout ยังติดมากับหน้า countdown (โค้ดคอมโพเนนต์ ไม่ใช่ข้อมูล) เช่นค่าเริ่มต้น `label="Mild-R: Sherlock Sweetie"` ของ `SherlockSweetieLogo` → แก้ถาวรด้วย route group: ย้ายหน้าคาเฟ่ไป `app/cafe/(site)/` ที่มี layout ของเมนู/footer แยก

### E. ล็อกหน้าตามเวลา (ทำแล้ว 2026-10-18)
กฎทั้งหมดอยู่ใน `src/lib/cafe-gate.ts` (ฟังก์ชันล้วน เทสได้) · `proxy.ts` เรียกใช้กับ `/cafe*` และ `/api/cafe*` เท่านั้น

| ช่วง | `/cafe` แสดง (URL ไม่เปลี่ยน) | หน้าอื่นใน `/cafe/*` | hunt (`auto`) |
|---|---|---|---|
| ① ก่อน `teaser_at` | CD1 (rewrite) · `/cafe/countdown` เปิดตรงได้ | 307 → `/cafe` | ล็อก (หน้า → `/cafe`, API 404) |
| ② `teaser_at` – `open_at` | CD2 (rewrite) · `/cafe/countdown/teaser` เปิดตรงได้ | 307 → `/cafe` (รวม CD1) | ล็อก |
| ③ หลัง `open_at` | คาเฟ่จริง | เปิดทุกหน้า · CD1/CD2 → `/cafe` | เปิด |

- **บนโดเมนคาเฟ่ (`CAFE_HOST`, เช่น `cafe.mildhoneycomb.com`):** หน้าแรก `/` แสดงหน้าคาเฟ่ตามช่วง (rewrite ไม่เปลี่ยน URL) · หน้าที่ถูกล็อกและหน้าเว็บหลักเด้งกลับ `/` · `/cafe` ยังเปิดได้เหมือนเดิม · `CafeHeader` นับ `/` เป็นหน้าแรกคาเฟ่ (ลิงก์ `#section` เลื่อนในหน้า)
- **โดเมนแยกตามงาน** (`src/lib/cafe-host.ts`, env ใน `.env.example`): ทุกโดเมนแสดงหน้าของตัวเองที่ `/` · หน้าอื่นเด้ง `/` · API อื่น 404
  | env | โดเมน | `/` แสดง | เปิดได้เพิ่ม |
  |---|---|---|---|
  | `CAFE_HOST` | `cafe.mildhoneycomb.com` | `/cafe` (ตามล็อกเวลา) | `/cafe/*`, `/api/cafe/*` |
  | `FANART_HOST` | `fanart.mildhoneycomb.com` | `/upload/fanart` | `/api/fanart/submit` |
  | `HBD_HOST` | `hbd.mildhoneycomb.com` | `/upload/hbd` | `/api/hbd/submit` |
  | `ADMIN_HOST` | `admin.mildhoneycomb.com` | `/admin` | `/admin/*`, `/live/ops*`, `/cafe/settings`, `/cafe/secret`, `/upload/*`, `/api/*` |
  คุกกี้ทีมแยกตามโดเมน → ใส่รหัสใหม่ในแต่ละโดเมนที่ใช้
- **ลำดับการตัดสินช่วง:** env `CAFE_PHASE` (dev/preview เท่านั้น) → ค่า `phase` ใน DB (`auto` = ตามเวลา) → เวลา server เทียบ `teaser_at` / `open_at`
- **ไม่ล็อกเลย:** `/cafe/settings`, `/cafe/secret`, `/cafe/lab`, `/api/cafe/settings*`, `/api/cafe/gate` · **คนที่ปลดล็อกด้วยรหัสทีม** (คุกกี้ `mild_r_site_admin`) เห็นคาเฟ่จริงทุกช่วง → ดูแบบผู้ชมให้ใช้หน้าต่างไม่ระบุตัวตน
- **DB:** ตาราง `mild_r.cafe_gate` (key/value: `phase`, `hunt`, `teaser_at`, `open_at`) + view `public.mild_r_cafe_gate` · migration `20261018120000_cafe_gate.sql` → **รัน `npm run db:migrate:cafe-gate` หนึ่งครั้ง** · ถ้ายังไม่รัน/DB ล่ม ใช้เวลาในโค้ด (`COUNTDOWN_TARGETS`) แทน ไม่เปิดก่อนเวลา
- **Performance:** proxy อ่าน DB ด้วย REST call เดียว timeout 1.5 วินาที จำไว้ 30 วินาทีต่อ instance (อ่านพลาดจำ 5 วินาที แล้วใช้ค่าดีล่าสุด) · หน้า CD รับเวลาผ่าน header `x-cafe-gate-times` ไม่อ่าน DB ซ้ำ · หน้าเว็บหลักนอก `/cafe` ไม่แตะ DB
- **หน้า settings:** การ์ด Page lock แสดงเวลา server, ช่วงที่แสดงอยู่ + ที่มา, นับถอยหลังถึงการสลับถัดไป · ตั้งเวลา 2 จุด (เวลาไทย GMT+7), โหมด `/cafe` (`auto`/บังคับ CD1/บังคับ CD2/เปิด), โหมด hunt (`auto`/เปิด/ล็อก) · ค่าที่ทำให้เปิดก่อนเวลาต้องกดยืนยัน 2 ครั้ง · API `PUT /api/cafe/gate` ตรวจรหัสทีม + เช็ก `teaser_at < open_at`
- **env ทดสอบ** (อ่านเฉพาะ `next dev` และ `VERCEL_ENV=preview`, production ไม่สนใจ): `CAFE_GATE_BYPASS=1` ไม่สนการล็อก · `CAFE_PHASE=countdown|teaser|open` บังคับช่วง
- เทสกฎ 62 กรณี (เวลา/ขอบเวลา, DB override, env, hunt, ทุก path × ทุกช่วง × ทีม/bypass) ผ่าน · ตรวจบน 3001: `/cafe` = CD1, หน้าอื่น 307, hunt API 404, ซอร์ส `/cafe` ไม่มี Mild-R/Sherlock/0612
- [ ] หลังรัน migration: เข้า settings ตรวจการ์ด Page lock + ลองบันทึก · ลองหน้าต่างไม่ระบุตัวตน

### F. QA
- [ ] Playwright (POM) + `page.clock` ตรึงเวลา: ไกลเป้าหมาย / เหลือ 1 วินาที / ครบเวลา / เลยเวลาแล้ว / โหลดหน้าแล้ว tick ทีละวินาที
- [ ] ตรวจ timezone: เครื่องผู้ใช้เป็น UTC กับ Asia/Bangkok ต้องนับตรงกัน
- [ ] viewport 360 / 390 / 768 / 1280 / 1920 · ไม่มี horizontal scroll · ตัวนับ 4 ช่องไม่ตกบรรทัดบน 360px
- [ ] contrast (cream/ground, gold/ground), `prefers-reduced-motion`, tab/keyboard ถึงปุ่มและเล่นวิดีโอได้, screen reader อ่านตัวนับไม่รัว
- [ ] `npm run lint` (รวม `check-route-case.mjs`) และ `npm run build`
- [ ] ตรวจว่า CD1 ไม่หลุดคำว่า Mild-R / Sherlock Sweetie / 0612 ทั้งใน HTML, metadata, OG, `<title>` และ alt — HTML/metadata/title ผ่านแล้ว (dev) · เหลือไฟล์ JS (ดู D2) และตรวจซ้ำบน build จริง

### G. วันเปิด (30 ต.ค.) — เช็กลิสต์สั้น
- [ ] สลับเป็น `/cafe` จริง · ใส่ทีเซอร์จริง
- [ ] ถอดแถบเซ็นเซอร์ชื่อผู้จัดทำ
- [ ] โพสต์เฉลยปริศนา (รวมความหมายของ 18:12 = 6:12 PM = 06.12)
- [ ] เอา `noindex` ออกจากหน้าที่ต้องการให้ค้นเจอ

## 4. ความเสี่ยง
- **URL รั่ว** ก่อนวันที่ 23 (ดูข้อ A) · **ทีเซอร์ยังไม่พร้อม** → ต้องมี fallback · **ผู้ใช้เปลี่ยนนาฬิกาเครื่อง** → ใช้เวลา server ตัดสินหน้า ไม่ใช่เวลา client
- Next.js เวอร์ชันนี้ (16.3) มี breaking changes จากที่คุ้นเคย (`middleware` → `proxy`) → อ่านคู่มือใน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดส่วนเชื่อมเวลา (ตาม `AGENTS.md`)
- โปรเจกต์มีกฎ **Confirmation-First** ใน `.cursorrules` → ก่อนลงมือทำข้อ B–E ให้สรุปแผนและรอ "ตกลง/ทำเลย" ก่อน

## 5. ตารางโพสต์ที่เกี่ยวข้อง (อ้างอิง)

อัปเดต 2026-10-20 ตามไทม์ไลน์ที่ทีมยืนยัน (เดิมปริศนาลง 17–22 ต.ค. แต่เริ่มโปรโมตจริงวันที่ 19)

| วันที่ | สิ่งที่โพสต์ | หน้าเว็บ |
|---|---|---|
| 19 ต.ค. | เริ่มโปรโมตคาเฟ่ (โพสต์แรก) | CD1 |
| 20–22 ต.ค. 18:12 | ปริศนา | CD1 |
| 23 ต.ค. 18:12 | ทีเซอร์แรก เปิดโลโก้ (ยังไม่เปิด KV) | CD1 → CD2 |
| 24–29 ต.ค. | ปล่อยภาพ KV | CD2 |
| 30 ต.ค. 18:12 | ทีเซอร์เต็ม + เปิดวันที่และสถานที่ + เฉลยปริศนา | `/cafe` |
| 1–22 พ.ย. | เปิดรับ Fan Art | `/cafe` |
| 6 พ.ย. | สปอยเมนู | `/cafe` |
| 13 พ.ย. | สปอยของแถม | `/cafe` |
| 16 พ.ย. 12:00 – 30 พ.ย. 23:59 | เปิดจองล่วงหน้า | `/cafe` |
| 20 พ.ย. | สปอยกิจกรรมในงาน | `/cafe` |
| 27 พ.ย. | สปอยวิธีเดินทาง | `/cafe` |
| 6 ธ.ค. | วันเปิดคาเฟ่ | `/cafe` |

ส่วนไหนของหน้า `/cafe` ต้องเปิดวันไหน ดูตารางใน `doc/cafe.md` หัวข้อ Visibility
