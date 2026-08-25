import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { HbdContactChannel } from "@/lib/hbd-upload";
import type { HbdWish } from "@/types/vtuber";

export const HBD_STORAGE_BUCKET = "hbd-uploads";

export type HbdSubmissionStatus = "pending" | "approved" | "rejected";

export type HbdSubmissionRow = {
  id: string;
  display_name: string;
  message: string | null;
  contact_channel: HbdContactChannel;
  contact_handle: string;
  card_path: string;
  card_url: string;
  avatar_path: string | null;
  avatar_url: string | null;
  status: HbdSubmissionStatus;
  created_at: string;
  approved_at: string | null;
  reviewed_at: string | null;
};

export type CreateHbdSubmissionInput = {
  displayName: string;
  message: string;
  contactChannel: HbdContactChannel;
  contactHandle: string;
  cardPath: string;
  cardUrl: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

function mapRow(row: Record<string, unknown>): HbdSubmissionRow {
  return {
    id: String(row.id),
    display_name: String(row.display_name),
    message: (row.message as string | null) ?? null,
    contact_channel: row.contact_channel as HbdContactChannel,
    contact_handle: String(row.contact_handle),
    card_path: String(row.card_path),
    card_url: String(row.card_url),
    avatar_path: (row.avatar_path as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    status: row.status as HbdSubmissionStatus,
    created_at: String(row.created_at),
    approved_at: (row.approved_at as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
  };
}

export function submissionToWish(row: HbdSubmissionRow): HbdWish {
  return {
    id: `upload-${row.id}`,
    from: row.display_name,
    message: row.message?.trim() || "สุขสันต์วันเกิด Mild-R 🎂",
    image: row.card_url,
    alt: `Wish from ${row.display_name}`,
    fromUpload: true,
    loadOnDemand: true,
  };
}

/** Public: approved wishes for /hbd */
export async function loadApprovedHbdWishes(): Promise<HbdWish[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_hbd_wishes_public")
      .select(
        "id, display_name, message, card_url, status, created_at, approved_at"
      )
      .order("approved_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) =>
      submissionToWish({
        id: String(row.id),
        display_name: String(row.display_name),
        message: (row.message as string | null) ?? null,
        contact_channel: "x",
        contact_handle: "",
        card_path: "",
        card_url: String(row.card_url),
        avatar_path: null,
        avatar_url: null,
        status: "approved",
        created_at: String(row.created_at),
        approved_at: (row.approved_at as string | null) ?? null,
        reviewed_at: null,
      })
    );
  } catch {
    return [];
  }
}

export async function countPendingHbdSubmissions(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return 0;

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("mild_r_hbd_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listHbdSubmissions(
  status: HbdSubmissionStatus
): Promise<HbdSubmissionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createHbdSubmission(
  input: CreateHbdSubmissionInput
): Promise<HbdSubmissionRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .insert({
      display_name: input.displayName,
      message: input.message || null,
      contact_channel: input.contactChannel,
      contact_handle: input.contactHandle,
      card_path: input.cardPath,
      card_url: input.cardUrl,
      avatar_path: input.avatarPath ?? null,
      avatar_url: input.avatarUrl ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function approveHbdSubmission(
  id: string
): Promise<HbdSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .update({
      status: "approved",
      approved_at: now,
      reviewed_at: now,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function rejectHbdSubmission(
  id: string
): Promise<HbdSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .update({
      status: "rejected",
      reviewed_at: now,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
