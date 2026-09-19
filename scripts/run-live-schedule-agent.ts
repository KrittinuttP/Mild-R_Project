/**
 * Process pending X Live Schedule posters with Gemini/Vertex → /api/live/manual
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/run-live-schedule-agent.ts
 *   npx tsx --env-file=.env.local scripts/run-live-schedule-agent.ts --limit=1
 *   npx tsx --env-file=.env.local scripts/run-live-schedule-agent.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/run-live-schedule-agent.ts --tweet-id=...
 *
 * Auth (Google AI Studio only — free-tier friendly):
 *   GEMINI_API_KEY=...
 *   GEMINI_MODEL=gemini-flash-lite-latest   # optional
 *
 * Manual API target:
 *   LIVE_AGENT_API_BASE or NEXT_PUBLIC_SITE_URL (default http://localhost:3000)
 *   → requires Next server running, or point at production
 */
import { createClient } from "@supabase/supabase-js";

import {
  loadPendingLiveSchedules,
  processLiveScheduleRow,
} from "../src/lib/live-schedule-agent";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const limit = Number(argValue("limit") ?? "1");
  const tweetId = argValue("tweet-id");
  const dryRun = hasFlag("dry-run");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const rows = await loadPendingLiveSchedules(supabase, {
    limit: Number.isFinite(limit) ? limit : 1,
    tweetId,
  });

  if (rows.length === 0) {
    console.log(JSON.stringify({ ok: true, processed: 0, message: "No rows" }));
    return;
  }

  console.log(
    `Live schedule agent · ${rows.length} row(s)${dryRun ? " · dry-run" : ""}`
  );

  const results = [];
  for (const row of rows) {
    console.log(`  → ${row.tweet_id}`);
    const result = await processLiveScheduleRow(supabase, row, { dryRun });
    results.push(result);
    console.log(
      `    ${result.status}` +
        (result.imported != null ? ` imported=${result.imported}` : "") +
        (result.error ? ` · ${result.error}` : "") +
        (result.items.length ? ` · items=${result.items.length}` : "") +
        (result.toInsert?.length != null
          ? ` · toInsert=${result.toInsert.length}`
          : "") +
        (result.skippedDates?.length
          ? ` · skippedDates=${result.skippedDates.join(",")}`
          : "")
    );
  }

  console.log(
    JSON.stringify(
      {
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
          sample: (r.toInsert ?? r.items).slice(0, 2),
        })),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
