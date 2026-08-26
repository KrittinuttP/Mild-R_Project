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

- เปิดหน้า = **CASE PENDING** + หัวข้อเคส · hint「เลื่อนเพื่อเปิดแฟ้ม」(หายเมื่อเริ่มเลื่อน)
- ไม่แวบข้อความก่อน GSAP
- สไลด์ต่อ → ข้อความโปรล็อกทีละบรรทัด (`prologue.lines`) ถ้ามี
- แต่ละแผ่น: **รูปขึ้นก่อน** → ข้อความตามทีละบรรทัด (pin + scrub)
- คอลัมน์แคบ mobile-first · Caption EN/TH ใต้แผ่น

## Mock panels (scaffold)

1. Cover · Crime Scene  
2. Caution Tape  
3. Evidence Board  
4. Closing · To be continued  

แก้ข้อความ / เพิ่มแผ่นได้ที่ `cafe-event.json` โดยไม่แตะโค้ด UI
