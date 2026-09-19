import { NextResponse } from "next/server";

import { loadXLiveSchedulesInRange } from "@/lib/x-live-schedules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isYmd(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

/** Public: X Live Schedule posters in a Bangkok date range (for /live week sync). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!isYmd(from) || !isYmd(to)) {
    return NextResponse.json(
      { error: "from / to ต้องเป็น YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const schedules = await loadXLiveSchedulesInRange(from, to, 40);
  return NextResponse.json(
    { schedules, from, to, count: schedules.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
