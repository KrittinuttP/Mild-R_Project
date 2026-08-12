/**
 * Shared helper: after saving real YouTube lives, delete matching manual mocks.
 * Same rules as Edge youtube-tracker / manual API (date + channel + ±3h).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  collectPreviewIdsToDelete,
  type PreviewLikeRow,
} from "../../src/lib/live-preview-match";

export async function removeMatchingPreviewsForReals(
  supabase: SupabaseClient,
  reals: PreviewLikeRow[],
  opts?: { dryRun?: boolean }
): Promise<string[]> {
  const realOnly = reals.filter(
    (r) => r.video_id && !String(r.video_id).startsWith("manual-")
  );
  if (realOnly.length === 0) return [];

  const { data, error } = await supabase
    .from("mild_r_live_streams")
    .select(
      "video_id, channel_id, is_own_channel, scheduled_start, scheduled_start_first, actual_start, actual_end, metadata"
    )
    .or("video_id.like.manual-%,metadata->>preview.eq.true");

  if (error) {
    console.error("⚠ preview lookup:", error.message);
    return [];
  }

  const toDelete = collectPreviewIdsToDelete(
    realOnly,
    (data || []) as PreviewLikeRow[]
  );
  if (toDelete.length === 0) return [];

  if (opts?.dryRun) {
    console.log(`  [dry-run] would delete mocks: ${toDelete.join(", ")}`);
    return toDelete;
  }

  const { error: delError } = await supabase
    .from("mild_r_live_streams")
    .delete()
    .in("video_id", toDelete);

  if (delError) {
    console.error("⚠ preview delete:", delError.message);
    return [];
  }

  console.log(`  🧹 deleted matching mocks: ${toDelete.length}`);
  return toDelete;
}

/** One-shot: scan all reals vs all mocks and purge matches. */
export async function purgeStalePreviewMocks(
  supabase: SupabaseClient,
  opts?: { dryRun?: boolean }
): Promise<{ deleted: string[]; mockCount: number; realCount: number }> {
  const [{ data: mocks, error: mErr }, { data: reals, error: rErr }] =
    await Promise.all([
      supabase
        .from("mild_r_live_streams")
        .select(
          "video_id, channel_id, is_own_channel, scheduled_start, scheduled_start_first, actual_start, actual_end, metadata"
        )
        .or("video_id.like.manual-%,metadata->>preview.eq.true"),
      supabase
        .from("mild_r_live_streams")
        .select(
          "video_id, channel_id, is_own_channel, scheduled_start, scheduled_start_first, actual_start, actual_end, metadata"
        )
        .not("video_id", "like", "manual-%"),
    ]);

  if (mErr || rErr) {
    throw new Error(mErr?.message || rErr?.message || "lookup failed");
  }

  const realRows = ((reals || []) as PreviewLikeRow[]).filter(
    (r) => r.metadata?.preview !== true
  );
  const mockRows = (mocks || []) as PreviewLikeRow[];
  const toDelete = collectPreviewIdsToDelete(realRows, mockRows);

  if (toDelete.length === 0 || opts?.dryRun) {
    return {
      deleted: toDelete,
      mockCount: mockRows.length,
      realCount: realRows.length,
    };
  }

  const { error: delError } = await supabase
    .from("mild_r_live_streams")
    .delete()
    .in("video_id", toDelete);

  if (delError) throw new Error(delError.message);

  return {
    deleted: toDelete,
    mockCount: mockRows.length,
    realCount: realRows.length,
  };
}
