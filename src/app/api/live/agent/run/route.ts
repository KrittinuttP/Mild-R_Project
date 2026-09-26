import { NextResponse } from "next/server";

import {
  loadPendingLiveSchedules,
  processLiveScheduleRow,
  redactAgentSecrets,
} from "@/lib/live-schedule-agent";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LIVE_SCHEDULE_AGENT_SOURCE,
  summarizeLiveAgentRun,
  writeSyncLog,
} from "@/lib/sync-logs";

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
  /** Retry cron: no sync log when nothing is pending / due. */
  quietWhenIdle?: unknown;
};

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const quietWhenIdle = body.quietWhenIdle === true;
  const tweetId =
    typeof body.tweetId === "string" && body.tweetId.trim()
      ? body.tweetId.trim()
      : undefined;

  const apiBase = new URL(request.url).origin;
  const supabase = createAdminClient();

  try {
    const rows = await loadPendingLiveSchedules(supabase, { limit, tweetId });

    if (rows.length === 0) {
      if (!quietWhenIdle) {
        await writeSyncLog(
          summarizeLiveAgentRun({
            dryRun,
            via: "api",
            processed: 0,
            results: [],
          })
        );
      }
      return NextResponse.json({
        ok: true,
        dryRun,
        processed: 0,
        message: "No pending rows",
        results: [],
      });
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      await writeSyncLog({
        source: LIVE_SCHEDULE_AGENT_SOURCE,
        status: "error",
        message: "GEMINI_API_KEY is not configured on this server",
        saved_count: 0,
        meta: { via: "api" },
      });
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on this server" },
        { status: 500 }
      );
    }

    const results = [];
    for (const row of rows) {
      results.push(
        await processLiveScheduleRow(supabase, row, { dryRun, apiBase })
      );
    }

    const summaryResults = results.map((r) => ({
      tweet_id: r.tweet_id,
      status: r.status,
      items: r.items.length,
      toInsert: r.toInsert?.length ?? null,
      skippedDates: r.skippedDates ?? [],
      imported: r.imported,
      error: r.error,
      attempt: r.attempt,
      nextRetryAt: r.nextRetryAt ?? null,
      recovered: r.recovered ?? false,
    }));

    await writeSyncLog(
      summarizeLiveAgentRun({
        dryRun,
        via: "api",
        processed: results.length,
        results: summaryResults,
      })
    );

    return NextResponse.json({
      ok: true,
      dryRun,
      processed: results.length,
      results: summaryResults,
    });
  } catch (err) {
    const message = redactAgentSecrets(
      err instanceof Error ? err.message : String(err)
    );
    await writeSyncLog({
      source: LIVE_SCHEDULE_AGENT_SOURCE,
      status: "error",
      message: message.slice(0, 500),
      saved_count: 0,
      meta: { via: "api", dryRun },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
