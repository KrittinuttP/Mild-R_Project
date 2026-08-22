import { NextResponse } from "next/server";

import { bangkokInclusiveToUtcRange } from "@/lib/live-view-trends";
import {
  loadSyncLogs,
  type SyncLogSourceTab,
} from "@/lib/sync-logs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTab(value: string | null): SyncLogSourceTab {
  if (value === "main" || value === "search" || value === "refresh" || value === "other") return value;
  return "all";
}

function isYmd(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceTab = parseTab(searchParams.get("source"));
  const fromYmd = searchParams.get("from");
  const toYmd = searchParams.get("to");
  const limitRaw = Number(searchParams.get("limit") ?? "1000");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 1000;

  if (!isYmd(fromYmd) || !isYmd(toYmd)) {
    return NextResponse.json(
      { error: "from / to ต้องเป็น YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const { from, to } = bangkokInclusiveToUtcRange(fromYmd, toYmd);
  const logs = await loadSyncLogs({
    fromIso: from,
    toIso: to,
    sourceTab,
    limit,
  });

  return NextResponse.json(
    { logs, fromYmd, toYmd, sourceTab, count: logs.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
