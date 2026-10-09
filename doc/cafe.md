# Cafe

ข้อมูลหน้า `/cafe` · ไฟล์จริง: `src/data/mild-r/cafe.json`

ลำดับบนหน้า:
`overview` → เทปจอง → `menu` (เสบียง + `promoSets` + `preorder`) → `activities` → `goods` → `venue-menu` → `story` → บันทึกปิดท้าย

รอบนี้เปิดทุกส่วนที่มีข้อมูลจริง ช่องที่ยังว่าง (ราคา รายการในเซต ลิงก์แผนที่ ลิงก์จอง รูปโปรโมท) ไม่ขึ้นข้อความปิดหรือป้ายรอประกาศ

### ข้อมูลตัวอย่าง (ต้องแทนด้วยของจริงก่อนเผยแพร่)

ตอนนี้ `cafe.json` ใส่ค่าตัวอย่างไว้เพื่อดูดีไซน์ และมี `mockNotice` ซึ่งทำให้หน้าเว็บขึ้นกรอบเหลือง "ข้อมูลตัวอย่าง" ใต้เทปแจ้งเปิดจอง
เมื่อแทนค่าครบแล้วให้ลบช่อง `mockNotice` ออก กรอบจะหายไปเอง

| ช่อง | ค่าตัวอย่างที่ใส่ไว้ |
|---|---|
| `signatureMenu.items[].priceLabel` | ฿139, ฿129, ฿169 |
| `promoSets.items[]` `priceLabel`, `menu`, `giveaways` | ราคา รายการเมนู และของแถมของเซต A / B / C |
| `preorder.promo`, `preorder.url` | ข้อความโปรโมชั่น และลิงก์ `example.com` |
| `dispatch.location.mapUrl` | ลิงก์ค้นหาใน Google Maps ยังไม่ได้ยืนยันพิกัด |
| `operations.groups[].items[].image` | ยืมรูปจาก `/assets/cafe/event/` มาแสดงในแกลเลอรี |
| `goods.items[0].image` | ยืมรูป KV มาแทนรูปอะคริลิกสแตนด์ |

---

## ข้อมูลที่เพิ่ม

`heroCutout` — ตัวละครบนกระดาน (`heroImage` ยังใช้กับหน้าจอเปิดแฟ้ม)

`promoSets` — เซต A / B / C  
`preorder` — ช่วงจองล่วงหน้า ลิงก์อยู่ใน `url`

`operations.groups[].items[].kind`
- `mission` — การ์ดภารกิจในกิจกรรม
- `teaser` — แกลเลอรี เมื่อมีไฟล์รูป
- `preorder` — ไม่ขึ้นเป็นการ์ด ข้อความไปอยู่ที่ตั๋วจอง

แกลเลอรีแสดงเฉพาะรายการที่มีไฟล์รูป และใช้แค่ `caption`

---

## Visibility

keys: mainSiteLink · dispatch · daySchedule · operations · signatureMenu · venueMenu · goods · closing

เซตและตั๋วจองตามคีย์ `signatureMenu`  
ภารกิจและแกลเลอรีตามคีย์ `operations`

migrate: `npm run db:migrate:cafe-operations`

---

## Animation

ตัวคุมอยู่ที่ `src/components/cafe/board/useBoardMotion.ts` เรียกครั้งเดียวจาก `CafePromo`
ชิ้นส่วนบอกว่าตัวเองขยับแบบไหนด้วย `data-motion`

| `data-motion` | เล่นเมื่อ | การเคลื่อนไหว |
|---|---|---|
| `lamp`, `hero-board`, `hero-char`, `hero-heart`, `hero-card`, `hero-title`, `hero-yarn`, `hero-stamp`, `hero-tape` | หน้าจอเปิดแฟ้มหายไป (`CafeEntry` ส่งสัญญาณ `cafe:entry-ready`) | ลำดับเปิดกระดาน ราว 5 วินาที |
| `drop` | เลื่อนมาถึง ครั้งเดียว | การ์ดหรือโพลารอยด์ตกลงมา แล้วหมุดปัก |
| `swing` | เลื่อนมาถึง ครั้งเดียว | ถุงหลักฐานและการ์ดเซตแกว่งเข้าที่ |
| `rise` | เลื่อนมาถึง ครั้งเดียว | เลื่อนขึ้นพร้อมจางเข้า |
| `stamp` | เลื่อนมาถึง ครั้งเดียว | ตราประทับกระแทกลง |
| `tl-line`, `tl-item` | ตามระยะที่เลื่อน | เส้นด้ายยืดลงมา หมุดและโน้ตขึ้นเมื่อเส้นมาถึง |

แถบดำปิดวันที่และสถานที่ใช้ `data-redact`

ที่วนตลอดเวลาเป็น CSS ใน `globals.css`: `animate-cafe-lamp`, `animate-cafe-float`, `animate-cafe-beat`, `animate-cafe-sway`, `animate-cafe-tape`

ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว: ไม่มีอะไรขยับ ทุกชิ้นอยู่ในสภาพสุดท้ายทันที

### วิธีเทส animation

- ดูลำดับเปิดกระดานซ้ำโดยไม่ต้องโหลดหน้าใหม่: เปิด console ของ browser แล้วสั่ง `window.dispatchEvent(new Event("cafe:replay-opening"))` หน้าจะเลื่อนกลับไปบนสุดแล้วเล่นใหม่
- ตอนรัน `npm run dev` ถ้าแก้ไฟล์ `useBoardMotion.ts` แล้ว animation หยุดทำงาน ให้โหลดหน้าใหม่ 1 ครั้ง (เกิดเฉพาะตอนพัฒนา)
- `animate-cafe-sway` ต้องอยู่บนกล่องหุ้มชั้นนอก ส่วน `data-motion` อยู่บนชิ้นข้างใน ถ้าใส่ทั้ง 2 อย่างบนชิ้นเดียวกัน ชิ้นนั้นจะค้างเอียงหลังเล่นจบ
