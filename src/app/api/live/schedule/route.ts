import { NextResponse } from "next/server";

import {
  thisAndNextWeekRangeYmd,
  isYmd,
} from "@/lib/events";
import {
  loadLiveStreamsInRange,
  mergeLiveWeeksWithStreams,
} from "@/lib/live-streams";

/** Always fresh — ranged schedule for home / live calendar. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    let from: string;
    let to: string;

    if (fromParam || toParam) {
      if (!fromParam || !toParam || !isYmd(fromParam) || !isYmd(toParam)) {
        return NextResponse.json(
          { error: "from and to must be YYYY-MM-DD" },
          { status: 400 }
        );
      }
      if (fromParam > toParam) {
        return NextResponse.json(
          { error: "from must be <= to" },
          { status: 400 }
        );
      }
      from = fromParam;
      to = toParam;
    } else {
      const fallback = thisAndNextWeekRangeYmd();
      from = fallback.from;
      to = fallback.to;
    }

    const streams = await loadLiveStreamsInRange(from, to, 500);
    const weeks = mergeLiveWeeksWithStreams([], streams);
    return NextResponse.json(
      { weeks, from, to },
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
