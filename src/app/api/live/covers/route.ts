import { NextResponse } from "next/server";

import {
  liveCoverYearsOf,
  loadLatestLiveCovers,
  loadLiveCoverArchive,
  loadLiveCoverYears,
  loadLiveCoversForYear,
  type LiveCoverItem,
} from "@/lib/live-streams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function coversResponse(body: {
  covers: LiveCoverItem[];
  year: string | null;
  years: string[];
}) {
  return NextResponse.json(
    { ...body, count: body.covers.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Public: live covers for the Gallery archive (fresh on every page visit).
 * - `?limit=N` — newest N only (home preview)
 * - `?year=YYYY` / `?year=latest` — one Bangkok year, plus the list of years
 * - no params — the whole archive (search / "all years")
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const limitRaw = Number(params.get("limit"));
  if (Number.isFinite(limitRaw) && limitRaw > 0) {
    const covers = await loadLatestLiveCovers(
      Math.min(Math.floor(limitRaw), 100)
    );
    return coversResponse({ covers, year: null, years: [] });
  }

  const yearParam = params.get("year");
  if (yearParam) {
    if (yearParam !== "latest" && !/^\d{4}$/.test(yearParam)) {
      return NextResponse.json(
        { error: "year ต้องเป็น YYYY หรือ latest" },
        { status: 400 }
      );
    }

    if (yearParam === "latest") {
      const years = await loadLiveCoverYears();
      const year = years[0] ?? null;
      const covers = year ? await loadLiveCoversForYear(year) : [];
      return coversResponse({ covers, year, years });
    }

    const [years, covers] = await Promise.all([
      loadLiveCoverYears(),
      loadLiveCoversForYear(yearParam),
    ]);
    return coversResponse({ covers, year: yearParam, years });
  }

  const covers = await loadLiveCoverArchive();
  return coversResponse({ covers, year: null, years: liveCoverYearsOf(covers) });
}
