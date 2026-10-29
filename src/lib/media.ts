import type { LucideIcon } from "lucide-react";
import { Cake, Calendar, Clapperboard, LayoutGrid, Music2, Sparkles } from "lucide-react";

import type { MediaCategory, MediaClip } from "@/types/vtuber";

/** Per-clip labels (project R · Media board). */
export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, { local: string; en: string }> = {
  original: { local: "ออริจินัล", en: "Original Song" },
  cover: { local: "คัฟเวอร์", en: "Cover" },
  event: { local: "อีเวนต์", en: "Event" },
  "birthday-pv": { local: "PV วันเกิด", en: "Birthday PV" },
  "new-year": { local: "ปีใหม่", en: "New Year" },
  pv: { local: "PV", en: "PV" },
};

export type MediaGroupId = "all" | "song" | "event" | "birthday-pv" | "new-year" | "pv";

export type MediaGroupMeta = {
  id: MediaGroupId;
  label: string;
  icon: LucideIcon;
  /** Categories in this tab; `null` = every clip. */
  categories: MediaCategory[] | null;
};

/** Home Media tabs, in board order: ทั้งหมด · ร้องเพลง · อีเวนต์ · PV วันเกิด · ปีใหม่ · PV */
export const MEDIA_GROUPS: MediaGroupMeta[] = [
  { id: "all", label: "ทั้งหมด", icon: LayoutGrid, categories: null },
  { id: "song", label: "ร้องเพลง", icon: Music2, categories: ["original", "cover"] },
  { id: "event", label: "อีเวนต์", icon: Calendar, categories: ["event"] },
  { id: "birthday-pv", label: "PV วันเกิด", icon: Cake, categories: ["birthday-pv"] },
  { id: "new-year", label: "ปีใหม่", icon: Sparkles, categories: ["new-year"] },
  { id: "pv", label: "PV", icon: Clapperboard, categories: ["pv"] },
];

export type MediaGroup = MediaGroupMeta & { clips: MediaClip[] };

/** Tabs that have clips (ทั้งหมด always first), clips kept in data order. */
export function groupMediaClips(clips: MediaClip[]): MediaGroup[] {
  return MEDIA_GROUPS.map((meta) => ({
    ...meta,
    clips: meta.categories ? clips.filter((clip) => meta.categories!.includes(clip.category)) : clips,
  })).filter((group) => group.clips.length > 0);
}
