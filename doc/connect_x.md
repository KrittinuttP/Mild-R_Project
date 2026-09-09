# X Feed Sync (Supabase)

Blueprint สำหรับดึงโพสต์ X (Twitter) ของ Mild-R ผ่าน **twitterapi.io** → เก็บใน schema `mild_r` → ให้ Next.js อ่านจาก DB อย่างเดียว  
UI contract แยกอยู่ที่ [`feed-x.md`](./feed-x.md)

## Architecture

| Layer | Where | Role |
|-------|--------|------|
| UI | Next.js (Vercel) | `loadXPosts()` → `public.mild_r_x_posts` (filter ใน loader) |
| Table | `mild_r.x_posts` | source of truth |
| Jobs | Edge Function `x-feed-sync` | fetch twitterapi.io + upsert |
| Cron | `pg_cron` + `pg_net` | incremental ทุก 3 วัน |
| Seed | `action=backfill` ครั้งเดียว | เติมคลังเริ่มต้น ~60 โพสต์ |

```
twitterapi.io  →  Edge Function  →  mild_r.x_posts
                                         ↓
                               Next.js (anon) อ่าน view
```

เว็บ / ISR **ห้าม** ยิง twitterapi.io โดยตรง

---

## Locked parameters (เฟสแรก)

| Key | Value |
|-----|--------|
| Account | `userName=MildRWorldEnd` (หรือ `userId` เมื่อ resolve แล้ว — เสถียรกว่า) |
| Endpoint | `GET https://api.twitterapi.io/twitter/user/last_tweets` |
| Auth | Header `X-API-Key` |
| Replies | `includeReplies=false` |
| Page size | ≤20 ต่อหน้า (API ไม่มี `limit`) |
| **Seed / backfill** | **60 โพสต์ = `max_pages=3`** · รันครั้งเดียวตอนตั้งต้น |
| **Cron** | ทุก **3 วัน** |
| **Incremental** | ไล่หน้าจากล่าสุด **จนชน `tweet_id` ที่มีใน DB** · เพดาน **`max_pages=3`** |
| Persist | เก็บครบ `tweet` / `quote` / `retweet` |
| Write | `upsert` ตาม `tweet_id` (ของใหม่ insert · ของเก่าอัปสถิติได้) |
| UI default | โชว์เฉพาะ `tweet` + `quote` (ดู `feed-x.md`) |

### Quota (twitterapi.io)

- **15 credits** ต่อทวีตที่ API **คืนมา** (ไม่ใช่ต่อแถวที่ insert)
- หน้าเต็ม ~20 → **~300 credits**
- Seed 60 → **~900 credits**
- Cron ส่วนใหญ่จบที่ 1 หน้า; กรณีตามของใหม่สูงสุด 3 หน้า → ≤ **~900 credits** / รอบ
- ขั้นต่ำต่อ call: 15 credits ถ้าคืน 0–1 ทวีต  
  ดู [pricing](https://twitterapi.io/pricing)

---

## Sync modes

### A) `backfill` — ตั้งต้นครั้งเดียว

1. `cursor=""` แล้วไล่หน้า
2. หยุดเมื่อเก็บครบ ~60 หรือ `max_pages=3` หรือ `has_next_page=false`
3. map ทุกแถว → classify → upsert ทั้งก้อน
4. **ไม่** ให้ cron เรียกโหมดนี้

### B) `incremental` — cron ทุก 3 วัน

1. ดึงหน้า 1 → upsert ทั้งหน้า
2. ถ้ายังมี `tweet_id` ใหม่ → ดึงหน้าถัดไป
3. หยุดเมื่อ:
   - เจอโซนซ้ำกับ DB (เช่น ทั้งหน้าเป็น id ที่มีอยู่แล้ว หรือจากท้ายหน้าขึ้นมาเป็นของเก่าติดกัน) **หรือ**
   - ถึง **`max_pages=3`** **หรือ**
   - `has_next_page=false`
4. แถวที่ซ้ำยัง upsert ได้เพื่ออัป `likes_count` / `retweets_count`

### Classification (ตอน parse)

| สภาพ | เงื่อนไข (twitterapi.io Tweet) | `post_type` |
|------|--------------------------------|-------------|
| Retweet | `retweeted_tweet != null` | `retweet` (เก็บ) |
| Quote | `quoted_tweet != null` | `quote` |
| Tweet | นอกนั้น | `tweet` |

อย่าทิ้ง retweet ตอน sync — UI เป็นคนกรอง

---

## 1) Database

Migration: `supabase/migrations/20260909160000_mild_r_x_posts.sql`

```sql
create schema if not exists mild_r;

create table if not exists mild_r.x_posts (
  tweet_id text primary key,
  post_type text not null check (post_type in ('tweet', 'quote', 'retweet')),
  author_name text,
  author_username text,
  author_avatar text,
  text text,
  media_urls text[] default '{}',
  posted_at timestamptz,
  likes_count integer,
  retweets_count integer,
  is_quote boolean not null default false,
  quoted_tweet jsonb,           -- null ถ้าไม่ใช่ quote; shape ตาม feed-x.md
  original_url text,
  raw jsonb,                    -- optional: payload ย่อจาก API สำหรับ debug
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists x_posts_posted_at_idx
  on mild_r.x_posts (posted_at desc nulls last);

create index if not exists x_posts_post_type_idx
  on mild_r.x_posts (post_type);

-- RLS: public SELECT · writes via service_role
-- view: public.mild_r_x_posts (security_invoker) สำหรับ PostgREST จาก Vercel
```

รูปแบบสิทธิ์ให้สอดคล้อง `mild_r.live_streams` (ดู migration live streams)

---

## 2) Secrets

**Supabase Edge Function secrets**

- `TWITTERAPI_IO_KEY`
- `X_USER_NAME=MildRWorldEnd` (หรือ `X_USER_ID=...`)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (มักมีใน runtime)

**Vercel / `.env.local` (frontend อ่าน DB อย่างเดียว)**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**โลคัล (ทดสอบ / ไม่คอมมิต `.env`)**

- `TWITTERAPI_IO_KEY` ใน `.env` — ดู `.env.example`  
  อย่าใส่คีย์จริงใน `.env.example` หรือในแชท

---

## 3) Edge Function

Path: `supabase/functions/x-feed-sync/index.ts`

Phases:

1. **Fetch** — `fetch()` → twitterapi.io `last_tweets` + cursor pagination  
2. **Parse** — classify `tweet` / `quote` / `retweet` · map ฟิลด์ให้ตรงตาราง / `feed-x.md`  
3. **Store** — batch `upsert` on `tweet_id`

Actions (JSON body หรือ query):

| Action | Behavior |
|--------|----------|
| `backfill` | `max_pages=3` (~60) |
| `incremental` | early-stop on overlap · `max_pages=3` |

ตัวอย่างทดสอบ:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/x-feed-sync" \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"backfill"}'
```

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/x-feed-sync" \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"incremental"}'
```

Deploy:

```bash
npx supabase functions deploy x-feed-sync --project-ref YOUR_PROJECT_REF
npx supabase secrets set TWITTERAPI_IO_KEY=... X_USER_NAME=MildRWorldEnd --project-ref YOUR_PROJECT_REF
```

---

## 4) Cron

ไฟล์: `supabase/cron/x-feed-sync.sql` (template)  
ตั้งจริง: `npm run cron:x` → `scripts/setup-x-feed-cron.ts`

- Job: `run-x-feed-incremental` · `{"action":"incremental"}`
- ตารางเวลา: **`0 17 */3 * *` UTC = 00:00 Asia/Bangkok ทุก 3 วันตามปฏิทิน**
- อย่า schedule `backfill`

---

## 5) Frontend loader

- Types: `src/types/x-post.ts`
- Loader: `src/lib/x-posts.ts` → `loadXPosts({ limit, feedOnly })`
- UI component ยังไม่ผูก — ดู [`feed-x.md`](./feed-x.md)

---

## 6) Ops checklist

- [x] Migration `mild_r.x_posts` + RLS + `public.mild_r_x_posts` (ใน repo)
- [x] Edge Function `x-feed-sync` (`backfill` / `incremental`)
- [x] Cron SQL template
- [x] `loadXPosts` loader
- [x] Local seed script `scripts/backfill-x-posts.ts` (`npm run backfill:x`)
- [x] รัน migration บน Supabase + backfill ~60 (ครั้งแรก)
- [x] Supabase secrets (`TWITTERAPI_IO_KEY`, `X_USER_NAME`)
- [x] `npx supabase functions deploy x-feed-sync`
- [x] เปิด cron (`npm run cron:x` · 00:00 BKK ทุก 3 วัน)
- [x] UI ฟีดแท็บโพส(6)/รี(5) · compact + lightbox ใน Connect (`XFeed` + `loadXFeedTabs`)

หมายเหตุ free tier: twitterapi.io จำกัด **1 request / 5 วินาที** — สคริปต์และ Edge ใส่ delay ระหว่างหน้าแล้ว

---

## Out of scope (เฟสแรก)

- โชว์ retweet ใน UI
- Sync ถี่กว่าทุก 3 วัน / realtime stream
- ให้ Next.js หรือ browser เรียก twitterapi.io โดยตรง
- Backfill ทั้งประวัติโดยไม่มีเพดานหน้า
