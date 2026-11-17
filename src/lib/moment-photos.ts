/**
 * Moments gallery · photos uploaded by the admin at /admin/moments (server only).
 *
 * Table mild_r.moment_photos + public bucket `moment-photos`
 * (migration 20261117150000_moment_photos.sql). The browser uploads the original
 * to `incoming/` with a signed URL; `finalizeMomentPhoto` then makes the 2048 px
 * and 720 px WebP copies, removes the original and saves the row. The upload
 * time (`created_at`) is the photo's date when Moments sorts by date.
 * Before the migration runs, Moments simply has no uploaded photos.
 */
import { processFanartOriginal } from "@/lib/fanart-image";
import { FANART_IMAGE_SIZES } from "@/lib/fanart-upload";
import {
  MOMENT_PHOTO_DEFAULT_CREDIT,
  MOMENT_PHOTO_LIMITS,
  type MomentPhotoAdmin,
  type MomentPhotoType,
} from "@/lib/moment-photos-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { tileSize } from "@/lib/x-gallery";
import type { GalleryItem } from "@/types/vtuber";

export const MOMENT_PHOTOS_BUCKET = "moment-photos";

const PUBLIC_VIEW = "mild_r_moment_photos";
const ADMIN_VIEW = "mild_r_moment_photos_admin";
const CACHE_SECONDS = "31536000";
const LIST_LIMIT = 1000;
const EXTENSION: Record<MomentPhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Only paths this module hands out: incoming/<uuid>.<ext>. */
const INCOMING_RE = /^incoming\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const ID_RE = /^[0-9a-f-]{36}$/;

type PublicRow = {
  id: string;
  art_url: string;
  thumb_url: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
  created_at: string;
};

type AdminRow = PublicRow & {
  art_path: string;
  thumb_path: string;
  hidden: boolean;
};

/** Postgres / PostgREST "relation does not exist" before the migration runs. */
function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message?.includes(PUBLIC_VIEW) ||
        error.message?.includes(ADMIN_VIEW))
  );
}

export function isMomentPhotoId(value: string) {
  return ID_RE.test(value);
}

export function isMomentIncomingPath(value: string) {
  return INCOMING_RE.test(value);
}

function toAdmin(row: AdminRow): MomentPhotoAdmin {
  return {
    id: row.id,
    src: row.art_url,
    thumb: row.thumb_url,
    width: row.width,
    height: row.height,
    alt: row.alt,
    credit: row.credit,
    hidden: row.hidden,
    createdAt: row.created_at,
  };
}

/** Moments tiles from admin uploads, newest first (empty before the migration). */
export async function loadMomentPhotoItems(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await createPublicClient()
      .from(PUBLIC_VIEW)
      .select("id, art_url, thumb_url, width, height, alt, credit, created_at")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (error) {
      if (!isMissingTable(error)) console.error("[moment_photos]", error.message);
      return [];
    }
    return ((data ?? []) as PublicRow[]).map((row) => ({
      id: `upload-${row.id}`,
      src: row.art_url,
      thumb: row.thumb_url,
      alt: row.alt || "ช่วงเวลาของ Mild-R",
      credit: row.credit || MOMENT_PHOTO_DEFAULT_CREDIT,
      size: tileSize(row.width, row.height),
      width: row.width,
      height: row.height,
      // Keeps uploads after every curated tile in GalleryBoard's base sort.
      loadOnDemand: true,
      source: "upload" as const,
      postedAt: row.created_at,
    }));
  } catch (err) {
    console.error("[moment_photos]", err);
    return [];
  }
}

/** Every uploaded photo, hidden ones included. `ready` is false before the migration. */
export async function loadMomentPhotosAdmin(): Promise<{ photos: MomentPhotoAdmin[]; ready: boolean }> {
  if (!isSupabaseConfigured()) return { photos: [], ready: false };
  const { data, error } = await createAdminClient()
    .from(ADMIN_VIEW)
    .select("id, art_path, art_url, thumb_path, thumb_url, width, height, alt, credit, hidden, created_at")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) {
    if (!isMissingTable(error)) console.error("[moment_photos] admin list", error.message);
    return { photos: [], ready: false };
  }
  return { photos: ((data ?? []) as AdminRow[]).map(toAdmin), ready: true };
}

/** One signed upload URL per file, under incoming/. */
export async function createMomentUploadUrls(types: MomentPhotoType[]) {
  const storage = createAdminClient().storage.from(MOMENT_PHOTOS_BUCKET);
  const uploads: { path: string; signedUrl: string }[] = [];
  for (const type of types) {
    const path = `incoming/${crypto.randomUUID()}.${EXTENSION[type]}`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "signed upload url failed");
    uploads.push({ path, signedUrl: data.signedUrl });
  }
  return uploads;
}

export class MomentPhotoError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Turns an uploaded original into the Moments copies and saves the row. */
export async function finalizeMomentPhoto(input: {
  path: string;
  alt: string;
  credit: string;
}): Promise<MomentPhotoAdmin> {
  const supabase = createAdminClient();
  const storage = supabase.storage.from(MOMENT_PHOTOS_BUCKET);

  const { data: blob, error: downloadError } = await storage.download(input.path);
  if (downloadError || !blob) throw new MomentPhotoError("ยังไม่พบไฟล์ที่อัปโหลด กรุณาลองใหม่", 404);
  if (blob.size > MOMENT_PHOTO_LIMITS.maxBytes) {
    await storage.remove([input.path]);
    throw new MomentPhotoError("ไฟล์รูปใหญ่เกินไป", 400);
  }

  let processed: Awaited<ReturnType<typeof processFanartOriginal>>;
  try {
    processed = await processFanartOriginal(Buffer.from(await blob.arrayBuffer()));
  } catch {
    await storage.remove([input.path]);
    throw new MomentPhotoError("อ่านไฟล์รูปนี้ไม่ได้ ลองบันทึกเป็น JPEG หรือ PNG แล้วเลือกใหม่", 400);
  }

  const id = crypto.randomUUID();
  const artPath = `art/${id}.webp`;
  const thumbPath = `thumbs/${id}.webp`;
  const upload = (path: string, buffer: Buffer) =>
    storage.upload(path, buffer, { contentType: "image/webp", cacheControl: CACHE_SECONDS, upsert: false });

  const art = await upload(artPath, processed.card.buffer);
  if (art.error) throw new MomentPhotoError("บันทึกรูปไม่สำเร็จ กรุณาลองใหม่", 502);
  const thumb = await upload(thumbPath, processed.thumb.buffer);
  if (thumb.error) {
    await storage.remove([artPath]);
    throw new MomentPhotoError("บันทึกรูปไม่สำเร็จ กรุณาลองใหม่", 502);
  }

  // Displayed size of the WebP copy (same aspect ratio as the original).
  const edge = FANART_IMAGE_SIZES.artMaxEdge;
  const scale = Math.min(1, edge / Math.max(processed.info.width, processed.info.height));
  const width = Math.max(1, Math.round(processed.info.width * scale));
  const height = Math.max(1, Math.round(processed.info.height * scale));

  const { data, error } = await supabase
    .from(ADMIN_VIEW)
    .insert({
      id,
      art_path: artPath,
      art_url: storage.getPublicUrl(artPath).data.publicUrl,
      thumb_path: thumbPath,
      thumb_url: storage.getPublicUrl(thumbPath).data.publicUrl,
      width,
      height,
      alt: input.alt,
      credit: input.credit || MOMENT_PHOTO_DEFAULT_CREDIT,
    })
    .select("id, art_path, art_url, thumb_path, thumb_url, width, height, alt, credit, hidden, created_at")
    .single();
  if (error || !data) {
    console.error("[moment_photos] insert failed", error?.message);
    await storage.remove([artPath, thumbPath]);
    throw new MomentPhotoError("บันทึกรูปไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  // The original is no longer needed; a leftover file only costs storage.
  const removed = await storage.remove([input.path]);
  if (removed.error) console.error("[moment_photos] incoming cleanup failed", removed.error.message);

  return toAdmin(data as AdminRow);
}

export async function setMomentPhotoHidden(id: string, hidden: boolean) {
  const { error } = await createAdminClient()
    .from(ADMIN_VIEW)
    .update({ hidden, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Deletes the row and both WebP copies. */
export async function deleteMomentPhoto(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(ADMIN_VIEW)
    .select("art_path, thumb_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;

  const { error: deleteError } = await supabase.from(ADMIN_VIEW).delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);

  const row = data as { art_path: string; thumb_path: string };
  const removed = await supabase.storage.from(MOMENT_PHOTOS_BUCKET).remove([row.art_path, row.thumb_path]);
  if (removed.error) console.error("[moment_photos] file cleanup failed", id, removed.error.message);
}
