import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import {
  getLiveStreamStatus,
  isHiddenLiveRow,
  liveStreamSortKey,
  liveStreamToSlot,
} from "@/lib/live-stream-utils";
import { bangkokInclusiveToUtcRange } from "@/lib/live-view-trends";
import type {
  LiveStreamRow,
  LiveStreamThumbnail,
} from "@/types/live-stream";

export {
  getLiveStreamStatus,
  liveStreamSortKey,
  liveStreamToSlot,
  liveStreamToSlots,
  mergeLiveWeeksWithStreams,
  partitionLiveStreams,
} from "@/lib/live-stream-utils";

const PAGE = 1000;

type PublicClient = ReturnType<typeof createPublicClient>;

const LIVE_LIST_SELECT =
  "video_id, channel_id, channel_name, source_title, title, url, scheduled_start, scheduled_start_first, actual_start, actual_end, thumbnail_url, thumbnail_cached_url, views_on_end, latest_views, is_own_channel, is_collab, metadata, created_at";

async function loadThumbnailsForVideos(
  supabase: PublicClient,
  videoIds: string[]
): Promise<Map<string, LiveStreamThumbnail[]>> {
  const map = new Map<string, LiveStreamThumbnail[]>();
  if (videoIds.length === 0) return map;

  for (let i = 0; i < videoIds.length; i += 200) {
    const chunk = videoIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("mild_r_live_stream_thumbnails")
      .select(
        "id, video_id, storage_path, public_url, source_url, captured_at, is_current"
      )
      .in("video_id", chunk)
      .order("captured_at", { ascending: false });

    if (error) {
      console.error("[live_stream_thumbnails]", error.message);
      continue;
    }

    for (const row of (data ?? []) as LiveStreamThumbnail[]) {
      const list = map.get(row.video_id) ?? [];
      list.push(row);
      map.set(row.video_id, list);
    }
  }

  return map;
}

export type LoadLiveStreamsOptions = {
  /** Include metadata.hidden rows (ops only). */
  includeHidden?: boolean;
};

/** Paginated live rows, optionally narrowed by a PostgREST `or` filter. */
async function selectLiveRows(
  supabase: PublicClient,
  {
    or,
    limit = Number.POSITIVE_INFINITY,
    includeHidden = false,
  }: { or?: string; limit?: number; includeHidden?: boolean } = {}
): Promise<LiveStreamRow[]> {
  const rows: LiveStreamRow[] = [];
  let from = 0;

  while (rows.length < limit) {
    let query = supabase.from("mild_r_live_streams").select(LIVE_LIST_SELECT);
    if (or) query = query.or(or);
    const { data, error } = await query
      .order("actual_start", { ascending: false, nullsFirst: false })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("[live_streams]", error.message);
      break;
    }

    const batch = (data ?? []) as LiveStreamRow[];
    if (batch.length === 0) break;
    rows.push(
      ...(includeHidden ? batch : batch.filter((row) => !isHiddenLiveRow(row)))
    );
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  return Number.isFinite(limit) && rows.length > limit
    ? rows.slice(0, limit)
    : rows;
}

/** Attach thumbnail history and sort newest first. */
async function withThumbnails(
  supabase: PublicClient,
  rows: LiveStreamRow[]
): Promise<LiveStreamRow[]> {
  const thumbs = await loadThumbnailsForVideos(
    supabase,
    rows.map((r) => r.video_id)
  );

  return rows
    .map((row) => ({
      ...row,
      thumbnail_cached_url: row.thumbnail_cached_url ?? null,
      thumbnails: thumbs.get(row.video_id) ?? [],
    }))
    .sort((a, b) => liveStreamSortKey(b) - liveStreamSortKey(a));
}

/** Load all YouTube live rows (paginated) + thumbnail history. */
export async function loadLiveStreams(
  limit = Number.POSITIVE_INFINITY,
  options?: LoadLiveStreamsOptions
): Promise<LiveStreamRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const rows = await selectLiveRows(supabase, {
      limit,
      includeHidden: options?.includeHidden,
    });
    return await withThumbnails(supabase, rows);
  } catch (err) {
    console.error("[live_streams]", err);
    return [];
  }
}

type XLiveCoverRow = {
  video_id: string;
  public_url: string;
  thumb_url: string;
  posted_at: string | null;
};

/** HD covers cached from X announcement posts, keyed by YouTube video id. */
async function loadXCovers(
  rows: LiveStreamRow[],
  supabase?: PublicClient
): Promise<Map<string, XLiveCoverRow>> {
  const map = new Map<string, XLiveCoverRow>();
  const ids = [...new Set(rows.map(youtubeIdOf))];
  if (ids.length === 0 || !isSupabaseConfigured()) return map;

  const client = supabase ?? createPublicClient();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await client
      .from("mild_r_live_stream_x_covers")
      .select("video_id, public_url, thumb_url, posted_at")
      .in("video_id", ids.slice(i, i + 200));

    if (error) {
      console.error("[live_stream_x_covers]", error.message);
      continue;
    }
    for (const row of (data ?? []) as XLiveCoverRow[]) {
      map.set(row.video_id, row);
    }
  }
  return map;
}

function youtubeIdOf(row: LiveStreamRow): string {
  const linked = row.metadata?.linked_video_id;
  return typeof linked === "string" && linked.trim()
    ? linked.trim()
    : row.video_id;
}

export type LiveCoverVersion = {
  url: string;
  /** Small image for the version strip. */
  thumbUrl: string;
  capturedAt: string | null;
  source: "x" | "youtube";
  /** YouTube maxresdefault to try first; a missing one loads as a 120×90 placeholder. */
  hdUrl?: string;
};

/** One live for the Gallery "Live covers" archive. */
export type LiveCoverItem = {
  videoId: string;
  title: string;
  /** Bangkok YYYY-MM-DD (actual start → first scheduled). */
  date: string | null;
  isOwnChannel: boolean;
  isMember: boolean;
  /** Collab in Mild-R's channel (is_collab) or on another channel. */
  isCollab: boolean;
  channelLabel: string;
  /** Small image for the grid. */
  thumbUrl: string;
  /** Full image for the lightbox (X HD when available). */
  coverUrl: string;
  /** X HD first, then YouTube versions newest-first (includes current). */
  versions: LiveCoverVersion[];
  youtubeUrl: string;
};

function isPreviewRow(row: LiveStreamRow): boolean {
  return row.video_id.startsWith("manual-") || row.metadata?.preview === true;
}

/** YouTube mqdefault is 16:9 320×180 — enough for grid tiles. */
function youtubeGridThumb(url: string) {
  if (!url.includes("i.ytimg.com/vi/")) return url;
  return url.replace(
    /\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg/,
    "/mqdefault.jpg"
  );
}

/** Bangkok year (YYYY) a cover is filed under — same anchor as `LiveCoverItem.date`. */
export function liveCoverYear(item: Pick<LiveCoverItem, "date">): string | null {
  return item.date?.slice(0, 4) ?? null;
}

/** Real lives with a cover (Mild-R + collabs), newest first. */
export async function loadLiveCoverArchive(): Promise<LiveCoverItem[]> {
  const rows = await loadLiveStreams();
  return toLiveCoverItems(rows, await loadXCovers(rows));
}

/** Upcoming lives stay "upcoming" for this long past their start (see getLiveStreamStatus). */
const UPCOMING_GRACE_MS = 3 * 60 * 60 * 1000;
/** Extra rows per query to absorb previews / cancelled / cover-less rows. */
const LATEST_BUFFER = 24;

/** Newest `limit` covers (home preview) without loading the whole archive. */
export async function loadLatestLiveCovers(
  limit: number
): Promise<LiveCoverItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const upcomingFrom = new Date(Date.now() - UPCOMING_GRACE_MS).toISOString();
    // Not-yet-started lives sort first but have no actual_start, so fetch them separately.
    const [started, upcoming] = await Promise.all([
      supabase
        .from("mild_r_live_streams")
        .select(LIVE_LIST_SELECT)
        .not("actual_start", "is", null)
        .order("actual_start", { ascending: false })
        .limit(limit + LATEST_BUFFER),
      supabase
        .from("mild_r_live_streams")
        .select(LIVE_LIST_SELECT)
        .is("actual_start", null)
        .or(
          `scheduled_start.gte.${upcomingFrom},scheduled_start_first.gte.${upcomingFrom}`
        )
        .limit(LATEST_BUFFER),
    ]);

    for (const res of [started, upcoming]) {
      if (res.error) console.error("[live_covers_latest]", res.error.message);
    }

    const rows = [
      ...((started.data ?? []) as LiveStreamRow[]),
      ...((upcoming.data ?? []) as LiveStreamRow[]),
    ].filter((row) => !isHiddenLiveRow(row));

    const [withThumbs, xCovers] = await Promise.all([
      withThumbnails(supabase, rows),
      loadXCovers(rows, supabase),
    ]);
    return toLiveCoverItems(withThumbs, xCovers).slice(0, limit);
  } catch (err) {
    console.error("[live_covers_latest]", err);
    return [];
  }
}

/** Covers filed under one Bangkok calendar year (YYYY). */
export async function loadLiveCoversForYear(
  year: string
): Promise<LiveCoverItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const { from, to } = bangkokInclusiveToUtcRange(
      `${year}-01-01`,
      `${year}-12-31`
    );
    const inYear = (column: string) =>
      `and(${column}.gte.${from},${column}.lt.${to})`;
    const rows = await selectLiveRows(supabase, {
      or: [
        inYear("actual_start"),
        inYear("scheduled_start_first"),
        inYear("scheduled_start"),
      ].join(","),
    });

    const [withThumbs, xCovers] = await Promise.all([
      withThumbnails(supabase, rows),
      loadXCovers(rows, supabase),
    ]);
    return toLiveCoverItems(withThumbs, xCovers).filter(
      (item) => liveCoverYear(item) === year
    );
  } catch (err) {
    console.error("[live_covers_year]", err);
    return [];
  }
}

/** Years that have lives, newest first (oldest started live → newest started / upcoming). */
export async function loadLiveCoverYears(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const upcomingFrom = new Date(Date.now() - UPCOMING_GRACE_MS).toISOString();
    const startedEdge = (ascending: boolean) =>
      supabase
        .from("mild_r_live_streams")
        .select("actual_start")
        .not("actual_start", "is", null)
        .order("actual_start", { ascending })
        .limit(1);

    const [oldest, newest, upcoming] = await Promise.all([
      startedEdge(true),
      startedEdge(false),
      supabase
        .from("mild_r_live_streams")
        .select(LIVE_LIST_SELECT)
        .is("actual_start", null)
        .gte("scheduled_start", upcomingFrom)
        .order("scheduled_start", { ascending: false })
        .limit(LATEST_BUFFER),
    ]);

    const yearOf = (iso: string | null | undefined) =>
      bangkokDateFromIso(iso)?.slice(0, 4) ?? null;

    const upcomingYears = toLiveCoverItems(
      ((upcoming.data ?? []) as LiveStreamRow[]).filter(
        (row) => !isHiddenLiveRow(row)
      )
    )
      .map(liveCoverYear)
      .filter((y): y is string => Boolean(y));

    const oldestYear = yearOf(oldest.data?.[0]?.actual_start);
    const latestYear = [
      yearOf(newest.data?.[0]?.actual_start),
      ...upcomingYears,
    ]
      .filter((y): y is string => Boolean(y))
      .sort()
      .at(-1);

    if (!oldestYear || !latestYear) return [];

    const years: string[] = [];
    for (let y = Number(latestYear); y >= Number(oldestYear); y--) {
      years.push(String(y));
    }
    return years;
  } catch (err) {
    console.error("[live_covers_years]", err);
    return [];
  }
}

/** Years present in a loaded cover list, newest first. */
export function liveCoverYearsOf(items: LiveCoverItem[]): string[] {
  const years = new Set<string>();
  for (const item of items) {
    const y = liveCoverYear(item);
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function toLiveCoverItems(
  rows: LiveStreamRow[],
  xCovers: Map<string, XLiveCoverRow> = new Map()
): LiveCoverItem[] {
  const out: LiveCoverItem[] = [];

  for (const row of rows) {
    if (isPreviewRow(row)) continue;
    if (getLiveStreamStatus(row) === "cancelled") continue;

    const slot = liveStreamToSlot(row);
    const current =
      slot.coverUrl ?? slot.coverHistory?.[0]?.url ?? row.thumbnail_url;
    if (!current) continue;

    const videoId = youtubeIdOf(row);
    const xCover = xCovers.get(videoId);
    const versions: LiveCoverVersion[] = xCover
      ? [
          {
            url: xCover.public_url,
            thumbUrl: xCover.thumb_url,
            capturedAt: xCover.posted_at,
            source: "x",
          },
        ]
      : [];
    const seen = new Set<string>();
    for (const v of [
      { url: current, capturedAt: null as string | null },
      ...(slot.coverHistory ?? []),
    ]) {
      if (!v.url || seen.has(v.url)) continue;
      seen.add(v.url);
      versions.push({
        url: v.url,
        thumbUrl: v.url,
        capturedAt: v.capturedAt,
        source: "youtube",
        hdUrl:
          v.url === current && YOUTUBE_ID_RE.test(videoId)
            ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
            : undefined,
      });
    }

    const own = Boolean(row.is_own_channel);

    out.push({
      videoId: row.video_id,
      title: row.title?.trim() || "Untitled live",
      date: bangkokDateFromIso(
        row.actual_start ?? row.scheduled_start_first ?? row.scheduled_start
      ),
      isOwnChannel: own,
      isMember: Boolean(slot.isMember),
      isCollab: slot.kind === "collab",
      channelLabel: own
        ? "Mild-R"
        : row.source_title?.trim() || row.channel_name?.trim() || "Collab",
      thumbUrl: xCover?.thumb_url ?? youtubeGridThumb(current),
      coverUrl: versions[0].url,
      versions,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return out;
}

const STREAM_SELECT =
  "video_id, channel_id, channel_name, source_title, title, url, scheduled_start, scheduled_start_first, actual_start, actual_end, thumbnail_url, thumbnail_cached_url, views_on_end, latest_views, likes_on_end, latest_likes, is_own_channel, is_collab, metadata, created_at, updated_at";

function streamAnchorIso(row: LiveStreamRow): string | null {
  return (
    row.actual_start ??
    row.scheduled_start ??
    row.scheduled_start_first ??
    row.created_at ??
    null
  );
}

/** Rows for specific YouTube video ids (with thumbnail history); missing ids are skipped. */
export async function loadLiveStreamsByIds(
  videoIds: string[]
): Promise<LiveStreamRow[]> {
  if (!isSupabaseConfigured() || videoIds.length === 0) return [];

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_live_streams")
      .select(STREAM_SELECT)
      .in("video_id", videoIds);

    if (error) {
      console.error("[live_streams_by_ids]", error.message);
      return [];
    }
    return await withThumbnails(supabase, (data ?? []) as LiveStreamRow[]);
  } catch (err) {
    console.error("[live_streams_by_ids]", err);
    return [];
  }
}

/**
 * Streams whose anchor time (actual → scheduled → first) falls in the
 * inclusive Bangkok calendar range [fromYmd, toYmd].
 */
export async function loadLiveStreamsInRange(
  fromYmd: string,
  toYmd: string,
  limit = 500,
  options?: LoadLiveStreamsOptions
): Promise<LiveStreamRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { from, to } = bangkokInclusiveToUtcRange(fromYmd, toYmd);
  const cap = Math.min(Math.max(limit, 1), 1000);

  try {
    const supabase = createPublicClient();
    // Broad overlap queries — merge + filter by anchor time client-side
    const [byActual, byScheduled, byFirst] = await Promise.all([
      supabase
        .from("mild_r_live_streams")
        .select(STREAM_SELECT)
        .gte("actual_start", from)
        .lt("actual_start", to)
        .order("actual_start", { ascending: false })
        .limit(cap),
      supabase
        .from("mild_r_live_streams")
        .select(STREAM_SELECT)
        .gte("scheduled_start", from)
        .lt("scheduled_start", to)
        .order("scheduled_start", { ascending: false })
        .limit(cap),
      supabase
        .from("mild_r_live_streams")
        .select(STREAM_SELECT)
        .gte("scheduled_start_first", from)
        .lt("scheduled_start_first", to)
        .order("scheduled_start_first", { ascending: false })
        .limit(cap),
    ]);

    for (const res of [byActual, byScheduled, byFirst]) {
      if (res.error) {
        console.error("[live_streams_range]", res.error.message);
      }
    }

    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const byId = new Map<string, LiveStreamRow>();

    for (const batch of [
      byActual.data,
      byScheduled.data,
      byFirst.data,
    ] as (LiveStreamRow[] | null)[]) {
      for (const row of batch ?? []) {
        const iso = streamAnchorIso(row);
        const firstIso = row.scheduled_start_first;
        const latestIso = row.scheduled_start;
        const actualIso = row.actual_start;

        // Keep row if ANY of its anchor dates (actual, new schedule, or original first schedule) falls in range
        const datesToCheck = [iso, firstIso, latestIso, actualIso].filter(Boolean) as string[];
        const inRange = datesToCheck.some((d) => {
          const t = new Date(d).getTime();
          return Number.isFinite(t) && t >= fromMs && t < toMs;
        });

        if (!inRange) continue;
        if (!options?.includeHidden && isHiddenLiveRow(row)) continue;
        byId.set(row.video_id, row);
      }
    }

    return [...byId.values()].sort(
      (a, b) => liveStreamSortKey(b) - liveStreamSortKey(a)
    );
  } catch (err) {
    console.error("[live_streams_range]", err);
    return [];
  }
}
