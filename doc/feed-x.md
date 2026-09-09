# X Feed UI (Next.js)

Frontend contract สำหรับแสดงฟีด X จาก **Supabase เท่านั้น**  
Pipeline / sync / quota อยู่ที่ [`connect_x.md`](./connect_x.md)

## Goal

React / Next.js (App Router) + Tailwind  
อ่าน `public.mild_r_x_posts` แล้วเรนเดอร์ในโซน Connect (`#socials`) แบบแท็บ

## Placement

- Homepage → `Socials` → ใต้การ์ดช่องทางหลัก (YT / X)
- Component: `src/components/sections/XFeed.tsx`
- Loader: `loadXFeedTabs()` ใน `src/app/page.tsx` (`revalidate = 300`)

## Tabs

| แท็บ | `post_type` | Limit |
|------|-------------|-------|
| **โพส** | `tweet`, `quote` | 6 |
| **รี** | `retweet` | 5 |

## UI layout

- คอลัมน์ล็อกความกว้าง: `max-w-xl` (~576px) กึ่งกลางใน Connect
- โครงแบบ X timeline: avatar ซ้าย · ชื่อ/@/วันที่ · ข้อความ · รูปใต้ข้อความ
- รูป: กว้างตามคอลัมน์ · `max-h-48` / `sm:max-h-56` · มุมมน
- รูปกดแล้วเปิด `ImageLightbox` กลาง (`src/components/media/ImageLightbox.tsx`)
- กรอบทีละโพสต์ · ปุ่ม「ดูบน X」มุมล่างขวา (pill)
- แถบรวมใต้ลิสต์「เปิดโปรไฟล์บน X」→ โปรไฟล์ (มี hover)
- ไม่ใช้เส้น/พื้นโทนขาว · ใช้ขอบชมพู Mild-R
- ข้อความไม่ออกนอกไซต์ · แท็บ โพส / รี

## Data source

| Do | Don't |
|----|--------|
| `loadXPosts` / `loadXFeedTabs` → Supabase anon | เรียก twitterapi.io จาก browser |
| Nested card จาก `quoted_tweet` (quote หรือต้นฉบับของรี) | พึ่ง `socials.json` เป็นแหล่งฟีด |

## Post object (UI shape)

```json
{
  "tweet_id": "182900000000",
  "post_type": "quote",
  "author_name": "Mild-R",
  "author_username": "MildRWorldEnd",
  "author_avatar": "https://example.com/avatar.jpg",
  "text": "ข้อความที่ศิลปินโพสต์ พร้อม #Hashtag และ https://link.com",
  "media_urls": ["https://example.com/image1.jpg"],
  "posted_at": "2026-09-09T08:32:00Z",
  "likes_count": 15200,
  "retweets_count": 4300,
  "is_quote": true,
  "quoted_tweet": {
    "author_name": "FanclubTH",
    "author_username": "fanclub_th",
    "text": "โปรเจกต์วันเกิดปีนี้...",
    "media_urls": []
  },
  "original_url": "https://x.com/MildRWorldEnd/status/182900000000"
}
```

### Field notes

| Field | Notes |
|-------|--------|
| `post_type` | `tweet` \| `quote` \| `retweet` |
| `quoted_tweet` | nested card สำหรับ quote **และ** ต้นฉบับของ retweet |
| `retweets_count` | จำนวนครั้งที่ถูกรี — ไม่ได้แปลว่าโพสต์นี้เป็นรีทวีต |
| `original_url` | ลิงก์เปิดบน X |

## Loader

- Types: `src/types/x-post.ts`
- `loadXPosts({ limit, types?, feedOnly? })`
- `loadXFeedTabs()` → `{ posts: 6, retweets: 5 }`
- Revalidate หน้า: 300s — ไม่กระทบเครดิต twitterapi.io

## UI expectations

- แท็บ โพส / รี + empty state เมื่อยังไม่มีรีในคลัง
- ลิสต์ compact + รูปย่อ · lightbox ดูรูปใหญ่
- คลิกการ์ดไป `original_url` · คลิกรูปแยกจากลิงก์โพสต์
- likes / retweet counts แบบย่อ

## Related

- Sync & DB: [`connect_x.md`](./connect_x.md)
- Connect hub (ลิงก์โซเชียล): `Socials` / `socials.json`
