import type { VideoItem, VideoKind } from "@/types/video";

export const VIDEO_KIND_LABEL: Record<VideoKind, string> = {
  video: "Video",
  short: "Shorts",
  premiere: "Premiere",
};

export function formatVideoDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "3 ต.ค. 2026" from a Bangkok YYYY-MM-DD. */
export function formatVideoDate(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH-u-ca-gregory", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatVideoViews(views: number | null | undefined): string | null {
  if (!views || views <= 0) return null;
  return `${new Intl.NumberFormat("en", { notation: "compact" }).format(views)} views`;
}

/** "Mild-R · 3 ต.ค. 2026" */
export function videoSubtitle(item: Pick<VideoItem, "channelLabel" | "date">): string {
  return [item.channelLabel, formatVideoDate(item.date)].filter(Boolean).join(" · ");
}
