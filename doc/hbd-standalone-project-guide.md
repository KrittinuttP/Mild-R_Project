# Mild-R HBD Standalone Project — Full Source Code & Setup Guide

เอกสารฉบับนี้รวบรวม **Source Code ฉบับสมบูรณ์** และขั้นตอนการสร้างโปรเจกต์ใหม่สำหรับระบบ **Mild-R HBD 2026** แยกออกจากโปรเจกต์หลัก โดยในโปรเจกต์นี้จะมีเฉพาะ:
1. **หน้าแสดงการ์ดคำอวยพร (Wishes Gallery & Scrollytelling)** (`/`)
2. **หน้าส่งการ์ดอวยพร (Upload Form + Live Preview)** (`/upload`)
3. **หน้าโต๊ะตรวจและอนุมัติการ์ด (Admin Approve / Reject)** (`/admin`)
4. **Header & Footer มินิมอล** (มีเฉพาะปุ่มสลับหน้า, ปุ่ม Admin และ Credit แฟนคลับ)

---

## สารบัญ
1. [ขั้นตอนการเริ่มต้นสร้างโปรเจกต์ (Quickstart)](#1-ขั้นตอนการเริ่มต้นสร้างโปรเจกต์-quickstart)
2. [การตั้งค่า Supabase Database & Storage](#2-การตั้งค่า-supabase-database--storage)
3. [การตั้งค่า Environment Variables (`.env.local`)](#3-การตั้งค่า-environment-variables-envlocal)
4. [โครงสร้างโฟลเดอร์โปรเจกต์ใหม่](#4-โครงสร้างโฟลเดอร์โปรเจกต์ใหม่)
5. [Source Code: Types & Data](#5-source-code-types--data)
6. [Source Code: Lib & Utilities](#6-source-code-lib--utilities)
7. [Source Code: UI Components & Layout](#7-source-code-ui-components--layout)
8. [Source Code: Pages (App Router)](#8-source-code-pages-app-router)
9. [Source Code: Backend API Routes](#9-source-code-backend-api-routes)

---

## 1. ขั้นตอนการเริ่มต้นสร้างโปรเจกต์ (Quickstart)

เปิด Terminal แล้วรันคำสั่งต่อไปนี้เพื่อสร้างโปรเจกต์ Next.js ใหม่:

```bash
npx create-next-app@latest mild-r-hbd --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd mild-r-hbd
```

### ติดตั้ง Packages ที่จำเป็น
```bash
npm install @supabase/supabase-js gsap @gsap/react lucide-react clsx tailwind-merge class-variance-authority
```

---

## 2. การตั้งค่า Supabase Database & Storage

คัดลอก SQL ด้านล่างนี้ไปรันใน **Supabase SQL Editor** ของโปรเจกต์ Supabase:

```sql
-- 1. สร้าง Schema สำหรับ Mild-R (ถ้ายังไม่มี)
create schema if not exists mild_r;

-- 2. สร้างตารางเก็บคำอวยพร
create table if not exists mild_r.hbd_submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  message text,
  contact_channel text not null check (contact_channel in ('x', 'discord')),
  contact_handle text not null,
  card_path text not null,
  card_url text not null,
  avatar_path text,
  avatar_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  approved_at timestamptz,
  reviewed_at timestamptz
);

create index if not exists hbd_submissions_status_created_idx
  on mild_r.hbd_submissions (status, created_at desc);

-- 3. เปิด RLS
alter table mild_r.hbd_submissions enable row level security;

-- 4. Storage Bucket สำหรับเก็บรูปการ์ด
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hbd-uploads',
  'hbd-uploads',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage Policies
drop policy if exists "Public read hbd-uploads" on storage.objects;
create policy "Public read hbd-uploads"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'hbd-uploads');

drop policy if exists "Service role write hbd-uploads" on storage.objects;
create policy "Service role write hbd-uploads"
  on storage.objects for all to service_role
  using (bucket_id = 'hbd-uploads')
  with check (bucket_id = 'hbd-uploads');

-- 5. Public View สำหรับแสดงเฉพาะการ์ดที่ผ่านการอนุมัติ (ซ่อนช่องทางติดต่อ)
drop view if exists public.mild_r_hbd_wishes_public;
create or replace view public.mild_r_hbd_wishes_public
with (security_invoker = false)
as
select
  id,
  display_name,
  message,
  card_url,
  avatar_url,
  status,
  created_at,
  approved_at
from mild_r.hbd_submissions
where status = 'approved';

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on public.mild_r_hbd_wishes_public to anon, authenticated;
grant all on public.mild_r_hbd_wishes_public to service_role;
grant all on mild_r.hbd_submissions to service_role;

notify pgrst, 'reload schema';
```

---

## 3. การตั้งค่า Environment Variables (`.env.local`)

สร้างไฟล์ `.env.local` ที่ Root ของโปรเจกต์:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# รหัสผ่านสำหรับเข้าหน้า /admin ตรวจและอนุมัติการ์ด
SITE_ADMIN_PASSWORD=MILDRPROJECT
SITE_ADMIN_SECRET=your-random-secret-string-here
```

---

## 4. โครงสร้างโฟลเดอร์โปรเจกต์ใหม่

```text
mild-r-hbd/
├── public/
│   └── assets/
│       └── hbd/
│           ├── default-avatar.png
│           └── template/
│               └── mild-r-hbd-card-template.png
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   └── unlock/route.ts
│   │   │   └── hbd/
│   │   │       ├── admin/
│   │   │       │   └── submissions/
│   │   │       │       ├── route.ts
│   │   │       │       └── [id]/route.ts
│   │   │       └── submit/route.ts
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   ├── upload/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminHbdClient.tsx
│   │   ├── hbd/
│   │   │   ├── HbdScroll.tsx
│   │   │   └── HbdUploadClient.tsx
│   │   ├── layout/
│   │   │   ├── SimpleHbdFooter.tsx
│   │   │   └── SimpleHbdHeader.tsx
│   │   └── media/
│   │       ├── MediaProtection.tsx
│   │       └── ProtectedImage.tsx
│   ├── data/
│   │   └── hbd.json
│   ├── lib/
│   │   ├── gsap.ts
│   │   ├── hbd-submissions-store.ts
│   │   ├── hbd-upload.ts
│   │   ├── site-admin-auth.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   └── types/
│       └── hbd.ts
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 5. Source Code: Types & Data

### `src/types/hbd.ts`
```typescript
export interface HbdWish {
  id: string;
  from: string;
  message: string;
  image?: string;
  alt?: string;
  avatar?: string;
  fromUpload?: boolean;
}

export interface HbdPageData {
  title: string;
  titleLocal?: string;
  subtitle: string;
  year?: number;
  occasionLabel?: string;
  closingMessage?: string;
  wishes: HbdWish[];
}
```

### `src/data/hbd.json`
```json
{
  "title": "Happy Birthday",
  "titleLocal": "สุขสันต์วันเกิด Mild-R",
  "subtitle": "รวมคำอวยพรจากฮันนี่ — เลื่อนลงเพื่อเปิดการ์ดทีละใบ",
  "year": 2026,
  "occasionLabel": "Birthday",
  "closingMessage": "รักนะมายด์อาร์ — ฮันนี่จะรักษาหัวใจเธอต่อไปทุกปี",
  "wishes": []
}
```

---

## 6. Source Code: Lib & Utilities

### `src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `src/lib/gsap.ts`
```typescript
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let registered = false;

export function registerGsapPlugins() {
  if (typeof window === "undefined" || registered) return;
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  registered = true;
}

export { gsap, ScrollTrigger, useGSAP };
```

### `src/lib/supabase.ts`
```typescript
import { createClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public credentials missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role key missing");
  return createClient(url, key, { auth: { persistSession: false } });
}
```

### `src/lib/hbd-upload.ts`
```typescript
export const HBD_CARD_TEMPLATE = {
  path: "/assets/hbd/template/mild-r-hbd-card-template.png",
  filename: "mild-r-hbd-card-template.png",
  suggestedWidth: 1080,
  suggestedHeight: 1350,
  maxBytes: 5 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const HBD_AVATAR_DEFAULT = "/assets/hbd/default-avatar.png";

export const HBD_AVATAR_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export type HbdContactChannel = "x" | "discord";

export type HbdUploadDraft = {
  displayName: string;
  message: string;
  contactChannel: HbdContactChannel;
  contactHandle: string;
  cardFileName?: string;
  cardPreviewUrl?: string;
  avatarFileName?: string;
  avatarPreviewUrl?: string;
};
```

### `src/lib/hbd-submissions-store.ts`
```typescript
import { createAdminClient, createPublicClient, isSupabaseConfigured } from "@/lib/supabase";
import type { HbdContactChannel } from "@/lib/hbd-upload";
import { HBD_AVATAR_DEFAULT } from "@/lib/hbd-upload";
import type { HbdWish } from "@/types/hbd";

export const HBD_STORAGE_BUCKET = "hbd-uploads";
export type HbdSubmissionStatus = "pending" | "approved" | "rejected";

export type HbdSubmissionRow = {
  id: string;
  display_name: string;
  message: string | null;
  contact_channel: HbdContactChannel;
  contact_handle: string;
  card_path: string;
  card_url: string;
  avatar_path: string | null;
  avatar_url: string | null;
  status: HbdSubmissionStatus;
  created_at: string;
  approved_at: string | null;
  reviewed_at: string | null;
};

export function submissionToWish(row: HbdSubmissionRow): HbdWish {
  return {
    id: `upload-${row.id}`,
    from: row.display_name,
    message: row.message?.trim() || "สุขสันต์วันเกิด Mild-R 🎂",
    image: row.card_url,
    alt: `Wish from ${row.display_name}`,
    avatar: row.avatar_url?.trim() || HBD_AVATAR_DEFAULT,
    fromUpload: true,
  };
}

export async function loadApprovedHbdWishes(): Promise<HbdWish[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_hbd_wishes_public")
      .select("id, display_name, message, card_url, avatar_url, status, created_at, approved_at")
      .order("approved_at", { ascending: true });

    if (error || !data) return [];
    return data.map((row: any) =>
      submissionToWish({
        id: String(row.id),
        display_name: String(row.display_name),
        message: row.message ?? null,
        contact_channel: "x",
        contact_handle: "",
        card_path: "",
        card_url: String(row.card_url),
        avatar_path: null,
        avatar_url: row.avatar_url ?? null,
        status: "approved",
        created_at: String(row.created_at),
        approved_at: row.approved_at ?? null,
        reviewed_at: null,
      })
    );
  } catch {
    return [];
  }
}

export async function listAllHbdSubmissions(): Promise<HbdSubmissionRow[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as HbdSubmissionRow[];
}

export async function updateHbdSubmissionStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<boolean> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status,
    reviewed_at: now,
    approved_at: status === "approved" ? now : null,
  };
  const { error } = await supabase.from("mild_r_hbd_submissions").update(updates).eq("id", id);
  return !error;
}
```

### `src/lib/site-admin-auth.ts`
```typescript
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SITE_ADMIN_COOKIE = "mild_r_site_admin";
export const DEFAULT_SITE_ADMIN_PASSWORD = "MILDRPROJECT";

export function getSiteAdminPassword() {
  return process.env.SITE_ADMIN_PASSWORD?.trim() || DEFAULT_SITE_ADMIN_PASSWORD;
}

function signingSecret() {
  return (
    process.env.SITE_ADMIN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    getSiteAdminPassword()
  );
}

function tokenForPassword(password: string) {
  return createHmac("sha256", signingSecret()).update(`site-admin:${password}`).digest("hex");
}

export function verifySiteAdminPassword(input: string) {
  const expected = getSiteAdminPassword();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isSiteAdminUnlocked() {
  const jar = await cookies();
  const value = jar.get(SITE_ADMIN_COOKIE)?.value;
  if (!value) return false;
  const expected = tokenForPassword(getSiteAdminPassword());
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setSiteAdminCookie() {
  const jar = await cookies();
  jar.set(SITE_ADMIN_COOKIE, tokenForPassword(getSiteAdminPassword()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSiteAdminCookie() {
  const jar = await cookies();
  jar.delete(SITE_ADMIN_COOKIE);
}
```

---

## 7. Source Code: UI Components & Layout

### `src/components/layout/SimpleHbdHeader.tsx`
```tsx
import Link from "next/link";
import { Heart, Lock, Sparkles } from "lucide-react";

export function SimpleHbdHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#f3b8c4]/15 bg-[#140a0d]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[#fff5f7] transition hover:opacity-85">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#e85a7a]/20 text-[#e85a7a]">
            <Heart className="size-4 fill-current" />
          </span>
          <span className="font-semibold tracking-wide text-sm sm:text-base">
            Mild-R <span className="text-[#e85a7a]">HBD 2026</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-[#f3b8c4]/80 transition hover:bg-white/5 hover:text-[#fff5f7]"
          >
            คำอวยพร
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#e85a7a] px-3.5 py-1.5 text-xs font-medium text-[#140a0d] shadow-[0_0_15px_rgba(232,90,122,0.35)] transition hover:bg-[#f3b8c4]"
          >
            <Sparkles className="size-3.5" />
            <span>ส่งการ์ด</span>
          </Link>
          <Link
            href="/admin"
            title="Admin Login"
            className="flex size-8 items-center justify-center rounded-xl text-[#f3b8c4]/40 transition hover:bg-white/5 hover:text-[#f3b8c4]"
          >
            <Lock className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
```

### `src/components/layout/SimpleHbdFooter.tsx`
```tsx
import { Heart } from "lucide-react";

export function SimpleHbdFooter() {
  return (
    <footer className="border-t border-[#f3b8c4]/10 bg-[#0e0709] py-8 text-center text-xs text-[#f3b8c4]/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-4">
        <div className="flex items-center gap-1.5 text-[#f3b8c4]/70">
          <span>Made with</span>
          <Heart className="size-3.5 fill-[#e85a7a] text-[#e85a7a]" />
          <span>for Mild-R by Honey Fanclub</span>
        </div>
        <p className="text-[0.7rem] text-[#f3b8c4]/40">
          12.12.2026 · World End / Lumina Project Fan Project
        </p>
      </div>
    </footer>
  );
}
```

### `src/components/media/ProtectedImage.tsx`
```tsx
import type { ComponentPropsWithoutRef } from "react";

type ProtectedImageProps = Omit<ComponentPropsWithoutRef<"img">, "draggable"> & {
  wrapClassName?: string;
};

export function ProtectedImage({ className, wrapClassName, alt, ...props }: ProtectedImageProps) {
  return (
    <span data-protect-media className={wrapClassName ?? "contents"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        draggable={false}
        className={`select-none [-webkit-user-drag:none] ${className ?? ""}`}
        {...props}
      />
    </span>
  );
}
```

### `src/components/media/MediaProtection.tsx`
```tsx
"use client";

import { useEffect } from "react";

export function MediaProtection() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest("img, [data-protect-media]")) {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.closest("img, [data-protect-media]")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  return null;
}
```

---

## 8. Source Code: Pages (App Router)

### `src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { MediaProtection } from "@/components/media/MediaProtection";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mild-R HBD 2026 — รวมคำอวยพรวันเกิด",
  description: "สุขสันต์วันเกิด Mild-R — โครงการรวบรวมคำอวยพรและการ์ดจากฮันนี่ 12.12.2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#140a0d] text-[#fff5f7] antialiased">
        <MediaProtection />
        {children}
      </body>
    </html>
  );
}
```

### `src/app/page.tsx` (Gallery / Scrollytelling)
```tsx
import { SimpleHbdHeader } from "@/components/layout/SimpleHbdHeader";
import { SimpleHbdFooter } from "@/components/layout/SimpleHbdFooter";
import { HbdScroll } from "@/components/hbd/HbdScroll";
import { loadApprovedHbdWishes } from "@/lib/hbd-submissions-store";
import defaultHbdData from "@/data/hbd.json";

export const dynamic = "force-dynamic";

export default async function HbdPage() {
  const approvedWishes = await loadApprovedHbdWishes();
  const hbdData = {
    ...defaultHbdData,
    wishes: approvedWishes.length > 0 ? approvedWishes : defaultHbdData.wishes,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#140a0d]">
      <SimpleHbdHeader />
      <main className="flex-1">
        <HbdScroll hbd={hbdData} />
      </main>
      <SimpleHbdFooter />
    </div>
  );
}
```

### `src/app/upload/page.tsx` (Upload Form)
```tsx
import { SimpleHbdHeader } from "@/components/layout/SimpleHbdHeader";
import { SimpleHbdFooter } from "@/components/layout/SimpleHbdFooter";
import { HbdUploadClient } from "@/components/hbd/HbdUploadClient";

export default function UploadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#140a0d]">
      <SimpleHbdHeader />
      <main className="flex-1 px-4 py-8 sm:py-12">
        <HbdUploadClient />
      </main>
      <SimpleHbdFooter />
    </div>
  );
}
```

### `src/app/admin/page.tsx` (Admin Verification)
```tsx
import { SimpleHbdHeader } from "@/components/layout/SimpleHbdHeader";
import { SimpleHbdFooter } from "@/components/layout/SimpleHbdFooter";
import { AdminHbdClient } from "@/components/admin/AdminHbdClient";

export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0c0709]">
      <SimpleHbdHeader />
      <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <AdminHbdClient />
      </main>
      <SimpleHbdFooter />
    </div>
  );
}
```

---

## 9. Source Code: Backend API Routes

### `src/app/api/admin/unlock/route.ts`
```typescript
import { NextResponse } from "next/server";
import {
  clearSiteAdminCookie,
  isSiteAdminUnlocked,
  setSiteAdminCookie,
  verifySiteAdminPassword,
} from "@/lib/site-admin-auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ unlocked: await isSiteAdminUnlocked() });
}

export async function POST(request: Request) {
  let body: { password?: unknown; action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "lock") {
    await clearSiteAdminCookie();
    return NextResponse.json({ unlocked: false });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!verifySiteAdminPassword(password)) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }

  await setSiteAdminCookie();
  return NextResponse.json({ unlocked: true });
}
```

### `src/app/api/hbd/submit/route.ts`
```typescript
import { NextResponse } from "next/server";
import { HBD_AVATAR_LIMITS, HBD_CARD_TEMPLATE, type HbdContactChannel } from "@/lib/hbd-upload";
import { HBD_STORAGE_BUCKET } from "@/lib/hbd-submissions-store";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "ระบบอัปโหลดยังไม่พร้อม (Supabase)" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const displayName = String(form.get("displayName") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const contactChannel = String(form.get("contactChannel") ?? "").trim() as HbdContactChannel;
  const contactHandle = String(form.get("contactHandle") ?? "").trim();
  const card = form.get("card");
  const avatar = form.get("avatar");

  if (!displayName || !contactHandle || !(card instanceof File) || card.size === 0) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลและอัปโหลดรูปการ์ดให้ครบถ้วน" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE.has(card.type) || card.size > HBD_CARD_TEMPLATE.maxBytes) {
    return NextResponse.json({ error: "ไฟล์การ์ดต้องเป็น JPEG/PNG/WebP ขนาดไม่เกิน 5 MB" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const id = crypto.randomUUID();
    const cardExt = extensionForMime(card.type);
    const cardPath = `${id}/card.${cardExt}`;
    const cardBytes = Buffer.from(await card.arrayBuffer());

    const { error: cardUploadErr } = await supabase.storage
      .from(HBD_STORAGE_BUCKET)
      .upload(cardPath, cardBytes, { contentType: card.type, upsert: true });

    if (cardUploadErr) {
      return NextResponse.json({ error: "อัปโหลดรูปการ์ดไม่สำเร็จ" }, { status: 500 });
    }

    const { data: cardPub } = supabase.storage.from(HBD_STORAGE_BUCKET).getPublicUrl(cardPath);
    let avatarPath: string | null = null;
    let avatarUrl: string | null = null;

    if (avatar instanceof File && avatar.size > 0 && ALLOWED_IMAGE.has(avatar.type)) {
      const avatarExt = extensionForMime(avatar.type);
      avatarPath = `${id}/avatar.${avatarExt}`;
      const avatarBytes = Buffer.from(await avatar.arrayBuffer());
      const { error: avErr } = await supabase.storage
        .from(HBD_STORAGE_BUCKET)
        .upload(avatarPath, avatarBytes, { contentType: avatar.type, upsert: true });

      if (!avErr) {
        const { data: avPub } = supabase.storage.from(HBD_STORAGE_BUCKET).getPublicUrl(avatarPath);
        avatarUrl = avPub.publicUrl;
      }
    }

    const { error: insertErr } = await supabase.from("mild_r_hbd_submissions").insert({
      id,
      display_name: displayName,
      message: message || null,
      contact_channel: contactChannel,
      contact_handle: contactHandle,
      card_path: cardPath,
      card_url: cardPub.publicUrl,
      avatar_path: avatarPath,
      avatar_url: avatarUrl,
      status: "pending",
    });

    if (insertErr) {
      return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
```

### `src/app/api/hbd/admin/submissions/route.ts`
```typescript
import { NextResponse } from "next/server";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { listAllHbdSubmissions } from "@/lib/hbd-submissions-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await listAllHbdSubmissions();
  return NextResponse.json({ submissions });
}
```

### `src/app/api/hbd/admin/submissions/[id]/route.ts`
```typescript
import { NextResponse } from "next/server";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { updateHbdSubmissionStatus } from "@/lib/hbd-submissions-store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ok = await updateHbdSubmissionStatus(id, body.status);
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, status: body.status });
}
```

---

## สรุปความพร้อมใช้งาน

ไฟล์เอกสารนี้มีโค้ดครบถ้วนตั้งแต่ **Database Schema, Storage, API Routes, UI Components จนถึง Pages** สามารถคัดลอกไฟล์ทั้งหมดไปสร้างโปรเจกต์ Next.js เดี่ยวใหม่ได้ทันทีโดยไม่ต้องพึ่งพาโมดูลอื่นๆ ของเว็บหลักครับ
