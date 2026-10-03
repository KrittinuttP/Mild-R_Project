import { NextResponse } from "next/server";

import { loadVideos, parseVideoKinds } from "@/lib/videos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public: non-live uploads for the Media tabs.
 * - `?kind=video,premiere` / `?kind=short` — filter by kind (comma list)
 * - `?limit=N` — newest N (max 100)
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kinds = parseVideoKinds(params.get("kind"));
  const limitRaw = Number(params.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 24;

  const videos = await loadVideos({ kinds, limit });
  return NextResponse.json(
    { videos, count: videos.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
