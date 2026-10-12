import { NextResponse } from "next/server";

import {
  HBD_AVATAR_LIMITS,
  HBD_CARD_TEMPLATE,
  type HbdContactChannel,
} from "@/lib/hbd-upload";
import { processHbdAvatar, processHbdCard } from "@/lib/hbd-image";
import {
  createHbdSubmission,
  HBD_STORAGE_BUCKET,
} from "@/lib/hbd-submissions-store";
import {
  LUCKY_DRAW_CAMPAIGNS,
  LUCKY_DRAW_LIMITS,
  validateLuckyDrawContact,
} from "@/lib/lucky-draw";
import { createLuckyDrawEntry } from "@/lib/lucky-draw-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Paths are random UUIDs, so stored files never change. */
const STORAGE_CACHE_SECONDS = "31536000";

function isContactChannel(value: string): value is HbdContactChannel {
  return value === "x" || value === "discord";
}

/** Result of the optional lucky-wheel tick, reported next to the card result. */
type LuckyDrawOutcome = "entered" | "already" | "failed" | "skipped";

/**
 * Enter the HBD lucky wheel with the contact details of the card just saved.
 * Never throws: the card is already stored, so a failed entry must not turn
 * the whole upload into an error.
 */
async function enterHbdLuckyDraw(input: {
  submissionId: string;
  displayName: string;
  contactChannel: HbdContactChannel;
  contactHandle: string;
}): Promise<LuckyDrawOutcome> {
  const contact = validateLuckyDrawContact({
    // Display names have no length limit on this form; entries do.
    contactName: input.displayName.slice(0, LUCKY_DRAW_LIMITS.nameMax),
    contactChannel: input.contactChannel,
    contactHandle: input.contactHandle,
  });
  if (!contact.ok) return "failed";

  try {
    return await createLuckyDrawEntry({
      ...contact.value,
      campaign: LUCKY_DRAW_CAMPAIGNS.hbd,
      sourceRef: input.submissionId,
    });
  } catch {
    return "failed";
  }
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
  const joinLuckyDraw = String(form.get("joinLuckyDraw") ?? "") === "1";

  if (!displayName) {
    return NextResponse.json({ error: "กรุณากรอกชื่อที่แสดง" }, { status: 400 });
  }
  if (!isContactChannel(contactChannelRaw)) {
    return NextResponse.json({ error: "ช่องทางติดต่อไม่ถูกต้อง" }, { status: 400 });
  }
  // "@" alone (the form adds it for X) counts as empty.
  if (!contactHandle.replace(/^@+/, "").trim()) {
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

  let cardImage: Awaited<ReturnType<typeof processHbdCard>>;
  let avatarImage: Awaited<ReturnType<typeof processHbdAvatar>> | null = null;
  try {
    cardImage = await processHbdCard(Buffer.from(await card.arrayBuffer()));
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
  const cardPath = `cards/${id}.${cardImage.extension}`;

  const { error: cardUploadError } = await supabase.storage
    .from(HBD_STORAGE_BUCKET)
    .upload(cardPath, cardImage.buffer, {
      contentType: cardImage.contentType,
      cacheControl: STORAGE_CACHE_SECONDS,
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

  if (avatarImage) {
    avatarPath = `avatars/${id}.${avatarImage.extension}`;
    const { error: avatarUploadError } = await supabase.storage
      .from(HBD_STORAGE_BUCKET)
      .upload(avatarPath, avatarImage.buffer, {
        contentType: avatarImage.contentType,
        cacheControl: STORAGE_CACHE_SECONDS,
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

    const luckyDraw: LuckyDrawOutcome = joinLuckyDraw
      ? await enterHbdLuckyDraw({
          submissionId: row.id,
          displayName,
          contactChannel: contactChannelRaw,
          contactHandle,
        })
      : "skipped";

    return NextResponse.json({
      ok: true,
      id: row.id,
      status: row.status,
      luckyDraw,
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
