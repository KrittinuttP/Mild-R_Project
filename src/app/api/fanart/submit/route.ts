import { NextResponse } from "next/server";

import {
  FANART_AVATAR_LIMITS,
  FANART_LIMITS,
  type FanartContactChannel,
} from "@/lib/fanart-upload";
import {
  createFanartSubmission,
  FANART_STORAGE_BUCKET,
} from "@/lib/fanart-submissions-store";
import { processHbdAvatar, processHbdCard } from "@/lib/hbd-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const STORAGE_CACHE_SECONDS = "31536000";

function isContactChannel(value: string): value is FanartContactChannel {
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
  const contactChannelRaw = String(form.get("contactChannel") ?? "").trim();
  const contactHandle = String(form.get("contactHandle") ?? "").trim();
  const art = form.get("art");
  const avatar = form.get("avatar");

  if (!displayName) {
    return NextResponse.json({ error: "กรุณากรอกชื่อที่แสดง" }, { status: 400 });
  }
  if (!isContactChannel(contactChannelRaw)) {
    return NextResponse.json({ error: "ช่องทางติดต่อไม่ถูกต้อง" }, { status: 400 });
  }
  if (!contactHandle.replace(/^@+/, "").trim()) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อช่องทางติดต่อ" },
      { status: 400 }
    );
  }
  if (!(art instanceof File) || art.size === 0) {
    return NextResponse.json({ error: "กรุณาอัปโหลดรูปแฟนอาร์ต" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE.has(art.type)) {
    return NextResponse.json(
      { error: "รูปต้องเป็น JPEG / PNG / WebP" },
      { status: 400 }
    );
  }
  if (art.size > FANART_LIMITS.maxBytes) {
    return NextResponse.json(
      { error: "ไฟล์รูปใหญ่เกินไป (สูงสุด 5 MB)" },
      { status: 400 }
    );
  }

  if (avatar instanceof File && avatar.size > 0) {
    if (!ALLOWED_IMAGE.has(avatar.type)) {
      return NextResponse.json(
        { error: "รูปโปรไฟล์ต้องเป็น JPEG / PNG / WebP" },
        { status: 400 }
      );
    }
    if (avatar.size > FANART_AVATAR_LIMITS.maxBytes) {
      return NextResponse.json(
        { error: "ไฟล์รูปโปรไฟล์ใหญ่เกินไป (สูงสุด 2 MB)" },
        { status: 400 }
      );
    }
  }

  let artImage: Awaited<ReturnType<typeof processHbdCard>>;
  let avatarImage: Awaited<ReturnType<typeof processHbdAvatar>> | null = null;
  try {
    artImage = await processHbdCard(Buffer.from(await art.arrayBuffer()));
    if (avatar instanceof File && avatar.size > 0) {
      avatarImage = await processHbdAvatar(Buffer.from(await avatar.arrayBuffer()));
    }
  } catch {
    return NextResponse.json(
      { error: "อ่านไฟล์รูปไม่ได้ — ลองบันทึกเป็น JPEG / PNG แล้วอัปใหม่" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const artPath = `art/${id}.${artImage.extension}`;

  const { error: artUploadError } = await supabase.storage
    .from(FANART_STORAGE_BUCKET)
    .upload(artPath, artImage.buffer, {
      contentType: artImage.contentType,
      cacheControl: STORAGE_CACHE_SECONDS,
      upsert: false,
    });

  if (artUploadError) {
    return NextResponse.json(
      { error: `อัปโหลดรูปไม่สำเร็จ: ${artUploadError.message}` },
      { status: 500 }
    );
  }

  const { data: artPublic } = supabase.storage
    .from(FANART_STORAGE_BUCKET)
    .getPublicUrl(artPath);

  let avatarPath: string | null = null;
  let avatarUrl: string | null = null;

  if (avatarImage) {
    avatarPath = `avatars/${id}.${avatarImage.extension}`;
    const { error: avatarUploadError } = await supabase.storage
      .from(FANART_STORAGE_BUCKET)
      .upload(avatarPath, avatarImage.buffer, {
        contentType: avatarImage.contentType,
        cacheControl: STORAGE_CACHE_SECONDS,
        upsert: false,
      });

    if (avatarUploadError) {
      await supabase.storage.from(FANART_STORAGE_BUCKET).remove([artPath]);
      return NextResponse.json(
        { error: `อัปโหลดรูปโปรไฟล์ไม่สำเร็จ: ${avatarUploadError.message}` },
        { status: 500 }
      );
    }

    const { data: avatarPublic } = supabase.storage
      .from(FANART_STORAGE_BUCKET)
      .getPublicUrl(avatarPath);
    avatarUrl = avatarPublic.publicUrl;
  }

  try {
    const row = await createFanartSubmission({
      displayName,
      contactChannel: contactChannelRaw,
      contactHandle: contactHandle.replace(/^@+/, "").trim(),
      artPath,
      artUrl: artPublic.publicUrl,
      avatarPath,
      avatarUrl,
    });

    return NextResponse.json({ ok: true, id: row.id, status: row.status });
  } catch (error) {
    const paths = [artPath, avatarPath].filter(Boolean) as string[];
    if (paths.length) {
      await supabase.storage.from(FANART_STORAGE_BUCKET).remove(paths);
    }
    const messageText = error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
