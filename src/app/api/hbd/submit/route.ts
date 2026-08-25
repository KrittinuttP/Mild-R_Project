import { NextResponse } from "next/server";

import {
  HBD_AVATAR_LIMITS,
  HBD_CARD_TEMPLATE,
  type HbdContactChannel,
} from "@/lib/hbd-upload";
import {
  createHbdSubmission,
  extensionForMime,
  HBD_STORAGE_BUCKET,
} from "@/lib/hbd-submissions-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

function isContactChannel(value: string): value is HbdContactChannel {
  return value === "x" || value === "discord";
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "ระบบอัปโหลดยังไม่พร้อม (Supabase)" },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const displayName = String(form.get("displayName") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const contactChannelRaw = String(form.get("contactChannel") ?? "").trim();
  const contactHandle = String(form.get("contactHandle") ?? "").trim();
  const card = form.get("card");
  const avatar = form.get("avatar");

  if (!displayName) {
    return NextResponse.json({ error: "กรุณากรอกชื่อที่แสดง" }, { status: 400 });
  }
  if (!isContactChannel(contactChannelRaw)) {
    return NextResponse.json({ error: "ช่องทางติดต่อไม่ถูกต้อง" }, { status: 400 });
  }
  if (!contactHandle) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อช่องทางติดต่อ" },
      { status: 400 }
    );
  }
  if (!(card instanceof File) || card.size === 0) {
    return NextResponse.json({ error: "กรุณาอัปโหลดรูปการ์ด" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE.has(card.type)) {
    return NextResponse.json(
      { error: "รูปการ์ดต้องเป็น JPEG / PNG / WebP" },
      { status: 400 }
    );
  }
  if (card.size > HBD_CARD_TEMPLATE.maxBytes) {
    return NextResponse.json(
      { error: "ไฟล์การ์ดใหญ่เกินไป (สูงสุด 5 MB)" },
      { status: 400 }
    );
  }

  if (avatar instanceof File && avatar.size > 0) {
    if (!ALLOWED_IMAGE.has(avatar.type)) {
      return NextResponse.json(
        { error: "Avatar ต้องเป็น JPEG / PNG / WebP" },
        { status: 400 }
      );
    }
    if (avatar.size > HBD_AVATAR_LIMITS.maxBytes) {
      return NextResponse.json(
        { error: "ไฟล์ avatar ใหญ่เกินไป (สูงสุด 2 MB)" },
        { status: 400 }
      );
    }
  }

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const cardExt = extensionForMime(card.type);
  const cardPath = `cards/${id}.${cardExt}`;

  const cardBuffer = Buffer.from(await card.arrayBuffer());
  const { error: cardUploadError } = await supabase.storage
    .from(HBD_STORAGE_BUCKET)
    .upload(cardPath, cardBuffer, {
      contentType: card.type,
      upsert: false,
    });

  if (cardUploadError) {
    return NextResponse.json(
      { error: `อัปโหลดการ์ดไม่สำเร็จ: ${cardUploadError.message}` },
      { status: 500 }
    );
  }

  const { data: cardPublic } = supabase.storage
    .from(HBD_STORAGE_BUCKET)
    .getPublicUrl(cardPath);

  let avatarPath: string | null = null;
  let avatarUrl: string | null = null;

  if (avatar instanceof File && avatar.size > 0) {
    const avatarExt = extensionForMime(avatar.type);
    avatarPath = `avatars/${id}.${avatarExt}`;
    const avatarBuffer = Buffer.from(await avatar.arrayBuffer());
    const { error: avatarUploadError } = await supabase.storage
      .from(HBD_STORAGE_BUCKET)
      .upload(avatarPath, avatarBuffer, {
        contentType: avatar.type,
        upsert: false,
      });

    if (avatarUploadError) {
      await supabase.storage.from(HBD_STORAGE_BUCKET).remove([cardPath]);
      return NextResponse.json(
        { error: `อัปโหลด avatar ไม่สำเร็จ: ${avatarUploadError.message}` },
        { status: 500 }
      );
    }

    const { data: avatarPublic } = supabase.storage
      .from(HBD_STORAGE_BUCKET)
      .getPublicUrl(avatarPath);
    avatarUrl = avatarPublic.publicUrl;
  }

  try {
    const row = await createHbdSubmission({
      displayName,
      message,
      contactChannel: contactChannelRaw,
      contactHandle,
      cardPath,
      cardUrl: cardPublic.publicUrl,
      avatarPath,
      avatarUrl,
    });

    return NextResponse.json({
      ok: true,
      id: row.id,
      status: row.status,
    });
  } catch (error) {
    const paths = [cardPath, avatarPath].filter(Boolean) as string[];
    if (paths.length) {
      await supabase.storage.from(HBD_STORAGE_BUCKET).remove(paths);
    }
    const messageText =
      error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
