import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  CREDITS_PER_TWEET,
  TIMELINE_CREDITS_PER_PAGE,
} from "@/lib/x-credits-pricing";

const X_SYNC_SOURCES = ["edge-x-incremental", "edge-x-backfill"];
const DAY_MS = 24 * 60 * 60 * 1000;

export type XCreditRun = {
  createdAt: string;
  source: string;
  mode: "search" | "timeline";
  newPosts: number | null;
  credits: number;
  estimated: boolean;
};

export type XCreditUsage = {
  today: number;
  last7d: number;
  last30d: number;
  allTime: number;
  runs30d: number;
  postsPerDay30d: number | null;
  firstRunAt: string | null;
  recent: XCreditRun[];
};

export type XCreditBalance =
  | {
      ok: true;
      /** Recharged + bonus — what the API can still spend. */
      credits: number | null;
      recharge: number | null;
      /** Bonus credits expire 30 days after the recharge that granted them. */
      bonus: number | null;
      checkedAt: string;
    }
  | { ok: false; error: string };

type LogRow = {
  created_at: string;
  source: string;
  credits_used: unknown;
  fetched: unknown;
  pages: unknown;
  mode: unknown;
  new_count: unknown;
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Runs before credit tracking have no `creditsUsed` — rebuild it from fetched/pages. */
function runCredits(row: LogRow): { credits: number; estimated: boolean } {
  const logged = num(row.credits_used);
  if (logged != null) return { credits: logged, estimated: false };
  const pages = num(row.pages) ?? 1;
  const fetched = num(row.fetched);
  const credits =
    fetched != null
      ? Math.max(pages * CREDITS_PER_TWEET, fetched * CREDITS_PER_TWEET)
      : pages * TIMELINE_CREDITS_PER_PAGE;
  return { credits, estimated: true };
}

function bangkokDayStartMs(now: Date): number {
  const ymd = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  return Date.parse(`${ymd}T00:00:00+07:00`);
}

export async function loadXCreditUsage(): Promise<XCreditUsage | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mild_r_sync_logs")
    .select(
      "created_at, source, credits_used:meta->creditsUsed, fetched:meta->fetched, pages:meta->pages, mode:meta->mode, new_count:meta->newCount"
    )
    .in("source", X_SYNC_SOURCES)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("[x-credits] logs:", error.message);
    return null;
  }

  const rows = (data ?? []) as LogRow[];
  const now = new Date();
  const todayStart = bangkokDayStartMs(now);
  const since7d = now.getTime() - 7 * DAY_MS;
  const since30d = now.getTime() - 30 * DAY_MS;

  let today = 0;
  let last7d = 0;
  let last30d = 0;
  let allTime = 0;
  let runs30d = 0;
  let posts30d = 0;
  let oldest30d: number | null = null;

  const runs: XCreditRun[] = rows.map((row) => {
    const { credits, estimated } = runCredits(row);
    const at = Date.parse(row.created_at);
    const newPosts = num(row.new_count);

    allTime += credits;
    if (at >= since30d) {
      last30d += credits;
      runs30d += 1;
      if (row.source === "edge-x-incremental") posts30d += newPosts ?? 0;
      oldest30d = oldest30d == null ? at : Math.min(oldest30d, at);
    }
    if (at >= since7d) last7d += credits;
    if (at >= todayStart) today += credits;

    return {
      createdAt: row.created_at,
      source: row.source,
      mode: row.mode === "search" ? "search" : "timeline",
      newPosts,
      credits,
      estimated,
    };
  });

  const spanDays =
    oldest30d == null ? 0 : Math.max(1, (now.getTime() - oldest30d) / DAY_MS);

  return {
    today,
    last7d,
    last30d,
    allTime,
    runs30d,
    postsPerDay30d: spanDays > 0 ? posts30d / spanDays : null,
    firstRunAt: rows.length ? rows[rows.length - 1].created_at : null,
    recent: runs.slice(0, 15),
  };
}

/** Live balance via the x-feed-sync Edge Function (twitterapi.io key stays server-side in Supabase). */
export async function loadXCreditBalance(): Promise<XCreditBalance> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase ยังไม่ได้ตั้งค่า" };
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.functions.invoke("x-feed-sync", {
      body: { action: "credits" },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    const body = (data ?? {}) as {
      rechargeCredits?: unknown;
      bonusCredits?: unknown;
      checkedAt?: unknown;
    };
    const recharge = num(body.rechargeCredits);
    const bonus = num(body.bonusCredits);
    return {
      ok: true,
      credits: recharge == null && bonus == null ? null : (recharge ?? 0) + (bonus ?? 0),
      recharge,
      bonus,
      checkedAt:
        typeof body.checkedAt === "string" ? body.checkedAt : new Date().toISOString(),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
