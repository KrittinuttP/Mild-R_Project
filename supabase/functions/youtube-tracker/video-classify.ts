/**
 * Non-live uploads → mild_r_videos (video / short / premiere).
 * Shared by the youtube-tracker Edge Function (Deno) and scripts/backfill-videos.ts (tsx),
 * so keep this file free of Deno/Node-only APIs.
 */
import { MAIN_CHANNEL_ID } from "./lumina-master.ts";

export type VideoKind = "video" | "short" | "premiere";

export const PIXELA_OFFICIAL_CHANNEL_ID = "UCcRaKGCG3RFenb8D2php_Jw";

/** UC… channel id → its members-only uploads playlist (UUMO…). */
export function membersPlaylistId(channelId: string): string {
  return channelId.replace(/^UC/, "UUMO");
}

/** Channels whose lives and videos are always stored hidden (still tracked, never shown). */
const HIDDEN_CHANNEL_IDS = new Set<string>([
  "UCsUopHmCvJv3cigTolkMpZA", // KYOss Channel
  "UC0ZulKukNQiTsA2r7dEL0OA", // KiwaPawari Ch.
]);

export function isHiddenChannel(channelId: string | null | undefined): boolean {
  return Boolean(channelId && HIDDEN_CHANNEL_IDS.has(channelId));
}

/** Lives are rarely this short; ended streams at or under this are treated as Premieres. */
const PREMIERE_MAX_SECONDS = 20 * 60;
/** YouTube Shorts can be up to 3 minutes. */
const SHORT_MAX_SECONDS = 3 * 60;
/** Used only when the /shorts/ probe can't decide. */
const SHORT_FALLBACK_SECONDS = 60;
const PROBE_CONCURRENCY = 8;

const MILD_MENTION_RE = /@?MildRWorldEnd|Mild-?R\b|MildR\b/i;
const SHORTS_TAG_RE = /#shorts?\b/i;

export type YoutubeVideoItem = {
  id: string;
  snippet: {
    channelId: string;
    channelTitle: string;
    title: string;
    description?: string;
    tags?: string[];
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  contentDetails?: { duration?: string };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
  statistics?: { viewCount?: string; likeCount?: string };
  status?: { privacyStatus?: string; embeddable?: boolean };
};

export type VideoRow = {
  video_id: string;
  channel_id: string;
  channel_name: string;
  source_title: string | null;
  title: string;
  url: string;
  kind: VideoKind;
  published_at: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  latest_views: number | null;
  latest_likes: number | null;
  is_own_channel: boolean;
  embeddable: boolean;
  /** Only set for hidden channels, so a manual unhide elsewhere isn't overwritten. */
  hidden?: true;
  metadata: Record<string, unknown>;
};

/** `videos.list` parts needed to classify uploads and lives in one call. */
export const VIDEO_PARTS = "snippet,contentDetails,liveStreamingDetails,statistics,status";

export function parseIsoDuration(iso: string | null | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Number(s ?? 0)
  );
}

/**
 * Premieres carry liveStreamingDetails like lives, but the video length is known
 * before/while they air (a real live reports P0D until it ends).
 */
export function isPremiere(item: YoutubeVideoItem): boolean {
  const live = item.liveStreamingDetails;
  if (!live) return false;
  const seconds = parseIsoDuration(item.contentDetails?.duration);
  if (seconds <= 0) return false;
  return !live.actualEndTime || seconds <= PREMIERE_MAX_SECONDS;
}

/** Live streams (excluding Premieres) belong in mild_r_live_streams. */
export function isRealLive(item: YoutubeVideoItem): boolean {
  return Boolean(item.liveStreamingDetails) && !isPremiere(item);
}

export function mentionsMildRVideo(item: YoutubeVideoItem): boolean {
  return (
    MILD_MENTION_RE.test(item.snippet.title) ||
    MILD_MENTION_RE.test(item.snippet.description ?? "")
  );
}

/** true = Short, false = regular video, null = YouTube didn't answer clearly. */
async function probeIsShort(videoId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
    });
    if (res.status === 200) return true;
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      return location.includes("/watch") ? false : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveKind(
  item: YoutubeVideoItem,
  existingKind: VideoKind | undefined
): Promise<VideoKind> {
  if (isPremiere(item)) return "premiere";
  if (existingKind === "short" || existingKind === "video") return existingKind;

  const seconds = parseIsoDuration(item.contentDetails?.duration);
  if (seconds <= 0 || seconds > SHORT_MAX_SECONDS) return "video";

  const probed = await probeIsShort(item.id);
  if (probed != null) return probed ? "short" : "video";

  const text = `${item.snippet.title}\n${item.snippet.description ?? ""}`;
  return seconds <= SHORT_FALLBACK_SECONDS || SHORTS_TAG_RE.test(text)
    ? "short"
    : "video";
}

function parseCount(raw: string | undefined | null): number | null {
  if (raw == null || raw === "") return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

function buildVideoRow(
  item: YoutubeVideoItem,
  kind: VideoKind,
  sourceTitle: string | null
): VideoRow {
  const live = item.liveStreamingDetails;
  const thumbs = item.snippet.thumbnails ?? {};
  const seconds = parseIsoDuration(item.contentDetails?.duration);
  const isOwn = item.snippet.channelId === MAIN_CHANNEL_ID;

  return {
    video_id: item.id,
    channel_id: item.snippet.channelId,
    channel_name: item.snippet.channelTitle,
    source_title: isOwn ? "Mild-R" : sourceTitle,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    kind,
    published_at:
      kind === "premiere"
        ? live?.actualStartTime ?? live?.scheduledStartTime ?? item.snippet.publishedAt ?? null
        : item.snippet.publishedAt ?? null,
    duration_seconds: seconds > 0 ? seconds : null,
    thumbnail_url:
      thumbs.maxres?.url ||
      thumbs.standard?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url ||
      null,
    latest_views: parseCount(item.statistics?.viewCount),
    latest_likes: parseCount(item.statistics?.likeCount),
    is_own_channel: isOwn,
    embeddable: item.status?.embeddable !== false,
    ...(isHiddenChannel(item.snippet.channelId) ? { hidden: true as const } : {}),
    metadata: {
      description: item.snippet.description ?? "",
      tags: item.snippet.tags ?? [],
      privacy_status: item.status?.privacyStatus ?? null,
      live_broadcast_content: item.snippet.liveBroadcastContent ?? null,
      scheduled_start: live?.scheduledStartTime ?? null,
      actual_start: live?.actualStartTime ?? null,
      actual_end: live?.actualEndTime ?? null,
    },
  };
}

/** Deno (esm.sh) and Node (npm) supabase-js clients have different types; only `.from()` is used. */
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

/**
 * Upsert non-live uploads. Keeps the stored kind for known videos (skips the /shorts/ probe)
 * and merges metadata so manual flags survive. Never touches `hidden`.
 * `membersOnly` marks items from the channel's members-only playlist (metadata.members_only).
 */
export async function saveVideoItems(
  supabase: SupabaseLike,
  items: YoutubeVideoItem[],
  sourceTitleFor: (channelId: string) => string | null,
  options: { dryRun?: boolean; membersOnly?: boolean } = {}
): Promise<VideoRow[]> {
  const uploads = items.filter((item) => !isRealLive(item));
  if (uploads.length === 0) return [];

  const existing = new Map<
    string,
    { kind: VideoKind; metadata: Record<string, unknown> | null }
  >();
  const ids = uploads.map((item) => item.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("mild_r_videos")
      .select("video_id, kind, metadata")
      .in("video_id", ids.slice(i, i + 200));
    if (error) throw new Error(`videos lookup: ${error.message}`);
    for (const row of (data ?? []) as Array<{
      video_id: string;
      kind: VideoKind;
      metadata: Record<string, unknown> | null;
    }>) {
      existing.set(row.video_id, { kind: row.kind, metadata: row.metadata });
    }
  }

  const rows: VideoRow[] = [];
  for (let i = 0; i < uploads.length; i += PROBE_CONCURRENCY) {
    const batch = uploads.slice(i, i + PROBE_CONCURRENCY);
    const kinds = await Promise.all(
      batch.map((item) => resolveKind(item, existing.get(item.id)?.kind))
    );
    batch.forEach((item, j) => {
      const row = buildVideoRow(item, kinds[j], sourceTitleFor(item.snippet.channelId));
      row.metadata = {
        ...(existing.get(item.id)?.metadata ?? {}),
        ...row.metadata,
        ...(options.membersOnly ? { members_only: true } : {}),
      };
      rows.push(row);
    });
  }

  if (options.dryRun) return rows;

  // One upsert must share a column set, or missing `hidden` would be sent as null/default.
  const groups = [rows.filter((r) => r.hidden), rows.filter((r) => !r.hidden)];
  for (const group of groups) {
    for (let i = 0; i < group.length; i += 200) {
      const { error } = await supabase
        .from("mild_r_videos")
        .upsert(group.slice(i, i + 200), { onConflict: "video_id" });
      if (error) throw new Error(`videos upsert: ${error.message}`);
    }
  }
  return rows;
}
