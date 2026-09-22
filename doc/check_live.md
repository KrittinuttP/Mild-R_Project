# 🎯 YouTube Live Notification (Discord)

Fan-facing alerts via `LIVE_DISCORD_WEBHOOK_URL`.

## Alerts

| Event | Title | Color |
|-------|-------|-------|
| ตารางใหม่ | 📅 ประกาศตารางไลฟ์ใหม่ | blue `3447003` |
| เลื่อนเวลา | ⏳ แจ้งการเปลี่ยนแปลงเวลาไลฟ์ | orange `15105570` |
| ~30 นาที | ⏰ เตรียมรับชม · … | gold `15844367` |
| LIVE | 🔴 LIVE NOW · … | red `15158332` |

เนื้อหาแบบกระชับ: ชื่อเรื่อง · ช่อง · เวลา (ถ้ามี) · URL — ไอคอนเฉพาะที่ title


## Flags

`notified_scheduled` · `notified_30min` · `notified_live`

## Performance

1. ตารางใหม่ / เลื่อนเวลา — **0 quota เพิ่ม** (ใช้ผล sync ที่มีอยู่)
2. 30 นาที — DB only
3. LIVE poll — เฉพาะ candidate ในหน้าต่างแคบ
4. ข้าม `manual-%` / cancelled / ไลฟ์ที่เริ่มหรือจบแล้ว
5. `monitor` ว่าง → ไม่ยิง ops Discord

## Setup

```bash
npm run db:migrate:live-notify
npx tsx --env-file=.env scripts/apply-sql.ts supabase/migrations/20260922110000_live_streams_notified_scheduled.sql
npx supabase secrets set LIVE_DISCORD_WEBHOOK_URL=... --project-ref YOUR_REF
npx supabase functions deploy youtube-tracker --project-ref YOUR_REF
npx tsx --env-file=.env scripts/setup-youtube-cron.ts
npm run test:live-discord
```
