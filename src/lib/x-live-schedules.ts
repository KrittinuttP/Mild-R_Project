import type { SupabaseClient } from "@supabase/supabase-js";

export type XLiveScheduleStatus =
  | "pending"
  | "imported"
  | "skipped"
  | "failed";

export type EnsureXLiveScheduleInput = {
  tweet_id: string;
  image_url: string | null;
  image_source_url?: string | null;
  posted_at?: string | null;
};

/**
 * Insert or refresh a Live Schedule poster row for the Agent pipeline.
 * - New rows: status=pending, added_at=now
 * - Existing: update image/posted_at; never reset imported → pending
 */
export async function ensureXLiveScheduleRow(
  supabase: SupabaseClient,
  input: EnsureXLiveScheduleInput
): Promise<"inserted" | "updated" | "skipped" | "error"> {
  const tweetId = input.tweet_id?.trim();
  if (!tweetId) return "skipped";

  const imageUrl = input.image_url?.trim() || null;
  if (!imageUrl) return "skipped";

  const now = new Date().toISOString();
  const sourceUrl = input.image_source_url?.trim() || null;
  const postedAt = input.posted_at ?? null;

  const { data: existing, error: selErr } = await supabase
    .from("mild_r_x_live_schedules")
    .select("tweet_id, status, image_url, image_source_url")
    .eq("tweet_id", tweetId)
    .maybeSingle();

  if (selErr) {
    console.error("[x_live_schedules] select:", selErr.message);
    return "error";
  }

  if (!existing) {
    const { error: insErr } = await supabase.from("mild_r_x_live_schedules").insert({
      tweet_id: tweetId,
      image_url: imageUrl,
      image_source_url: sourceUrl,
      posted_at: postedAt,
      added_at: now,
      status: "pending",
      agent_processed_at: null,
      parsed_json: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    });
    if (insErr) {
      console.error("[x_live_schedules] insert:", insErr.message);
      return "error";
    }
    return "inserted";
  }

  const { error: updErr } = await supabase
    .from("mild_r_x_live_schedules")
    .update({
      image_url: imageUrl,
      image_source_url: sourceUrl ?? existing.image_source_url,
      posted_at: postedAt,
      updated_at: now,
    })
    .eq("tweet_id", tweetId);

  if (updErr) {
    console.error("[x_live_schedules] update:", updErr.message);
    return "error";
  }
  return "updated";
}
