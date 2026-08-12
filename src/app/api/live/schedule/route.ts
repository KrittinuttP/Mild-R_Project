import { NextResponse } from "next/server";

import {
  loadLiveStreams,
  mergeLiveWeeksWithStreams,
} from "@/lib/live-streams";

/** Always fresh — used when client detects a hard reload (F5). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const streams = await loadLiveStreams();
    const weeks = mergeLiveWeeksWithStreams([], streams);
    return NextResponse.json(
      { weeks },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "load failed";
    console.error("[api/live/schedule]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
