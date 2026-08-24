# Cafe Event · Webtoon / Manhwa scroll

หน้าอ่านการ์ตูนแนวนอนเลื่อนลง (เว็บตูน) ภายใต้คาเฟ่

## Route

- URL: `/cafe/event`
- เข้าจาก `/cafe` (ปุ่ม「อ่านแฟ้มคดี」+ nav **Story**)
- ข้าม cafe splash หลัก · มี **preload overlay ของหน้า event** เอง (รอรูปแผ่น / timeout)

## Content

| Piece | Path |
|---|---|
| JSON | `src/data/mild-r/cafe-event.json` |
| Types | `CafeEventPage` / `CafeEventPanel` in `src/types/vtuber.ts` |
| UI | `src/components/cafe/CafeEventComic.tsx` (GSAP ScrollTrigger) |
| Art | `public/assets/cafe/event/` |

## Behavior

- คอลัมน์แคบ mobile-first (อ่านแนวเว็บตูนบนเดสก์ท็อปด้วย)
- แต่ละแผ่นสูง ~viewport · **pin ค้างกลางจอ** จนคำบรรยายครบ แล้วค่อยปล่อยสกอลล์
- **คำบรรยายกลางภาพ** (`panels[].lines` ≈ 5–6 ประโยค) ลอยขึ้นทีละบรรทัดตามสกอลล์
- Caption EN/TH ใต้แผ่น (หัวเรื่องแผ่น)
- รูปยังไม่มี → Panel TBA (ใส่ไฟล์ตามชื่อใน JSON)

## Mock panels (scaffold)

1. Cover · Crime Scene  
2. Caution Tape  
3. Evidence Board  
4. Closing · To be continued  

แก้ข้อความ / เพิ่มแผ่นได้ที่ `cafe-event.json` โดยไม่แตะโค้ด UI
