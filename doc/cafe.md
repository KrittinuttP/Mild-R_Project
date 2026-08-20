# Cafe

ข้อมูลหน้า `/cafe` · ไฟล์จริง: `src/data/mild-r/cafe.json`

ลำดับบนหน้า:
`dispatch` → `daySchedule` → `operations` → `signatureMenu` → `venueMenu` → `goods` → `closing`

---

## operations (HQ · รูปโปรโมทเป็นหลัก)

โฟลเดอร์รูป: `public/assets/cafe/operations/`
ใน JSON path ใช้ `/assets/cafe/operations/….jpg` (อย่าใส่ `/public`)

หัวข้อ: eyebrow · stamp · title · titleLocal · intro

groups[] :
  id · code (8.1–8.4) · title · titleLocal · detail
  layout : `promo` (การ์ดรูปใหญ่ · ค่าเริ่ม) | `brief` (แถวรูปซ้าย + ข้อความ)
  items[] :
    id · name · nameLocal · detail
    image · imageAlt · caption   ← รูปโปรโมทหลักของ HQ
    ถ้ายังไม่มีไฟล์ → UI แสดง Promo TBA อัตโนมัติ
    มีไฟล์แล้ว → กดขยาย lightbox ได้

ไฟล์ที่อ้างใน JSON ตอนนี้:
  caution-tape.jpg
  evidence-board.jpg
  field-evidence-board.jpg
  field-stamp-rally.jpg
  bounty-disguise.jpg
  bounty-preorder.jpg
  social-hashtag.jpg

---

## ส่วนอื่น (ย่อ)

dispatch : schedule + location
daySchedule : dateLabel + items[]
signatureMenu / venueMenu / goods / closing : ตามเดิม

---

## Visibility

keys: mainSiteLink · dispatch · daySchedule · operations · signatureMenu · venueMenu · goods · closing
migrate: `npm run db:migrate:cafe-operations`
