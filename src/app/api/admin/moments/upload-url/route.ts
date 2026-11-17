import { NextResponse } from "next/server";

import { createMomentUploadUrls } from "@/lib/moment-photos";
import {
  MOMENT_PHOTO_LIMITS,
  isMomentPhotoType,
  type MomentPhotoType,
} from "@/lib/moment-photos-shared";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

/**
 * Signed upload URLs for /admin/moments. Body: { files: [{ type, size }] }.
 * The browser PUTs each original straight into the bucket (no API body limit),
 * then calls POST /api/admin/moments with the returned path.
 */
export async function POST(request: Request) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  let body: { files?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0 || files.length > MOMENT_PHOTO_LIMITS.maxFiles) {
    return NextResponse.json(
      { error: `เลือกรูปได้ครั้งละ 1–${MOMENT_PHOTO_LIMITS.maxFiles} รูป` },
      { status: 400 }
    );
  }
  const types: MomentPhotoType[] = [];
  for (const file of files) {
    const type = String((file as { type?: unknown })?.type ?? "");
    const size = Number((file as { size?: unknown })?.size);
    if (!isMomentPhotoType(type)) {
      return NextResponse.json({ error: "รูปต้องเป็น JPEG · PNG · WebP" }, { status: 400 });
    }
    if (!Number.isInteger(size) || size <= 0 || size > MOMENT_PHOTO_LIMITS.maxBytes) {
      return NextResponse.json({ error: "ไฟล์รูปต้องไม่เกิน 25 MB" }, { status: 400 });
    }
    types.push(type);
  }

  try {
    const uploads = await createMomentUploadUrls(types);
    return NextResponse.json({ uploads });
  } catch (error) {
    console.error("[moment_photos] signed upload url failed", error);
    return NextResponse.json(
      { error: "ยังอัปโหลดไม่ได้ ตรวจว่ารัน npm run db:migrate:moment-photos แล้ว" },
      { status: 503 }
    );
  }
}
