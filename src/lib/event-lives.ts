import { liveStreamToSlot, loadLiveStreamsByIds } from "@/lib/live-streams";
import { loadVideosByIds, toVideoItem } from "@/lib/videos";
import type { CalendarEvent, EventLive } from "@/types/vtuber";

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function youtubeThumb(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** Event lives in JSON order; Supabase data wins, JSON fields fill the gaps. */
export async function loadEventLives(
  event: Pick<CalendarEvent, "lives">
): Promise<EventLive[]> {
  const refs = event.lives ?? [];
  if (refs.length === 0) return [];

  const ids = refs.map((ref) => ref.videoId);
  const [rows, videoRows] = await Promise.all([
    loadLiveStreamsByIds(ids),
    loadVideosByIds(ids),
  ]);
  const byId = new Map(rows.map((row) => [row.video_id, row]));
  const videoById = new Map(videoRows.map((row) => [row.video_id, toVideoItem(row)]));

  return refs.map((ref) => {
    const kind = ref.kind ?? "live";
    const fallbackTitle = kind === "video" ? "วิดีโอบน YouTube" : "ไลฟ์บน YouTube";
    const row = byId.get(ref.videoId);
    const video = videoById.get(ref.videoId);
    if (!row && video) {
      return {
        videoId: ref.videoId,
        kind,
        title: video.title || ref.title || fallbackTitle,
        url: youtubeUrl(ref.videoId),
        cover: video.thumbUrl,
        channelName: video.channelName ?? ref.channel,
        date: video.date ?? ref.date,
        time: video.time ?? ref.time,
        durationLabel: video.durationLabel ?? undefined,
        views: video.views && video.views > 0 ? video.views : undefined,
      };
    }
    if (!row) {
      return {
        videoId: ref.videoId,
        kind,
        title: ref.title ?? fallbackTitle,
        url: youtubeUrl(ref.videoId),
        cover: youtubeThumb(ref.videoId),
        channelName: ref.channel,
        date: ref.date,
        time: ref.time,
      };
    }

    const slot = liveStreamToSlot(row);
    const views = Math.max(row.latest_views ?? 0, row.views_on_end ?? 0);
    return {
      videoId: ref.videoId,
      kind,
      title: row.title?.trim() || ref.title || fallbackTitle,
      url: youtubeUrl(ref.videoId),
      cover: slot.coverUrl ?? youtubeThumb(ref.videoId),
      channelName: row.channel_name?.trim() || ref.channel,
      date: slot.date || ref.date,
      time: slot.time && slot.time !== "TBA" && slot.time !== "LIVE" ? slot.time : ref.time,
      durationLabel: slot.durationLabel ?? undefined,
      views: views > 0 ? views : undefined,
    };
  });
}
