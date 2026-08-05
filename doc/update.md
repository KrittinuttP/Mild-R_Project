# Update / Roadmap — Mild-R Fanclub

บันทึกความต้องการและสถานะงาน (อัปเดตเมื่อทำแต่ละ phase)

---

## Phase 1 — UX หน้าแรก ✅

- [x] Loading น่ารักก่อนเข้าหน้าแรก (`SiteSplash`)
- [x] Animation / ระยะเวลาต่างกันเมื่อเปิดครั้งแรก
- [x] Refresh ขึ้นบนสุด + ปุ่ม Back to top
- [x] ล็อก Heart FX เป็น `both` (ถอดตัวเลือก preview)

## Phase 2 — Gallery + ปกป้องรูป ✅

- [x] กันคลิกขวา / ลากรูป (`MediaProtection`, `ProtectedImage`)
- [x] Gallery bento + soft animation
- [x] Lightbox ดูรูปใหญ่ + เปลี่ยนรูป (ปุ่ม / คีย์บอร์ด)
- [x] โหลดทีละส่วน + flag `loadOnDemand`
- [x] ไม่ใส่ KV ใน Gallery

## Phase 3 — JSON ตามหมวด (Supabase-ready) ✅

- [x] แยกคอนเทนต์เป็น `src/data/mild-r/*.json`
- [x] Assembler `loadMildRProfile()` → `mildRData`
- [x] Types ที่ `src/types/vtuber.ts`
- [x] เอกสาร: `doc/content-data.md`, อัปเดต schema + structure

ดูวิธีแก้ไฟล์ JSON และการ map ไป Supabase: [`content-data.md`](./content-data.md)

## Phase 4 — Projects (รวม Cafe / MV) ✅

- [x] `/projects` หน้ารวมรายการโปรเจกต์
- [x] `/projects/[slug]` หน้ารายละเอียด (เช่น cafe, mv)
- [x] Cafe / MV อยู่ใน `projects.json` ไม่แยกเมนู top-level
- [x] Header / Footer ลิงก์ Projects
- [x] MV รองรับ YouTube embed ผ่าน `youtubeUrl`
- [x] อัปเดตเอกสาร

## Phase 5 — Fan art tab ✅

- [x] `fan-art.json` แยกจาก `gallery.json`
- [x] แสดงเครดิตศิลปิน + lightbox
- [x] ลิงก์ใน Header / Footer
- [x] อัปเดตเอกสาร

## Phase 5.1 — Stacked preview + View all ✅

- [x] หน้าแรก: Archive แล้วต่อด้วย Fan art (ไม่มีแท็บ)
- [x] ปุ่ม View all → `/gallery` และ `/fan-art`
- [x] Component กลาง `GalleryBoard` + `GallerySection`
- [x] หน้าเต็มโหลดเพิ่มได้ / layout ต่างกันเล็กน้อยตาม variant

## Phase 5.2 — Scroll section + splash ตอนกลับ ✅

- [x] มี hash (`#gallery`, `#fan-art`, …) แล้วรีเฟรช/กลับ → เลื่อนไป section นั้น
- [x] Splash โชว์ตอนเปิดแท็บหรือรีเฟรชหน้าแรกเท่านั้น — ไม่โชว์ตอนลิงก์ภายใน/กดกลับ

## Phase 6 — HBD scrollytelling ✅

- [x] หน้า `/hbd` — เลื่อนดูคำอวยพรทีละการ์ด (GSAP)
- [x] ข้อมูล `hbd.json` + flag `fromUpload` / `loadOnDemand`
- [x] โปรเจกต์ใน `/projects` slug `hbd` → CTA ไป `/hbd`
- [x] อัปเดตเอกสาร

## Phase 7 — Media / YouTube บนหน้าแรก ✅

- [x] `media.json` + type `MediaClip`
- [x] Section `#media` ก่อน Connect — embed + playlist
- [x] ลิงก์ไปโปรเจกต์ MV / ช่อง YouTube
- [x] Nav Header / Footer + อัปเดตเอกสาร
- [x] จัดกลุ่ม playlist (`category`) — Original / Cover / Event / Birthday·WorldEnd·Debut PV
- [x] ครบคลิป Cover + Event แยกกลุ่ม + PV
- [x] Playlist เป็นแท็บหมวด — ซิงค์กับคลิปที่เล่น
- [x] แท็บหมวดอยู่เหนือทั้ง section (เต็มความกว้าง)
- [x] ไอคอนต่อหมวดบนแท็บ + polish active state
- [x] แก้ฝังคลิป: `youtube.com` embed ตรงๆ (ไม่ต้องกด Play สองที)
- [x] Fansong hub — `/projects?category=fansong` (รองรับหลายเพลง) + ปุ่ม Media
- [x] `embedExternal` — คลิปที่ฝังไม่ได้ (Tipsy / GETCHA / Event) โชว์ thumbnail บนเว็บ แล้วเปิด YouTube · ที่เหลือฝังปกติ
- [x] Hashtags คลิกแล้วเปิด X หน้าแท็ก (`x.com/hashtag/...`)
- [x] Footer credit — Made with ♡ by ZAYZHIK 🦈 (ลิงก์ X)

---

## ยังไม่ทำ (backlog)

- [ ] หน้า HBD ดึงรูปจาก upload จริง (Supabase Storage)
- [ ] รวม / โชว์ gallery art ของ Mild-R (ของจริงแทน placeholder)
- [ ] เชื่อม Supabase จริง

---

## โน้ตเวลาทำ phase ถัดไป

ทุกครั้งที่เพิ่มฟีเจอร์หรือเปลี่ยนโครงข้อมูล **อัปเดต md ใน `doc/` ด้วย**  
โดยเฉพาะ `update.md`, `content-data.md`, `project-structure.md`, `vtuber-data-schema.md`
