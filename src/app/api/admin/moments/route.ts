import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  MomentPhotoError,
  deleteMomentPhoto,
  finalizeMomentPhoto,
  isMomentIncomingPath,
  isMomentPhotoId,
  setMomentPhotoHidden,
} from "@/lib/moment-photos";
import { MOMENT_PHOTO_DEFAULT_CREDIT, MOMENT_PHOTO_LIMITS } from "@/lib/moment-photos-shared";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const MOMENTS_PATH = "/gallery/archive";

async function guard() {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }
  return null;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Single line, trimmed, capped. */
function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Save one uploaded photo. Body: { path, alt, credit }. */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await readJson(request);
  const path = typeof body?.path === "string" ? body.path : "";
  if (!isMomentIncomingPath(path)) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const photo = await finalizeMomentPhoto({
      path,
      alt: cleanText(body?.alt, MOMENT_PHOTO_LIMITS.altMax),
      credit: cleanText(body?.credit, MOMENT_PHOTO_LIMITS.creditMax) || MOMENT_PHOTO_DEFAULT_CREDIT,
    });
    revalidatePath(MOMENTS_PATH);
    return NextResponse.json({ photo });
  } catch (error) {
    if (error instanceof MomentPhotoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[moment_photos] finalize failed", error);
    return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}

/** Hide / show one photo. Body: { id, hidden }. */
export async function PATCH(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!isMomentPhotoId(id) || typeof body?.hidden !== "boolean") {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    await setMomentPhotoHidden(id, body.hidden);
    revalidatePath(MOMENTS_PATH);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[moment_photos] hide failed", id, error);
    return NextResponse.json({ error: "อัปเดตไม่สำเร็จ" }, { status: 500 });
  }
}

/** Delete one photo and its files. Body: { id }. */
export async function DELETE(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!isMomentPhotoId(id)) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    await deleteMomentPhoto(id);
    revalidatePath(MOMENTS_PATH);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[moment_photos] delete failed", id, error);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
