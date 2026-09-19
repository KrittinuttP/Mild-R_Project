# Agent Live Schedule

ดึงตารางไลฟ์จากรูป **Live Schedule** บน X → AI แปลงเป็น JSON → ลงปฏิทิน `/live` อัตโนมัติ (reuse `/api/live/manual`)  
เก็บประวัติรูป + สถานะว่า Agent ใช้ไปแล้วหรือยัง เพื่อดูย้อนหลังได้

## สถานะงาน

| ขั้น | สถานะ |
|------|--------|
| Prompt + master roster (`buildLiveAgentPrompt`) | ✅ |
| ตาราง `mild_r.x_live_schedules` | ✅ |
| Upsert จาก X sync / backfill / reprocess | ✅ |
| Backfill script จาก `x_posts` | ✅ |
| Agent Google AI Studio (`GEMINI_API_KEY`) + auto manual API | ✅ |
| ข้ามวันที่มีในปฏิทินแล้ว | ✅ |
| API cron `POST /api/live/agent/run` | ✅ |
| pg_cron setup script | ✅ `npm run cron:live-agent` |
| UI ย้อนหลัง | ⏳ ข้ามไว้ก่อน |
| Production: ตั้ง env + รัน `cron:live-agent` | ⏳ |

## รัน Agent (มือ)

ใช้ **Google AI Studio (`GEMINI_API_KEY`) เท่านั้น** — ไม่ใช้ Vertex (โควตาฟรี)

```bash
# dry-run: เรียก AI แต่ไม่ insert / ไม่อัปเดต status
npm run agent:live-schedule -- --dry-run --limit=1

# process จริง 1 แถว pending ล่าสุด
npm run agent:live-schedule -- --limit=1

# ระบุ tweet
npm run agent:live-schedule -- --tweet-id=YOUR_TWEET_ID
```

หรือยิง API (ต้องมี auth):

```bash
curl -X POST "$SITE/api/live/agent/run" \
  -H "Authorization: Bearer $LIVE_AGENT_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":1}'
```

## Cron (อัตโนมัติ)

1. X sync ต/ศ/อา **00:00 BKK** → upsert รูป Live Schedule เป็น `pending`
2. Agent ต/ศ/อา **00:15 BKK** → กิน `pending` ทีละ 1 แถว

```bash
# ต้องชี้ LIVE_AGENT_API_BASE เป็นโดเมน production (ห้าม localhost)
npm run cron:live-agent
```

Production env ที่ต้องมีบน Next host:

| ตัวแปร | ความหมาย |
|--------|----------|
| `GEMINI_API_KEY` | API key จาก [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | optional, default `gemini-flash-lite-latest` |
| `LIVE_AGENT_CRON_SECRET` | Bearer สำหรับ cron (หรือใช้ service role) |
| `LIVE_AGENT_API_BASE` / `NEXT_PUBLIC_SITE_URL` | URL สาธารณะของเว็บ |
| `SUPABASE_SERVICE_ROLE_KEY` | อ่าน/เขียนตาราง |

## แหล่งรูป

1. X sync → `x_posts` + cache รูป  
2. `ensureXLiveScheduleRow` → `x_live_schedules` (`pending`)  
3. Agent อ่าน `image_url` → prompt + AI Studio Gemini → JSON  
4. ข้ามวันที่มีใน `live_streams` อยู่แล้ว (Asia/Bangkok) → ใส่เฉพาะวันที่ยังว่าง  
5. `POST /api/live/manual` → `status=imported` (หรือ `skipped` ถ้าครบทุกวันแล้ว), `agent_processed_at`

Agent เลือกเฉพาะ `status=pending` เรียง `posted_at` ใหม่สุด — ของเก่าที่ปิดแล้วควรเป็น `skipped` / `imported` เพื่อไม่กินโควตา

## ไฟล์หลัก

| ไฟล์ | บทบาท |
|------|--------|
| `src/lib/live-agent-prompt.ts` | สร้าง prompt + roster |
| `src/lib/live-schedule-agent.ts` | Gemini + day-dedupe + manual + mark status |
| `src/app/api/live/agent/run/route.ts` | HTTP entry สำหรับ cron |
| `src/lib/x-live-schedules.ts` | ensure แถวตาราง |
| `scripts/run-live-schedule-agent.ts` | CLI |
| `scripts/setup-live-agent-cron.ts` | ตั้ง pg_cron |
| `supabase/migrations/20260919180000_x_live_schedules.sql` | Schema |

## ตาราง `mild_r.x_live_schedules`

`tweet_id`, `image_url`, `image_source_url`, `posted_at`, `added_at`, `agent_processed_at`, `status`, `parsed_json`, `error_message`, …
