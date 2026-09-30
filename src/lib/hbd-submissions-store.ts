import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { HbdContactChannel } from "@/lib/hbd-upload";
import { HBD_AVATAR_DEFAULT } from "@/lib/hbd-upload";
import type { HbdWish } from "@/types/vtuber";

export const HBD_STORAGE_BUCKET = "hbd-uploads";

export type HbdSubmissionStatus = "pending" | "approved" | "rejected" | "hidden";

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
    avatar: row.avatar_url?.trim() || HBD_AVATAR_DEFAULT,
    fromUpload: true,
    downloadUrl: `/api/hbd/wishes/${row.id}/download`,
  };
}

/** Public: card of one approved wish (null when hidden, rejected or missing). */
export async function loadApprovedHbdCard(
  id: string
): Promise<{ displayName: string; cardUrl: string } | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("mild_r_hbd_wishes_public")
    .select("display_name, card_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    displayName: String(data.display_name),
    cardUrl: String(data.card_url),
  };
}

/** Public: approved wishes for /hbd/2026 */
export async function loadApprovedHbdWishes(): Promise<HbdWish[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_hbd_wishes_public")
      .select(
        "id, display_name, message, card_url, avatar_url, status, created_at, approved_at"
      )
      .order("approved_at", { ascending: true });

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
        avatar_url: (row.avatar_url as string | null) ?? null,
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
  statuses: HbdSubmissionStatus[]
): Promise<HbdSubmissionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .select("*")
    .in("status", statuses)
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

/** Approved → hidden: removed from /hbd/2026 but kept for later. */
export async function hideHbdSubmission(id: string): Promise<HbdSubmissionRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .update({ status: "hidden", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "approved")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

/** Hidden or rejected → approved (shown on /hbd/2026 again). */
export async function unhideHbdSubmission(
  id: string
): Promise<HbdSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: current, error: readError } = await supabase
    .from("mild_r_hbd_submissions")
    .select("approved_at")
    .eq("id", id)
    .in("status", ["hidden", "rejected"])
    .single();
  if (readError) throw new Error(readError.message);

  const { data, error } = await supabase
    .from("mild_r_hbd_submissions")
    .update({
      status: "approved",
      approved_at: (current?.approved_at as string | null) ?? now,
      reviewed_at: now,
    })
    .eq("id", id)
    .in("status", ["hidden", "rejected"])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

/** Permanently delete the row and its uploaded card/avatar files. */
export async function deleteHbdSubmission(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: row, error: readError } = await supabase
    .from("mild_r_hbd_submissions")
    .select("card_path, avatar_path")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);

  const paths = [row?.card_path, row?.avatar_path].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(HBD_STORAGE_BUCKET)
      .remove(paths);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase
    .from("mild_r_hbd_submissions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
