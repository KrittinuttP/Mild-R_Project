# YouTube Live Tracker (Supabase)

Blueprint สำหรับ sync ไลฟ์ Mild-R เข้า schema `mild_r` แล้วให้ Next.js บน Vercel อ่านโชว์ที่ `/live`

## Architecture

| Layer | Where | Role |
|-------|--------|------|
| UI | Next.js (Vercel) | `loadLiveStreams()` → `public.mild_r_live_streams` view |
| Table | `mild_r.live_streams` | source of truth (isolated schema) |
| Jobs | Edge Function `youtube-tracker` | poll YouTube + upsert (`views_on_end` เก็บครั้งแรก / อัป `latest_views` อย่างเดียวตอน sync ซ้ำ) |
| Cron | `pg_cron` + `pg_net` | `main` ทุก 30 นาที / `search` ทุก 6 ชม. |
| Backfill | `scripts/backfill-youtube-lives.ts` | กวาดประวัติครั้งเดียว |

## Prompt (Edge Function)

```
Please create a Supabase Edge Function in TypeScript to track YouTube Live Streams.

The system must have 2 main functions that can be triggered by different Cron schedules:

checkMainChannel(): Fetches the latest videos from the main channel's Uploads Playlist (UU...) to save quota, then gets live stream details.

searchRelatedChannels(): Uses YouTube Search API to find 'upcoming' and 'live' streams using the keyword '@MildRWorldEnd'. It must implement an 'Early Return' (Skip Process) if no search results are found to save API quota.

Use native fetch API (Deno compatible). Persist Video ID, Title, Channel, Scheduled Time, Actual Time, URL into mild_r.live_streams.
```

Implemented at: `supabase/functions/youtube-tracker/index.ts`

---

## 1) Database

รันไฟล์:

`supabase/migrations/20260806000000_mild_r_live_streams.sql`

ใน Supabase SQL Editor (หรือ `supabase db push` เมื่อ link โปรเจกต์แล้ว)

ได้:

- schema `mild_r`
- table `mild_r.live_streams` + RLS (public SELECT)
- view `public.mild_r_live_streams` (security_invoker) สำหรับ PostgREST จาก Vercel

---

## 2) Secrets

**Supabase Edge Function secrets**

- `YOUTUBE_API_KEY`
- `SUPABASE_URL` (auto ในส่วนใหญ่)
- `SUPABASE_SERVICE_ROLE_KEY` (auto ในส่วนใหญ่)

**Vercel / `.env.local` (frontend อ่านอย่างเดียว)**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Backfill เท่านั้น**

- `YOUTUBE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 3) Historical backfill (once)

```bash
npm run backfill:youtube
```

กวาด `completed` จากช่องหลัก + keyword `@MildRWorldEnd`

---

## 4) Deploy Edge Function

```bash
npx supabase functions deploy youtube-tracker --project-ref YOUR_PROJECT_REF
npx supabase secrets set YOUTUBE_API_KEY=... --project-ref YOUR_PROJECT_REF
```

ทดสอบ:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/youtube-tracker" \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"main\"}"
```

Actions: `"main"` | `"search"`

### Ops trends (`/live/ops/trends`)

RPC `public.mild_r_live_view_trends(grain, own_only, from, to)` รวม `views_on_end` / `latest_views` / diff / `peak_views_on_end` ตามวัน·เดือน·ปี (Asia/Bangkok) — migration `20260807000000_live_view_trends.sql` + `20260807010000_live_view_trends_peak.sql` (tooltip รายเดือน/ปี โชว์ยอดไลฟ์สูงสุดในช่วง)

### Related channel master (Step 2b)

Playlist poll วนจาก master list ของช่อง Lumina (World End / Muse / First-Myth / Mutelu) — **ไม่รวม Mild-R**

- App data: `src/data/lumina-channels.ts`
- Edge copy: `supabase/functions/youtube-tracker/lumina-master.ts`

ยัง merge ช่องนอกเอเจนซ์ที่เคยเข้า DB เพิ่มเติม (เช่น collab นอก Lumina)

---

## 5) Cron

แก้ placeholder ใน `supabase/cron/youtube-tracker.sql` แล้วรันใน SQL Editor

- Step 1 `main` → `*/30 * * * *`
- Step 2 `search` → `0 */6 * * *`

---

## 6) Frontend

- Loader: `src/lib/live-streams.ts` → `mild_r_live_streams`
- Utils: `src/lib/live-stream-utils.ts`
- UI: `YoutubeLiveArchive` บน `/live`
- Revalidate: 300s

Schedule board จาก JSON ยังคู่กันอยู่ (manual calendar + YouTube archive)

---

## Original SQL sketch

```sql
create table if not exists mild_r.live_streams (
  video_id text primary key,
  channel_name text,
  title text,
  url text,
  scheduled_start timestamp with time zone,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  thumbnail_url text,
  views_on_end integer,
  latest_views integer,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

ดูรายละเอียดเต็มในโฟลเดอร์ `supabase/`.
