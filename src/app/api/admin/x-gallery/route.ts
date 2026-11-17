import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { setXPostGalleryHidden } from "@/lib/x-gallery";

export const runtime = "nodejs";

const TWEET_ID_RE = /^\d{1,25}$/;

/** Hide / show one X post's photos in Moments. Body: { tweetId, hidden }. */
export async function POST(request: Request) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  let body: { tweetId?: unknown; hidden?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tweetId = typeof body.tweetId === "string" ? body.tweetId.trim() : "";
  if (!TWEET_ID_RE.test(tweetId) || typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await setXPostGalleryHidden(tweetId, body.hidden);
    revalidatePath("/gallery/archive");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[x_gallery] admin update failed", tweetId, error);
    return NextResponse.json({ error: "อัปเดตไม่สำเร็จ" }, { status: 500 });
  }
}
