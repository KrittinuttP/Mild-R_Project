import { createAdminClient } from "@/lib/supabase/admin";
import {
  creditHref,
  creditLabel,
  type FanartContactChannel,
  type FanartCredit,
  type FanartCreditType,
} from "@/lib/fanart-upload";
import type { FanArtItem, GalleryTileSize } from "@/types/vtuber";

/** Public: the 2048 px WebP copies and avatars. */
export const FANART_STORAGE_BUCKET = "fanart-uploads";
/** Private: originals kept for printing. */
export const FANART_ORIGINALS_BUCKET = "fanart-originals";

const VIEW = "mild_r_fanart_submissions";

export type FanartSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

export type FanartSubmissionRow = {
  id: string;
  display_name: string;
  contact_channel: FanartContactChannel;
  contact_handle: string;
  art_path: string;
  art_url: string;
  avatar_path: string | null;
  avatar_url: string | null;
  status: FanartSubmissionStatus;
  created_at: string;
  approved_at: string | null;
  reviewed_at: string | null;
  /** Null for submissions made before originals were kept. */
  original_path: string | null;
  original_bytes: number | null;
  original_type: string | null;
  width: number | null;
  height: number | null;
  batch_id: string | null;
  consent_at: string | null;
  consent_version: string | null;
  /** Null for submissions made before credits: the contact handle is the credit. */
  credit_type: FanartCreditType | null;
  credit_value: string | null;
  /** 720 px WebP for gallery tiles; null for pictures sent before thumbnails. */
  thumb_path: string | null;
  thumb_url: string | null;
};

export type CreateFanartSubmissionInput = {
  id: string;
  displayName: string;
  contactChannel: FanartContactChannel;
  contactHandle: string;
  artPath: string;
  artUrl: string;
  thumbPath: string;
  thumbUrl: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  originalPath: string;
  originalBytes: number;
  originalType: string;
  width: number;
  height: number;
  batchId: string;
  consentAt: string;
  consentVersion: string;
  creditType: FanartCreditType;
  creditValue: string;
};

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" ? value : value == null ? null : Number(value);
}

function nullableString(value: unknown): string | null {
  return value == null ? null : String(value);
}

function mapRow(row: Record<string, unknown>): FanartSubmissionRow {
  return {
    id: String(row.id),
    display_name: String(row.display_name),
    contact_channel: row.contact_channel as FanartContactChannel,
    contact_handle: String(row.contact_handle),
    art_path: String(row.art_path),
    art_url: String(row.art_url),
    avatar_path: nullableString(row.avatar_path),
    avatar_url: nullableString(row.avatar_url),
    status: row.status as FanartSubmissionStatus,
    created_at: String(row.created_at),
    approved_at: nullableString(row.approved_at),
    reviewed_at: nullableString(row.reviewed_at),
    original_path: nullableString(row.original_path),
    original_bytes: nullableNumber(row.original_bytes),
    original_type: nullableString(row.original_type),
    width: nullableNumber(row.width),
    height: nullableNumber(row.height),
    batch_id: nullableString(row.batch_id),
    consent_at: nullableString(row.consent_at),
    consent_version: nullableString(row.consent_version),
    credit_type: (nullableString(row.credit_type) as FanartCreditType | null) ?? null,
    credit_value: nullableString(row.credit_value),
    thumb_path: nullableString(row.thumb_path),
    thumb_url: nullableString(row.thumb_url),
  };
}

export async function countPendingFanartSubmissions(): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from(VIEW)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listFanartSubmissions(
  statuses: FanartSubmissionStatus[]
): Promise<FanartSubmissionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(VIEW)
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getFanartSubmission(id: string): Promise<FanartSubmissionRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from(VIEW).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function findFanartSubmissionByOriginal(
  originalPath: string
): Promise<FanartSubmissionRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(VIEW)
    .select("*")
    .eq("original_path", originalPath)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/** Postgres unique_violation: another request already saved this original. */
export class DuplicateOriginalError extends Error {}

export async function createFanartSubmission(
  input: CreateFanartSubmissionInput
): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(VIEW)
    .insert({
      id: input.id,
      display_name: input.displayName,
      contact_channel: input.contactChannel,
      contact_handle: input.contactHandle,
      art_path: input.artPath,
      art_url: input.artUrl,
      thumb_path: input.thumbPath,
      thumb_url: input.thumbUrl,
      avatar_path: input.avatarPath,
      avatar_url: input.avatarUrl,
      status: "pending",
      original_path: input.originalPath,
      original_bytes: input.originalBytes,
      original_type: input.originalType,
      width: input.width,
      height: input.height,
      batch_id: input.batchId,
      consent_at: input.consentAt,
      consent_version: input.consentVersion,
      credit_type: input.creditType,
      credit_value: input.creditValue,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new DuplicateOriginalError(error.message);
    throw new Error(error.message);
  }
  return mapRow(data as Record<string, unknown>);
}

/** Bytes stored across every bucket (Free plan storage is project-wide). */
export async function getStorageUsedBytes(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("mild_r_storage_used_bytes");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function approveFanartSubmission(
  id: string
): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(VIEW)
    .update({ status: "approved", approved_at: now, reviewed_at: now })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

/**
 * Rejected pictures are not used, so their print original is deleted to free
 * storage. The small WebP copy stays as the record of what was sent.
 */
export async function rejectFanartSubmission(
  id: string
): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(VIEW)
    .update({ status: "rejected", reviewed_at: now })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const row = mapRow(data as Record<string, unknown>);

  if (row.original_path) {
    const { error: removeError } = await supabase.storage
      .from(FANART_ORIGINALS_BUCKET)
      .remove([row.original_path]);
    if (removeError) {
      console.error("[fanart] could not delete rejected original", row.id, removeError.message);
    }
  }
  return row;
}

/** Approved → hidden (off the gallery, kept) or hidden → approved. */
export async function setFanartHidden(id: string, hidden: boolean): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(VIEW)
    .update({ status: hidden ? "hidden" : "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", hidden ? "approved" : "hidden")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

/**
 * Deletes a submission for good: the row, its WebP copies and the print
 * original. The avatar goes too unless another picture of the batch uses it.
 */
export async function deleteFanartSubmission(id: string): Promise<void> {
  const supabase = createAdminClient();
  const row = await getFanartSubmission(id);
  if (!row) throw new Error("not found");

  const { error } = await supabase.from(VIEW).delete().eq("id", id);
  if (error) throw new Error(error.message);

  const publicPaths = [row.art_path, row.thumb_path].filter(Boolean) as string[];
  if (row.avatar_path) {
    const { count } = await supabase
      .from(VIEW)
      .select("id", { count: "exact", head: true })
      .eq("avatar_path", row.avatar_path);
    if (!count) publicPaths.push(row.avatar_path);
  }
  const removals = [
    publicPaths.length ? supabase.storage.from(FANART_STORAGE_BUCKET).remove(publicPaths) : null,
    row.original_path ? supabase.storage.from(FANART_ORIGINALS_BUCKET).remove([row.original_path]) : null,
  ];
  for (const result of await Promise.all(removals)) {
    if (result?.error) console.error("[fanart] could not delete file", id, result.error.message);
  }
}

/** Tile shape from the picture's own proportions. */
function tileSize(width: number | null, height: number | null): GalleryTileSize {
  if (!width || !height) return "md";
  const ratio = height / width;
  if (ratio >= 1.3) return "tall";
  if (ratio <= 0.72) return "wide";
  return "md";
}

/**
 * Approved fan art for the public gallery, newest first. Contact details are
 * not included. Empty when Supabase is not reachable (the page still renders).
 */
export async function listGalleryFanArt(limit = 200): Promise<FanArtItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(VIEW)
      .select("*")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((raw) => {
      const row = mapRow(raw as Record<string, unknown>);
      const credit: FanartCredit =
        row.credit_type && row.credit_value
          ? { type: row.credit_type, value: row.credit_value }
          : { type: "x", value: row.contact_handle };
      return {
        id: `fanart-${row.id}`,
        src: row.art_url,
        thumb: row.thumb_url ?? undefined,
        alt: `แฟนอาร์ต Mild-R โดย ${row.display_name}`,
        size: tileSize(row.width, row.height),
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        artist: {
          name: row.display_name,
          handle: creditLabel(credit),
          url: creditHref(credit),
        },
      };
    });
  } catch (error) {
    console.error("[fanart] gallery list failed", error);
    return [];
  }
}
