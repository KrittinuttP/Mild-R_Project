import type { SupabaseClient } from "@supabase/supabase-js";

import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  LiveTrendStreamItem,
  LiveViewPeakStream,
  LiveViewPeaks,
  LiveViewTrendRow,
  LiveViewTrendTotals,
  LiveKindStats,
  TrendGrain,
} from "@/types/live-view-trends";

export const RANGE_DAYS: Record<TrendGrain, number> = {
  day: 90,
  month: 730,
  year: 1826,
};

const STREAM_SELECT =
  "video_id, title, url, channel_name, scheduled_start, actual_start, actual_end, thumbnail_url, views_on_end, latest_views, is_own_channel, is_collab, metadata";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(value: string | undefined | null): value is string {
  if (!value || !YMD_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Today as YYYY-MM-DD in Asia/Bangkok */
export function bangkokYmdToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function defaultFromToYmd(grain: TrendGrain): {
  from: string;
  to: string;
} {
  const to = bangkokYmdToday();
  const from = addDaysYmd(to, -RANGE_DAYS[grain]);
  return { from, to };
}

export type TrendGrainRanges = Record<
  TrendGrain,
  { from: string; to: string }
>;

export function defaultGrainRanges(): TrendGrainRanges {
  return {
    day: defaultFromToYmd("day"),
    month: defaultFromToYmd("month"),
    year: defaultFromToYmd("year"),
  };
}

function resolveYmdPair(
  fromParam: string | undefined | null,
  toParam: string | undefined | null,
  grain: TrendGrain
): { from: string; to: string } {
  const defaults = defaultFromToYmd(grain);
  const from = isValidYmd(fromParam) ? fromParam : defaults.from;
  const to = isValidYmd(toParam) ? toParam : defaults.to;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Per-grain calendar ranges from URL (independent filters). */
export function parseGrainRanges(
  params: {
    from?: string;
    to?: string;
    from_day?: string;
    to_day?: string;
    from_month?: string;
    to_month?: string;
    from_year?: string;
    to_year?: string;
  },
  activeGrain: TrendGrain
): TrendGrainRanges {
  const legacyFrom = params.from;
  const legacyTo = params.to;

  function forGrain(
    grain: TrendGrain,
    fromKey: string | undefined,
    toKey: string | undefined
  ) {
    const hasSpecific = isValidYmd(fromKey) || isValidYmd(toKey);
    if (hasSpecific) return resolveYmdPair(fromKey, toKey, grain);
    if (grain === activeGrain) {
      return resolveYmdPair(legacyFrom, legacyTo, grain);
    }
    return defaultFromToYmd(grain);
  }

  return {
    day: forGrain("day", params.from_day, params.to_day),
    month: forGrain("month", params.from_month, params.to_month),
    year: forGrain("year", params.from_year, params.to_year),
  };
}

export function grainRangesToSearchParams(
  ranges: TrendGrainRanges
): Record<string, string> {
  return {
    from_day: ranges.day.from,
    to_day: ranges.day.to,
    from_month: ranges.month.from,
    to_month: ranges.month.to,
    from_year: ranges.year.from,
    to_year: ranges.year.to,
  };
}

/** Inclusive Bangkok calendar dates → UTC timestamptz bounds for queries */
export function bangkokInclusiveToUtcRange(
  fromYmd: string,
  toYmd: string
): { from: string; to: string } {
  let start = fromYmd;
  let end = toYmd;
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const [fy, fm, fd] = start.split("-").map(Number);
  const [ty, tm, td] = end.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd, 0, 0, 0) - 7 * 3600 * 1000;
  const toMs = Date.UTC(ty, tm - 1, td, 0, 0, 0) - 7 * 3600 * 1000 + 86400000;
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
}

export function resolveDateRange(options: {
  grain: TrendGrain;
  fromYmd?: string | null;
  toYmd?: string | null;
}): { fromYmd: string; toYmd: string; from: string; to: string } {
  const defaults = defaultFromToYmd(options.grain);
  const fromYmd = isValidYmd(options.fromYmd) ? options.fromYmd : defaults.from;
  const toYmd = isValidYmd(options.toYmd) ? options.toYmd : defaults.to;
  const utc = bangkokInclusiveToUtcRange(fromYmd, toYmd);
  return {
    fromYmd: fromYmd <= toYmd ? fromYmd : toYmd,
    toYmd: fromYmd <= toYmd ? toYmd : fromYmd,
    ...utc,
  };
}

/** Bangkok-local bucket start/end as UTC ISO strings. */
export function getBucketRange(
  bucket: string,
  grain: TrendGrain
): { from: string; to: string } | null {
  const parts = bucket.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;

  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0) - 7 * 3600 * 1000;
  let endMs: number;
  if (grain === "day") {
    endMs = startMs + 24 * 3600 * 1000;
  } else if (grain === "month") {
    endMs = Date.UTC(y, m, 1, 0, 0, 0) - 7 * 3600 * 1000;
  } else {
    endMs = Date.UTC(y + 1, 0, 1, 0, 0, 0) - 7 * 3600 * 1000;
  }

  return {
    from: new Date(startMs).toISOString(),
    to: new Date(endMs).toISOString(),
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeBucket(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function mapPeak(
  row: Record<string, unknown> | null | undefined,
  viewsKey: "latest_views" | "views_on_end"
): LiveViewPeakStream | null {
  if (!row?.video_id) return null;
  return {
    video_id: String(row.video_id),
    title: (row.title as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    channel_name: (row.channel_name as string | null) ?? null,
    actual_end: (row.actual_end as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    views: toNumber(row[viewsKey]),
    views_on_end: toNumber(row.views_on_end),
    latest_views: toNumber(row.latest_views),
  };
}

function parseLikes(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const likes = (metadata as Record<string, unknown>).likes;
  if (likes == null) return null;
  const n = typeof likes === "number" ? likes : Number(likes);
  return Number.isFinite(n) ? n : null;
}

export function sumTrendRows(rows: LiveViewTrendRow[]): LiveViewTrendTotals {
  return rows.reduce(
    (acc, row) => ({
      views_on_end: acc.views_on_end + row.views_on_end,
      latest_views: acc.latest_views + row.latest_views,
      views_diff: acc.views_diff + row.views_diff,
      stream_count: acc.stream_count + row.stream_count,
    }),
    { views_on_end: 0, latest_views: 0, views_diff: 0, stream_count: 0 }
  );
}

/** Server-side aggregate via Postgres RPC (no row fan-out). */
export async function loadLiveViewTrends(options: {
  grain: TrendGrain;
  ownOnly: boolean;
  fromYmd?: string | null;
  toYmd?: string | null;
}): Promise<LiveViewTrendRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { from, to } = resolveDateRange(options);

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("mild_r_live_view_trends", {
      p_grain: options.grain,
      p_own_only: options.ownOnly,
      p_from: from,
      p_to: to,
    });

    if (error) {
      console.error("[live_view_trends]", error.message);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      bucket: normalizeBucket(row.bucket),
      views_on_end: toNumber(row.views_on_end),
      latest_views: toNumber(row.latest_views),
      views_diff: toNumber(row.views_diff),
      stream_count: toNumber(row.stream_count),
      peak_views_on_end: toNumber(row.peak_views_on_end),
    }));
  } catch (err) {
    console.error("[live_view_trends]", err);
    return [];
  }
}

async function fetchPeakByColumn(
  supabase: SupabaseClient,
  column: "latest_views" | "views_on_end",
  from: string,
  to: string,
  ownOnly: boolean
): Promise<LiveViewPeakStream | null> {
  let q = supabase
    .from("mild_r_live_streams")
    .select(STREAM_SELECT)
    .not("actual_end", "is", null)
    .gte("actual_end", from)
    .lt("actual_end", to)
    .order(column, { ascending: false, nullsFirst: false })
    .limit(1);

  if (ownOnly) q = q.eq("is_own_channel", true);

  const { data, error } = await q;
  if (error) {
    console.error(`[live_view_peaks:${column}]`, error.message);
    return null;
  }
  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  return mapPeak(row, column);
}

/** Top stream by latest_views and by views_on_end in the selected calendar range. */
export async function loadLiveViewPeaks(options: {
  grain: TrendGrain;
  ownOnly: boolean;
  fromYmd?: string | null;
  toYmd?: string | null;
  bucket?: string | null;
}): Promise<LiveViewPeaks> {
  if (!isSupabaseConfigured()) return { byLatest: null, byOnEnd: null };

  const range = options.bucket
    ? getBucketRange(options.bucket, options.grain)
    : resolveDateRange(options);
  if (!range) return { byLatest: null, byOnEnd: null };

  try {
    const supabase = createPublicClient();
    const [byLatest, byOnEnd] = await Promise.all([
      fetchPeakByColumn(
        supabase,
        "latest_views",
        range.from,
        range.to,
        options.ownOnly
      ),
      fetchPeakByColumn(
        supabase,
        "views_on_end",
        range.from,
        range.to,
        options.ownOnly
      ),
    ]);
    return { byLatest, byOnEnd };
  } catch (err) {
    console.error("[live_view_peaks]", err);
    return { byLatest: null, byOnEnd: null };
  }
}

/** Exclusive kind stats (Member > Collab > Solo) for streams ended in the calendar range. */
export async function loadLiveKindStats(options: {
  grain: TrendGrain;
  ownOnly: boolean;
  fromYmd?: string | null;
  toYmd?: string | null;
}): Promise<LiveKindStats> {
  const empty: LiveKindStats = { member: 0, collab: 0, solo: 0, total: 0 };
  if (!isSupabaseConfigured()) return empty;

  const { from, to } = resolveDateRange(options);

  try {
    const supabase = createPublicClient();
    let member = 0;
    let collab = 0;
    let solo = 0;
    const page = 1000;
    let fromIdx = 0;

    for (;;) {
      let q = supabase
        .from("mild_r_live_streams")
        .select("video_id, is_collab, metadata")
        .not("actual_end", "is", null)
        .gte("actual_end", from)
        .lt("actual_end", to)
        .order("actual_end", { ascending: false })
        .range(fromIdx, fromIdx + page - 1);

      if (options.ownOnly) q = q.eq("is_own_channel", true);

      const { data, error } = await q;
      if (error) {
        console.error("[live_kind_stats]", error.message);
        break;
      }
      const batch = data ?? [];
      for (const row of batch) {
        const meta = row.metadata as Record<string, unknown> | null;
        const isMember = meta?.member === true;
        if (isMember) member += 1;
        else if (row.is_collab) collab += 1;
        else solo += 1;
      }
      if (batch.length < page) break;
      fromIdx += page;
    }

    return { member, collab, solo, total: member + collab + solo };
  } catch (err) {
    console.error("[live_kind_stats]", err);
    return empty;
  }
}

export async function loadStreamsInBucket(
  supabase: SupabaseClient,
  options: {
    bucket: string;
    grain: TrendGrain;
    ownOnly: boolean;
  }
): Promise<LiveTrendStreamItem[]> {
  const range = getBucketRange(options.bucket, options.grain);
  if (!range) return [];

  let q = supabase
    .from("mild_r_live_streams")
    .select(STREAM_SELECT)
    .not("actual_end", "is", null)
    .gte("actual_end", range.from)
    .lt("actual_end", range.to)
    .order("latest_views", { ascending: false, nullsFirst: false })
    .limit(100);

  if (options.ownOnly) q = q.eq("is_own_channel", true);

  const { data, error } = await q;
  if (error) {
    console.error("[live_view_bucket_streams]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const meta = row.metadata as Record<string, unknown> | null;
    return {
      video_id: row.video_id as string,
      title: (row.title as string | null) ?? null,
      url: (row.url as string | null) ?? null,
      channel_name: (row.channel_name as string | null) ?? null,
      scheduled_start: (row.scheduled_start as string | null) ?? null,
      actual_start: (row.actual_start as string | null) ?? null,
      actual_end: (row.actual_end as string | null) ?? null,
      thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      views_on_end: row.views_on_end as number | null,
      latest_views: row.latest_views as number | null,
      is_own_channel: row.is_own_channel as boolean | null,
      is_collab: row.is_collab as boolean | null,
      is_member: meta?.member === true,
      likes: parseLikes(row.metadata),
    };
  });
}

/** Exclusive: Member > Collab > Solo */
export function countKindStats(
  items: Array<{ is_member?: boolean | null; is_collab?: boolean | null }>
): LiveKindStats {
  let member = 0;
  let collab = 0;
  let solo = 0;
  for (const item of items) {
    if (item.is_member) member += 1;
    else if (item.is_collab) collab += 1;
    else solo += 1;
  }
  return { member, collab, solo, total: member + collab + solo };
}
