import { NextResponse } from "next/server";

import { FANART_LIMITS } from "@/lib/fanart-upload";
import {
  DuplicateOriginalError,
  FANART_ORIGINALS_BUCKET,
  FANART_STORAGE_BUCKET,
  createFanartSubmission,
  findFanartSubmissionByOriginal,
} from "@/lib/fanart-submissions-store";
import { processFanartOriginal } from "@/lib/fanart-image";
import { verifyFanartTicket } from "@/lib/fanart-ticket";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
/** Decoding a 15 MB original and making the WebP copy can take a few seconds. */
export const maxDuration = 60;

const STORAGE_CACHE_SECONDS = "31536000";
const TRY_AGAIN = "บันทึกรูปไม่สำเร็จ กรุณากด ลองใหม่";

function fail(error: string, status = 400, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

/**
 * Step 2 of sending fan art, once per picture after the browser has put the
 * original in storage: checks the file really is an image, makes the WebP
 * copy for admin and saves the row. Safe to call again for the same picture.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return fail("ระบบรับแฟนอาร์ตยังไม่พร้อม กรุณาลองใหม่ภายหลัง", 503);
  }

  let body: { ticket?: unknown; index?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }

  const check = verifyFanartTicket(body.ticket);
  if (!check.ok) {
    return check.reason === "expired"
      ? fail("หมดเวลาส่งรอบนี้แล้ว กรุณากลับไปแก้ไขแล้วส่งใหม่", 410, "expired")
      : fail("ข้อมูลที่ส่งมาไม่ถูกต้อง", 400, "invalid");
  }
  const { ticket } = check;
  const index = Number(body.index);
  const originalPath = Number.isInteger(index) ? ticket.paths[index] : undefined;
  if (!originalPath) return fail("ข้อมูลที่ส่งมาไม่ถูกต้อง");

  try {
    const existing = await findFanartSubmissionByOriginal(originalPath);
    if (existing) return NextResponse.json({ ok: true, id: existing.id });
  } catch (error) {
    console.error("[fanart] lookup failed", error);
    return fail(TRY_AGAIN, 503);
  }

  const supabase = createAdminClient();
  const originals = supabase.storage.from(FANART_ORIGINALS_BUCKET);

  const { data: blob, error: downloadError } = await originals.download(originalPath);
  if (downloadError || !blob) {
    return fail("ยังไม่พบไฟล์ที่อัปโหลด กรุณากด ลองใหม่", 404, "missing");
  }
  if (blob.size > FANART_LIMITS.maxOriginalBytes) {
    await originals.remove([originalPath]);
    return fail("ไฟล์รูปใหญ่เกินไป", 400, "unreadable");
  }

  let processed: Awaited<ReturnType<typeof processFanartOriginal>>;
  try {
    processed = await processFanartOriginal(Buffer.from(await blob.arrayBuffer()));
  } catch {
    await originals.remove([originalPath]);
    return fail(
      "อ่านไฟล์รูปนี้ไม่ได้ ลองบันทึกเป็น JPEG หรือ PNG แล้วเลือกใหม่",
      400,
      "unreadable"
    );
  }

  const id = crypto.randomUUID();
  const artPath = `art/${id}.${processed.card.extension}`;
  const { error: artError } = await supabase.storage
    .from(FANART_STORAGE_BUCKET)
    .upload(artPath, processed.card.buffer, {
      contentType: processed.card.contentType,
      cacheControl: STORAGE_CACHE_SECONDS,
      upsert: false,
    });
  if (artError) {
    console.error("[fanart] card upload failed", artError.message);
    return fail(TRY_AGAIN, 502);
  }
  const artUrl = supabase.storage.from(FANART_STORAGE_BUCKET).getPublicUrl(artPath).data.publicUrl;

  const thumbPath = `thumbs/${id}.${processed.thumb.extension}`;
  const { error: thumbError } = await supabase.storage
    .from(FANART_STORAGE_BUCKET)
    .upload(thumbPath, processed.thumb.buffer, {
      contentType: processed.thumb.contentType,
      cacheControl: STORAGE_CACHE_SECONDS,
      upsert: false,
    });
  if (thumbError) {
    console.error("[fanart] thumb upload failed", thumbError.message);
    await supabase.storage.from(FANART_STORAGE_BUCKET).remove([artPath]);
    return fail(TRY_AGAIN, 502);
  }
  const thumbUrl = supabase.storage.from(FANART_STORAGE_BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  try {
    const row = await createFanartSubmission({
      id,
      displayName: ticket.displayName,
      contactChannel: ticket.channel,
      contactHandle: ticket.handle,
      artPath,
      artUrl,
      thumbPath,
      thumbUrl,
      avatarPath: ticket.avatarPath,
      avatarUrl: ticket.avatarUrl,
      originalPath,
      originalBytes: blob.size,
      originalType: processed.info.type,
      width: processed.info.width,
      height: processed.info.height,
      batchId: ticket.batchId,
      consentAt: ticket.consentAt,
      consentVersion: ticket.consentVersion,
      creditType: ticket.credits[index]?.type ?? "x",
      creditValue: ticket.credits[index]?.value ?? ticket.handle,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    await supabase.storage.from(FANART_STORAGE_BUCKET).remove([artPath, thumbPath]);
    if (error instanceof DuplicateOriginalError) {
      // A retry raced the first request; that one saved the row.
      const existing = await findFanartSubmissionByOriginal(originalPath).catch(() => null);
      if (existing) return NextResponse.json({ ok: true, id: existing.id });
    }
    console.error("[fanart] insert failed", error);
    // Local dev only: show why, so a missing migration is obvious.
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: TRY_AGAIN, detail: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
    return fail(TRY_AGAIN, 500);
  }
}
