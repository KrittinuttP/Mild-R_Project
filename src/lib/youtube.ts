/** Extract a YouTube video id from common watch / share URLs. */
export function getYoutubeVideoId(url?: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const embed = parsed.pathname.match(/^\/embed\/([^/]+)/);
      if (embed?.[1]) return embed[1];
      const live = parsed.pathname.match(/^\/live\/([^/]+)/);
      if (live?.[1]) return live[1];
      const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }

  return null;
}

/** HQ thumbnail (falls back gracefully in the browser if missing). */
export function getYoutubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Standard embed URL — prefer youtube.com over nocookie (fewer player config errors). */
export function getYoutubeEmbedUrl(videoId: string, autoplay = false) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
