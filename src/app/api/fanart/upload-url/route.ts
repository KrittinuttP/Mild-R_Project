import { NextResponse } from "next/server";

import {
  FANART_AVATAR_LIMITS,
  FANART_CONSENT,
  FANART_LIMITS,
  checkContactHandle,
  checkCredit,
  checkDisplayName,
  isFanartMimeType,
  type FanartCredit,
  type FanartMimeType,
} from "@/lib/fanart-upload";
import {
  FANART_ORIGINALS_BUCKET,
  FANART_STORAGE_BUCKET,
  getStorageUsedBytes,
} from "@/lib/fanart-submissions-store";
import { FANART_TICKET_TTL_MS, signFanartTicket } from "@/lib/fanart-ticket";
import { processHbdAvatar } from "@/lib/hbd-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const STORAGE_CACHE_SECONDS = "31536000";
const EXTENSION: Record<FanartMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Stop taking fan art before the Free plan's 1 GB storage runs out. */
function storageLimitBytes(): number {
  const mb = Number(process.env.FANART_STORAGE_LIMIT_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 800) * 1024 * 1024;
}

const NOT_READY = "ระบบรับแฟนอาร์ตยังไม่พร้อม กรุณาลองใหม่ภายหลัง";

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

type FileClaim = { size: number; type: FanartMimeType };

function readFileClaims(raw: FormDataEntryValue | null): FileClaim[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? ""));
  } catch {
    return "ไม่พบรายการรูป";
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return "กรุณาเลือกรูปแฟนอาร์ตอย่างน้อย 1 รูป";
  if (parsed.length > FANART_LIMITS.maxFiles) {
    return `ส่งได้ครั้งละไม่เกิน ${FANART_LIMITS.maxFiles} รูป`;
  }
  const claims: FileClaim[] = [];
  for (const item of parsed) {
    const size = Number((item as { size?: unknown })?.size);
    const type = String((item as { type?: unknown })?.type ?? "");
    if (!isFanartMimeType(type)) return "รูปต้องเป็น JPEG, PNG หรือ WebP";
    if (!Number.isInteger(size) || size <= 0) return "ไฟล์รูปไม่ถูกต้อง";
    if (size > FANART_LIMITS.maxOriginalBytes) return "ไฟล์รูปใหญ่เกินไป";
    claims.push({ size, type });
  }
  return claims;
}

/**
 * One credit per picture. A missing or empty entry means the fan's own X
 * account, which is also the default on the form.
 */
function readCredits(raw: FormDataEntryValue | null, count: number, handle: string): FanartCredit[] | string {
  let parsed: unknown = [];
  if (raw !== null) {
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return "เครดิตไม่ถูกต้อง";
    }
  }
  if (!Array.isArray(parsed) || parsed.length > count) return "เครดิตไม่ถูกต้อง";
  const credits: FanartCredit[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = parsed[index] as { type?: unknown; value?: unknown } | null | undefined;
    const value = typeof item?.value === "string" ? item.value : "";
    if (!item || !value.trim()) {
      credits.push({ type: "x", value: handle });
      continue;
    }
    const checked = checkCredit(String(item.type ?? ""), value);
    if ("error" in checked) return `รูปที่ ${index + 1} · ${checked.error}`;
    credits.push(checked.credit);
  }
  return credits;
}

/**
 * Step 1 of sending fan art: checks the form and hands back one signed upload
 * URL per picture plus a signed ticket for /api/fanart/submit.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return fail(NOT_READY, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }

  if (form.get("consent") !== "yes") {
    return fail("กรุณาติ๊กยินยอมการนำผลงานไปใช้ก่อนส่ง");
  }

  const name = checkDisplayName(String(form.get("displayName") ?? ""));
  if ("error" in name) return fail(name.error);

  // Contact is an X account only (Discord was dropped on 2026-10-21).
  const channel = "x" as const;
  const handle = checkContactHandle(channel, String(form.get("contactHandle") ?? ""));
  if ("error" in handle) return fail(handle.error);

  const claims = readFileClaims(form.get("files"));
  if (typeof claims === "string") return fail(claims);

  const credits = readCredits(form.get("credits"), claims.length, handle.handle);
  if (typeof credits === "string") return fail(credits);

  const avatar = form.get("avatar");
  const hasAvatar = avatar instanceof File && avatar.size > 0;
  if (hasAvatar) {
    if (!isFanartMimeType(avatar.type)) return fail("รูปโปรไฟล์ต้องเป็น JPEG, PNG หรือ WebP");
    if (avatar.size > FANART_AVATAR_LIMITS.maxBytes) return fail("ไฟล์รูปโปรไฟล์ใหญ่เกินไป");
  }

  try {
    const used = await getStorageUsedBytes();
    const incoming = claims.reduce((sum, claim) => sum + claim.size, 0);
    if (used + incoming > storageLimitBytes()) {
      console.warn("[fanart] storage limit reached", { used, incoming });
      return fail("ขออภัย ตอนนี้พื้นที่รับแฟนอาร์ตเต็มแล้ว กรุณาติดต่อทีมงาน", 507);
    }
  } catch (error) {
    console.error("[fanart] storage usage check failed", error);
    return fail(NOT_READY, 503);
  }

  const supabase = createAdminClient();
  const batchId = crypto.randomUUID();

  let avatarPath: string | null = null;
  let avatarUrl: string | null = null;
  if (hasAvatar) {
    let image: Awaited<ReturnType<typeof processHbdAvatar>>;
    try {
      image = await processHbdAvatar(Buffer.from(await avatar.arrayBuffer()));
    } catch {
      return fail("อ่านรูปโปรไฟล์ไม่ได้ ลองเลือกรูปอื่น");
    }
    avatarPath = `avatars/${batchId}.${image.extension}`;
    const { error } = await supabase.storage.from(FANART_STORAGE_BUCKET).upload(avatarPath, image.buffer, {
      contentType: image.contentType,
      cacheControl: STORAGE_CACHE_SECONDS,
      upsert: false,
    });
    if (error) {
      console.error("[fanart] avatar upload failed", error.message);
      return fail("อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่", 502);
    }
    avatarUrl = supabase.storage.from(FANART_STORAGE_BUCKET).getPublicUrl(avatarPath).data.publicUrl;
  }

  const uploads: { path: string; signedUrl: string }[] = [];
  for (const [index, claim] of claims.entries()) {
    const path = `${batchId}/${index + 1}-${crypto.randomUUID().slice(0, 8)}.${EXTENSION[claim.type]}`;
    const { data, error } = await supabase.storage
      .from(FANART_ORIGINALS_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[fanart] signed upload url failed", error?.message);
      if (avatarPath) await supabase.storage.from(FANART_STORAGE_BUCKET).remove([avatarPath]);
      return fail(NOT_READY, 503);
    }
    uploads.push({ path, signedUrl: data.signedUrl });
  }

  const ticket = signFanartTicket({
    v: 1,
    batchId,
    displayName: name.name,
    channel,
    handle: handle.handle,
    avatarPath,
    avatarUrl,
    paths: uploads.map((upload) => upload.path),
    credits,
    consentAt: new Date().toISOString(),
    consentVersion: FANART_CONSENT.version,
    exp: Date.now() + FANART_TICKET_TTL_MS,
  });

  return NextResponse.json({ ticket, uploads });
}
