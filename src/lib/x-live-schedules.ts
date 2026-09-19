import type { SupabaseClient } from "@supabase/supabase-js";

import {
  addDays,
  formatISODate,
  parseISODate,
  startOfWeekSunday,
} from "@/lib/events";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

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

/** Public row for /live week poster history. */
export type XLiveScheduleHistoryRow = {
  tweet_id: string;
  image_url: string;
  image_source_url: string | null;
  posted_at: string | null;
  /** Sunday YYYY-MM-DD this poster belongs to (Sat post → +1). */
  schedule_week_start: string | null;
  status: XLiveScheduleStatus;
  agent_processed_at: string | null;
  error_message: string | null;
  parsed_json: unknown;
  original_url: string;
};

function addDaysYmd(ymd: string, days: number): string {
  return formatISODate(addDays(parseISODate(ymd), days));
}

/**
 * Bangkok post date → schedule week Sunday.
 * If the post day is Saturday, bump +1 day first (belongs to the coming week).
 */
export function scheduleWeekStartFromPostedAt(
  postedAt: string | null | undefined
): string | null {
  const ymd = bangkokDateFromIso(postedAt ?? null);
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun … 6 Sat
  const anchor = dow === 6 ? addDaysYmd(ymd, 1) : ymd;
  return formatISODate(startOfWeekSunday(parseISODate(anchor)));
}

function postedSortKey(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Pick the Live Schedule poster for a Sun–Sat week via schedule_week_start.
 */
export function matchScheduleForWeek(
  rows: XLiveScheduleHistoryRow[],
  weekStart: string
): XLiveScheduleHistoryRow | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || rows.length === 0) return null;

  const byPostedDesc = [...rows].sort(
    (a, b) => postedSortKey(b.posted_at) - postedSortKey(a.posted_at)
  );

  const exact = byPostedDesc.filter(
    (row) => row.schedule_week_start === weekStart
  );
  if (exact.length > 0) return exact[0];

  // Fallback for rows not yet backfilled
  const computed = byPostedDesc.find(
    (row) => scheduleWeekStartFromPostedAt(row.posted_at) === weekStart
  );
  return computed ?? null;
}

export async function loadXLiveSchedulesInRange(
  fromYmd: string,
  toYmd: string,
  limit = 40
): Promise<XLiveScheduleHistoryRow[]> {
  if (!isSupabaseConfigured()) return [];
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(toYmd)
  ) {
    return [];
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_x_live_schedules")
      .select(
        "tweet_id, image_url, image_source_url, posted_at, schedule_week_start, status, agent_processed_at, error_message, parsed_json"
      )
      .not("image_url", "is", null)
      .gte("schedule_week_start", fromYmd)
      .lte("schedule_week_start", toYmd)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(Math.max(1, Math.min(limit, 80)));

    if (error) {
      console.error("[x_live_schedules] load range:", error.message);
      return [];
    }

    return ((data ?? []) as Array<Record<string, unknown>>)
      .map((row) => {
        const tweetId = typeof row.tweet_id === "string" ? row.tweet_id : "";
        const imageUrl =
          typeof row.image_url === "string" ? row.image_url.trim() : "";
        if (!tweetId || !imageUrl) return null;
        const status = row.status as XLiveScheduleStatus;
        if (
          status !== "pending" &&
          status !== "imported" &&
          status !== "skipped" &&
          status !== "failed"
        ) {
          return null;
        }
        const weekStart =
          typeof row.schedule_week_start === "string"
            ? row.schedule_week_start
            : null;
        return {
          tweet_id: tweetId,
          image_url: imageUrl,
          image_source_url:
            typeof row.image_source_url === "string"
              ? row.image_source_url
              : null,
          posted_at: typeof row.posted_at === "string" ? row.posted_at : null,
          schedule_week_start: weekStart,
          status,
          agent_processed_at:
            typeof row.agent_processed_at === "string"
              ? row.agent_processed_at
              : null,
          error_message:
            typeof row.error_message === "string" ? row.error_message : null,
          parsed_json: row.parsed_json ?? null,
          original_url: `https://x.com/i/status/${tweetId}`,
        } satisfies XLiveScheduleHistoryRow;
      })
      .filter((r): r is XLiveScheduleHistoryRow => r != null);
  } catch (err) {
    console.error("[x_live_schedules] load range:", err);
    return [];
  }
}

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
  const scheduleWeekStart = scheduleWeekStartFromPostedAt(postedAt);

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
    const { error: insErr } = await supabase
      .from("mild_r_x_live_schedules")
      .insert({
        tweet_id: tweetId,
        image_url: imageUrl,
        image_source_url: sourceUrl,
        posted_at: postedAt,
        schedule_week_start: scheduleWeekStart,
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
      schedule_week_start: scheduleWeekStart,
      updated_at: now,
    })
    .eq("tweet_id", tweetId);

  if (updErr) {
    console.error("[x_live_schedules] update:", updErr.message);
    return "error";
  }
  return "updated";
}
