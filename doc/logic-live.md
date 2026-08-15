# Live schedule display logic

1. ใช้ `scheduled_start_first` เป็นเวลาตั้งต้นของตาราง

2. ถ้า `scheduled_start_first` ≠ `scheduled_start`  
   แสดงการเปลี่ยนเวลา: ~~เวลาเก่า~~ → เวลาใหม่

3. ช่องตัวเอง — สีเดียวกันทั้งใบ + Badge **Mild-R** หลังวันที่

3.1 ตารางไลฟ์รายสัปดาห์ — badge ช่องอยู่หลังเลขวันที่

3.1.1 ไม่ใช่ช่องตัวเอง → แสดง `ไปช่อง {source_title}` (โทนฟ้า/สเลท แยกจาก rose / copper)

3.2 Collab → Badge **Collab** บนการ์ดสล็อต · ใน modal รวมแถว meta บน (วันที่ / Mild-R / Collab / platform / ไปช่อง)

4. ตาราง / ปฏิทินเริ่มสัปดาห์ที่ **วันอาทิตย์** (อา–ส)

5. Live Detail Modal — บล็อก “ตารางเวลา” โล่ง อ่านง่าย
3.1 ตารางไลฟ์รายสัปดาห์ + ปฏิทินรายเดือน — badge ช่องอยู่หลังเลขวันที่ (ไม่โชว์ใต้สล็อตในช่องวัน)  
    ปฏิทินรายเดือน: ชื่อไลฟ์ขึ้นครบ (ขึ้นบรรทัดได้) · Collab ข้างเวลา
5.1 **Scheduled** — แบบตาราง (ขีดฆ่า→ใหม่ถ้าเลื่อน)

5.2 **Start Live** + **End Live** — บรรทัดเดียวกัน คนละคอลัมน์  
3.1.1 ไม่ใช่ช่องตัวเอง → แสดง `ไปช่อง {source_title}` (โทนฟ้า)



3.2 Collab → Badge **Collab** (โทน copper) บนการ์ดสล็อต  

    ใน modal แถว meta เรียง: **วันที่ → YouTube → Mild-R/ไปช่อง → Collab ท้ายสุด**  

    แต่ละ badge มีสีต่างกัน:  

    วันที่ = blush · YouTube = แดงอมชมพู · Mild-R = rose · ไปช่อง = ฟ้า · Collab = copper
5.4 ไม่โชว์ยอดวิวใน modal · สถานะอยู่บนปก

6. สถานะ **cancelled**  
4. ตาราง / ปฏิทินเริ่มสัปดาห์ที่ **วันอาทิตย์** (อา–ส)  
    ลิสต์ใต้ปฏิทินรายเดือน = ทั้งสัปดาห์ของวันที่เลือก + ปกไลฟ์ + แยกตามวัน  
    วันว่างโชว์ badge **Offline** (โทนเขียวมิ้นต์) ถึงสิ้นสัปดาห์ของไลฟ์ล่าสุดในข้อมูล — วันถัดไปไม่ใส่ offline
   ช่วง 0–3 ชม. หลังนัดแล้วยังไม่เริ่ม = ยังเป็น `upcoming`

7. ปกไลฟ์ (thumbnail)

7.1 เก็บทุกเวอร์ชันใน Storage `live-thumbs` + ตาราง `live_stream_thumbnails`

7.2 ขณะ `upcoming` / `live` — ปก YouTube เปลี่ยน → เพิ่มเวอร์ชันใหม่ (ไม่ทับของเก่า)

7.3 `ended` / `cancelled` — ล็อกประวัติ (ถ้ายังไม่มีเลย ลองเก็บครั้งสุดท้ายได้)

7.4 UI: `thumbnail_cached_url` / Storage ก่อน → fallback YouTube  
    Modal ที่มีหลายปก → gallery ประวัติปก

8. Manual preview (mock จาก JSON)

8.1 เก็บเฉพาะฟิลด์จำเป็น · `url = null` · `video_id = manual-…` · `metadata.preview = true`

8.2 ส่ง JSON ใหม่ → **ทับเฉพาะวัน Bangkok ที่อยู่ใน payload** (ลบ mock เดิมของวันนั้นแล้วใส่ชุดใหม่) · วันอื่นไม่แตะ  
    ถ้าวันนั้นยังไม่มี mock → เพิ่มตามเดิม  
    ถ้ามีไลฟ์จริงจับคู่ได้แล้ว → ไม่สร้าง mock ซ้ำ

8.3 เมื่อ sync YouTube ได้ไลฟ์จริงที่จับคู่ mock → **ใช้แถวจริง แล้วลบ mock**  
    เงื่อนไขจับคู่ (เรียงลำดับ):  
    1) วันเดียวกัน (Bangkok) + ช่องตรงกัน (own↔Mild-R หรือ `channel_id` เดียวกัน) + `|Δscheduled| ≤ 3 ชม.` (เลือกตัวใกล้สุด)  
    2) fallback (เฉพาะ mock): ช่องตรงกัน + เวลา mock ทับช่วงไลฟ์จริง (`actual_start`…`actual_end` หรือนัด ±3 ชม.) — ไม่บังคับวันเดียวกัน  
    Auto tracker / backfill / `purge:preview-mocks` ใช้กติกาเดียวกันหลัง upsert

8.5 ไลฟ์ **Member**  
    - มี `url` → ดึงจาก Data API (ชื่อ · ปก · เวลา · ช่อง · สถิติ) · `video_id` จริง + `metadata.member = true` · ทับแถวเดิมถ้าส่งลิงก์ซ้ำ  
    - ไม่มี `url` → mock เหมือน 8.1 แต่ `metadata.member = true` (จองตารางก่อน) · พอมีลิงก์ทีหลัง / sync จับคู่ได้ → ลบ mock ตาม 8.3  
    UI แสดง badge **Member** · `scheduled_*` snap ครึ่งชั่วโมง เมื่อมาจากลิงก์ YouTube
