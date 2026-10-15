import { createAdminClient } from "@/lib/supabase/admin";
import type { FanartContactChannel } from "@/lib/fanart-upload";

export const FANART_STORAGE_BUCKET = "fanart-uploads";

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
};

export type CreateFanartSubmissionInput = {
  displayName: string;
  contactChannel: FanartContactChannel;
  contactHandle: string;
  artPath: string;
  artUrl: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

function mapRow(row: Record<string, unknown>): FanartSubmissionRow {
  return {
    id: String(row.id),
    display_name: String(row.display_name),
    contact_channel: row.contact_channel as FanartContactChannel,
    contact_handle: String(row.contact_handle),
    art_path: String(row.art_path),
    art_url: String(row.art_url),
    avatar_path: (row.avatar_path as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    status: row.status as FanartSubmissionStatus,
    created_at: String(row.created_at),
    approved_at: (row.approved_at as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
  };
}

export async function countPendingFanartSubmissions(): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("mild_r_fanart_submissions")
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
    .from("mild_r_fanart_submissions")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createFanartSubmission(
  input: CreateFanartSubmissionInput
): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_fanart_submissions")
    .insert({
      display_name: input.displayName,
      contact_channel: input.contactChannel,
      contact_handle: input.contactHandle,
      art_path: input.artPath,
      art_url: input.artUrl,
      avatar_path: input.avatarPath ?? null,
      avatar_url: input.avatarUrl ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function approveFanartSubmission(
  id: string
): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("mild_r_fanart_submissions")
    .update({ status: "approved", approved_at: now, reviewed_at: now })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function rejectFanartSubmission(
  id: string
): Promise<FanartSubmissionRow> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("mild_r_fanart_submissions")
    .update({ status: "rejected", reviewed_at: now })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}
