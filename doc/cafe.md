# Cafe

ข้อมูลหน้า `/cafe` · ไฟล์จริง: `src/data/mild-r/cafe.json`

---

ชื่อ : Honey Cafe
ชื่อไทย : คาเฟ่ฮันนี่
คำโปรย : รายงานพิเศษจากห้องเคสของ Mild-R — คาเฟ่ลึกลับธีมนักสืบ พร้อมเมนูพิเศษ โซนถ่ายรูป และของที่ระลึกสำหรับฮันนี่
สถานะ : upcoming
ป้ายสถานะ : CASE DATE SET
  → upcoming = ยังไม่เปิด · active = กำลังจัด · ended = จบแล้ว

วันที่จัด Cafe : 2026 · 11 · 29 / 29 November 2026
  → ใช้ตัวเลขโทนลึกลับบนหน้าเว็บ
Time : 10:00 – 18:00

---

## Edition (กรอบหนังสือพิมพ์บนหน้า)

masthead : The Honey Pulse Gazette
  → ชื่อหนังสือพิมพ์ / หัวกระดาษ
kicker : Detective Cafe
  → ป้ายเล็กเหนือหัว
caseNo : CASE · MR-HP-001
  → เลขเคสในธีมนักสืบ
dateline : Vol. I · No. 1 · Mild-R Fanclub
  → ฉบับ / เล่ม / ใครออก

---

## Hero (รูปปกด้านบน)

heroImage : /assets/mild/kv/Mild-R_Name_Art.png
heroAlt : Mild-R key visual — Honey Pulse Cafe sample art
  → รูปใหญ่ตอนเปิดหน้าคาเฟ่

---

## สถานที่

label : SOCIEFEE X CHOUXSTORY
  → ชื่อร้าน / สถานที่จัด
detail : MRT หัวลำโพง (Exit 2)
  → คำอธิบายพิกัดสั้น ๆ
mapUrl : (ยังไม่มี)
  → ลิงก์ Google Maps (ถ้ามี)
image : /assets/cafe/location/CHOUXSTORY.jpg
imageAlt : SOCIEFEE × CHOUXSTORY
  → รูปร้านหรือแผนที่ ใส่ไฟล์ใต้ public/ แล้วใน JSON ใช้ /assets/... (อย่าใส่ /public)

---

## ช่วงเปิดเคส (Schedule)

label : 2026 · 11 · 29
detail : 10:00 – 18:00
startsAt : 2026-11-29T10:00:00+07:00
endsAt : 2026-11-29T18:00:00+07:00
  → ช่วงวันเปิด–ปิดงานโดยรวม · countdown นับถึง startsAt (เปิดประตู) แล้วแสดง Case Open จนถึง endsAt

---

## ตารางกิจกรรมในวัน (Day schedule)

title : Daily Schedule
titleLocal : ตารางกิจกรรมในวัน
dateLabel : 2026 · 11 · 29

10:00 Doors open / เปิดประตู
  เช็กอินและรับแผนที่เคสย่อ
10:30 First pour / รอบเครื่องดื่มแรก
  เปิดเมนูซิกเนเจอร์ Heart Cure Latte
13:00 Photo zone / โซนถ่ายรูป
  พร็อพนักสืบ / มุมหลักฐานหัวใจ
15:00 Goods drop / ปล่อยของที่ระลึก
  อะคริลิกและโฟโต้การ์ด (จำนวนจำกัด)
17:30 Last order / ออเดอร์สุดท้าย
  รับเครื่องดื่มและของหวานรอบท้าย
18:00 Case closed / ปิดเคส
  ปิดร้านและเก็บหลักฐานประจำวัน

---

## Visuals (แกลเลอรีบรรยากาศ)

kind : atmosphere = บรรยากาศร้าน · location = สถานที่ · art = อาร์ต/KV · other = อื่น ๆ

atmosphere-floor : บรรยากาศร้าน (placeholder)
atmosphere-photo-zone : โซนถ่ายรูป (placeholder)
location-exterior : หน้าตาสถานที่ (placeholder)
art-sample : Sample art จาก Mild-R KV

---

## Highlights (จุดเด่นสั้น ๆ)

- ซิกเนเจอร์ดริ้งก์ธีมหัวใจ · รักษาหัวใจ
- โซนถ่ายรูปพร็อพบรรยากาศนักสืบ
- Goods ชิ้นพิเศษเฉพาะช่วงอีเวนต์

---

## เมนูซิกเนเจอร์ (Exhibit A)

Heart Cure Latte / ลาเต้น้ำตาฮันนี่
  ซิกเนเจอร์โทนกุหลาบหม่น — รายละเอียดรสชาติจะถูกเปิดเผยใกล้เปิดงาน
  ราคา : CLASSIFIED
Pulse Soda / พัลส์โซดา
  เครื่องดื่มซ่าเบาๆ จังหวะหัวใจใต้แสงไฟคาเฟ่
  ราคา : CLASSIFIED
Honey Pulse Parfait / ฮันนี่พัลส์พาเฟต์
  ของหวานโทนครีมหม่น ถ่ายรูปแล้วเหมือนหลักฐานชิ้นสวย
  ราคา : CLASSIFIED

  → priceLabel ใส่ราคาจริง เช่น ฿120 หรือ TBA / CLASSIFIED ถ้ายังไม่ประกาศ

---

## เมนูร้าน (Exhibit B · เปิดแฟ้ม)

otherMenu ใน JSON · UI เป็นแฟ้มคดี / เปิดเมนู
  แอนิเมชันพลิกหน้าเดียวกันทั้งมือถือและเว็บ (rotateY รอบสัน)
  หน้าปกเว็บ: ซ้ายโล่ง · ขวาแปะชื่อร้าน (SOCIEFEE × CHOUXSTORY)
  มือถือ: ปกเต็มจอ แล้วพลิกทีละแผ่น
  เว็บ: เปิดแล้วเป็นหน้าคู่ พลิกทีละคู่

title : Venue Menu
titleLocal : เมนูร้าน
note : เมนูปกติของ SOCIEFEE × CHOUXSTORY — นอกเหนือซิกเนเจอร์ Mild-R

1. Drink Menu / เมนูเครื่องดื่ม
   /assets/cafe/other_menu/menu_1.jpg
2. Kitchen Menu / เมนูครัว
   /assets/cafe/other_menu/menu_2.jpg
3. Shio Pan / ชิโอะปัง
   /assets/cafe/other_menu/menu_3.jpg
4. Shio-pan Ham-Cheese / ชิโอะปังแฮมชีส
   /assets/cafe/other_menu/menu_4.jpg
5. Shokupan Ham & Cheese / โชคุปังแฮมชีส
   /assets/cafe/other_menu/menu_5.jpg
6. Main Menu / เมนูจานหลัก
   /assets/cafe/other_menu/menu_6.jpg

---

## ของที่ระลึก (Goods)

Acrylic Stand / อะคริลิกสแตนด์
  วัตถุพยานสะสมธีมคาเฟ่ — รายการจริงประกาศก่อนขาย
Photo Card Set / ชุดโฟโต้การ์ด
  ชุดรูปที่ระลึกสำหรับฮันนี่ที่ร่วมเปิดเคส

---

## เนื้อหา / ปุ่ม / Disclaimer

body :
Honey Pulse Cafe คือโปรเจกต์คาเฟ่ที่แฟนคลับ Honeycomb จัดทำเองภายใต้ธีม Mild-R — บรรยากาศนักสืบในห้องเคส แต่ยังคงหัวใจของฮันนี่ไว้
เคสถูกกำหนดเปิดวันที่ 2026 · 11 · 29 เวลา 10:00–18:00 ที่ SOCIEFEE × CHOUXSTORY (MRT หัวลำโพง Exit 2) · ติดตามประกาศเพิ่มเติมได้ที่ @Mild_Honeycomb
  → ย่อหน้าเล่าเรื่องคาเฟ่ด้านล่างหน้า

cta : ติดตามข่าวคาเฟ่บน X
url : https://x.com/Mild_Honeycomb
  → ปุ่มลิงก์ออกไปโซเชียล / ฟอร์ม / แผนที่

disclaimer : คาเฟ่และเว็บโปรโมทนี้เป็นงานแฟนเมดที่แฟนคลับจัดทำเอง — ไม่ใช่ประกาศทางการของ Mild-R / เอเจนซี · รายละเอียดอีเวนต์อาจเปลี่ยน · รูปบางส่วนเป็น placeholder / sample art
  → ข้อความด้านล่างสุดของหน้า

---

## Visibility (เปิด/ปิดส่วน · Supabase)

ตาราง: `mild_r.cafe_section_visibility` · view: `public.mild_r_cafe_section_visibility`
หน้า settings: `/cafe/settings` (noindex) · รหัสใน env `CAFE_SETTINGS_PASSWORD` (ค่าเริ่มต้น MILDRCAFE)
หน้า secret: `/cafe/secret` · ใส่รหัสแล้วเข้า full reveal ได้เลย · ไม่กระทบ visibility จริง
  (`/cafe/lab` redirect ไป `/cafe/secret`)
ส่วนที่ปิด → โชว์ TOP SECRET บน `/cafe` · ปิด `mainSiteLink` → ซ่อนลิงก์ 「เว็บหลัก →」ใน header

section keys:
  mainSiteLink · dispatch · plates · daySchedule · highlights · signatureMenu · venueMenu · goods · closing
