import { NextResponse } from "next/server";

import { loadLiveCoverArchive } from "@/lib/live-streams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public: live covers for the Gallery archive (fresh on every page visit).
 * `?limit=N` returns only the newest N (home preview); `total` is always the full count.
 */
export async function GET(request: Request) {
  const limitRaw = Number(new URL(request.url).searchParams.get("limit"));
  const all = await loadLiveCoverArchive();
  const covers =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? all.slice(0, Math.min(Math.floor(limitRaw), 100))
      : all;

  return NextResponse.json(
    { covers, count: covers.length, total: all.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
