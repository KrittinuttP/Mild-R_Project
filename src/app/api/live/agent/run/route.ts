import { NextResponse } from "next/server";

import {
  loadPendingLiveSchedules,
  processLiveScheduleRow,
} from "@/lib/live-schedule-agent";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret =
    process.env.LIVE_AGENT_CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization")?.trim() || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-live-agent-secret")?.trim() || "";
  return bearer === secret || header === secret;
}

type RunBody = {
  limit?: unknown;
  dryRun?: unknown;
  tweetId?: unknown;
};

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on this server" },
      { status: 500 }
    );
  }

  let body: RunBody = {};
  try {
    body = (await request.json()) as RunBody;
  } catch {
    body = {};
  }

  const limitRaw = Number(body.limit ?? 1);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 5))
    : 1;
  const dryRun = body.dryRun === true;
  const tweetId =
    typeof body.tweetId === "string" && body.tweetId.trim()
      ? body.tweetId.trim()
      : undefined;

  const apiBase = new URL(request.url).origin;
  const supabase = createAdminClient();
  const rows = await loadPendingLiveSchedules(supabase, { limit, tweetId });

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      dryRun,
      processed: 0,
      message: "No pending rows",
      results: [],
    });
  }

  const results = [];
  for (const row of rows) {
    results.push(
      await processLiveScheduleRow(supabase, row, { dryRun, apiBase })
    );
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    processed: results.length,
    results: results.map((r) => ({
      tweet_id: r.tweet_id,
      status: r.status,
      items: r.items.length,
      toInsert: r.toInsert?.length ?? null,
      skippedDates: r.skippedDates ?? [],
      imported: r.imported,
      error: r.error,
    })),
  });
}
