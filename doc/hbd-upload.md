# HBD Upload · ส่งการ์ดอวยพร

หน้าสาธารณะให้ฮันนี่กรอกฟอร์ม + อัปโหลดการ์ด → พรีวิว → ส่งเข้าคิวอนุมัติ → ขึ้น `/HBD/2026`

## Routes

| Path | งาน |
|---|---|
| `/HBD/2026/upload` | ฟอร์ม · โหลด template · พรีวิว · ส่งจริง |
| `/HBD/2026` | แกลเลอรี (approved จาก DB) |
| `/admin` | Control desk · badge pending |
| `/admin/hbd` | Pending / Approved · Approve / Reject |

## ฟอร์ม (ลำดับบนหน้า)

1. Hero + ตัวอย่าง template + ปุ่มโหลด
2. อัปโหลดการ์ด *
3. ชื่อที่แสดง * + Avatar (ไม่บังคับ)
4. ข้อความอวยพร (ไม่บังคับ)
5. ช่องทางติดต่อ * · **ไม่แสดงบนเว็บ** (ใช้ติดต่อเมื่อมีปัญหา)
6. พรีวิว ↔ แก้ไข (รูปไม่หาย) → ตกลง / ล้างฟอร์ม → `POST /api/hbd/submit`

## Backend

- Table: `mild_r.hbd_submissions` (+ view `public.mild_r_hbd_submissions`)
- Storage bucket: `hbd-uploads` (JPEG/PNG/WebP · ≤ 5 MB)
- Migrate: `npm run db:migrate:hbd-submissions`
- Admin auth: cookie ร่วม `/admin` (`SITE_ADMIN_PASSWORD` / default ดู `.env.example`)

## Status

- ✅ Auth รวม + `/admin` hub
- ✅ `/HBD/2026/upload` UI + submit API
- ✅ `/admin/hbd` approve/reject + badge pending
- ✅ `/HBD/2026` แสดง approved จาก Supabase

## Theme

โทน HBD (`#140a0d` / `#e85a7a`) · เชิญชวนอวยพร mutant สาว · 12.12.2026
