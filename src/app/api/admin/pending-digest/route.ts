import { NextResponse } from "next/server";

import { sendDiscordWebhook } from "@/lib/discord-job-alert";
import { hasLiveAgentSecret } from "@/lib/live-agent-auth";
import { buildPendingDigestPayload, loadPendingCounts } from "@/lib/pending-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twice-daily Discord digest of fan art + HBD cards still waiting for review.
 * Called by pg_cron (scripts/setup-pending-digest-cron.ts) with the live agent secret.
 *
 *   POST /api/admin/pending-digest          → sends when something is pending
 *   POST /api/admin/pending-digest?dry=1    → returns the message, sends nothing
 */
export async function POST(request: Request) {
  if (!hasLiveAgentSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  let counts;
  try {
    counts = await loadPendingCounts();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[pending-digest] count failed:", message);
    return NextResponse.json({ ok: false, error: "count failed" }, { status: 500 });
  }

  const payload = buildPendingDigestPayload(counts);
  if (!payload) {
    return NextResponse.json({ ok: true, sent: false, reason: "nothing pending", counts });
  }
  if (dryRun) {
    return NextResponse.json({ ok: true, sent: false, reason: "dry run", counts, payload });
  }

  const result = await sendDiscordWebhook(payload);
  if (!result.ok) {
    // e.g. "webhook not set" / "discord HTTP 404" — so the cron check and logs say why.
    return NextResponse.json({ ok: false, sent: false, reason: result.reason, counts }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent: true, counts });
}
