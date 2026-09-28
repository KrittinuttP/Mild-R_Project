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

async function loadThumbnailsForVideos(
  supabase: ReturnType<typeof createPublicClient>,
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

/** Load all YouTube live rows (paginated) + thumbnail history. */
export async function loadLiveStreams(
  limit = Number.POSITIVE_INFINITY,
  options?: LoadLiveStreamsOptions
): Promise<LiveStreamRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicClient();
    const rows: LiveStreamRow[] = [];
    let from = 0;

    while (rows.length < limit) {
      const to = from + PAGE - 1;
      const { data, error } = await supabase
        .from("mild_r_live_streams")
        .select(
          "video_id, channel_id, channel_name, source_title, title, url, scheduled_start, scheduled_start_first, actual_start, actual_end, thumbnail_url, thumbnail_cached_url, views_on_end, latest_views, is_own_channel, is_collab, metadata, created_at"
        )
        .order("actual_start", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) {
        console.error("[live_streams]", error.message);
        break;
      }

      const batch = (data ?? []) as LiveStreamRow[];
      if (batch.length === 0) break;
      rows.push(
        ...(options?.includeHidden
          ? batch
          : batch.filter((row) => !isHiddenLiveRow(row)))
      );
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    const capped =
      Number.isFinite(limit) && rows.length > limit
        ? rows.slice(0, limit)
        : rows;

    const thumbs = await loadThumbnailsForVideos(
      supabase,
      capped.map((r) => r.video_id)
    );

    const withThumbs = capped.map((row) => ({
      ...row,
      thumbnail_cached_url: row.thumbnail_cached_url ?? null,
      thumbnails: thumbs.get(row.video_id) ?? [],
    }));

    return [...withThumbs].sort(
      (a, b) => liveStreamSortKey(b) - liveStreamSortKey(a)
    );
  } catch (err) {
    console.error("[live_streams]", err);
    return [];
  }
}

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
  /** Full image for the lightbox. */
  coverUrl: string;
  /** All cover versions newest-first (includes current). */
  versions: { url: string; capturedAt: string | null }[];
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

/** Real lives with a cover (Mild-R + collabs), newest first. */
export async function loadLiveCoverArchive(): Promise<LiveCoverItem[]> {
  const rows = await loadLiveStreams();
  const out: LiveCoverItem[] = [];

  for (const row of rows) {
    if (isPreviewRow(row)) continue;
    if (getLiveStreamStatus(row) === "cancelled") continue;

    const slot = liveStreamToSlot(row);
    const current =
      slot.coverUrl ?? slot.coverHistory?.[0]?.url ?? row.thumbnail_url;
    if (!current) continue;

    const versions: LiveCoverItem["versions"] = [];
    const seen = new Set<string>();
    for (const v of [
      { url: current, capturedAt: null as string | null },
      ...(slot.coverHistory ?? []),
    ]) {
      if (!v.url || seen.has(v.url)) continue;
      seen.add(v.url);
      versions.push({ url: v.url, capturedAt: v.capturedAt });
    }

    const own = Boolean(row.is_own_channel);
    const linked = row.metadata?.linked_video_id;
    const videoId =
      typeof linked === "string" && linked.trim() ? linked.trim() : row.video_id;

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
      thumbUrl: youtubeGridThumb(current),
      coverUrl: current,
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
