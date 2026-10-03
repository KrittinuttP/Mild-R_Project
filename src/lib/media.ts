import type { LucideIcon } from "lucide-react";
import {
  Cake,
  Clapperboard,
  Mic2,
  Music2,
  PartyPopper,
  Sparkles,
} from "lucide-react";

import type { MediaCategory, MediaClip } from "@/types/vtuber";

export type MediaCategoryMeta = {
  id: MediaCategory;
  label: string;
  labelLocal?: string;
  icon: LucideIcon;
};

/** Display order for Media playlist groups */
export const MEDIA_CATEGORY_ORDER: MediaCategoryMeta[] = [
  { id: "original", label: "Original Song", labelLocal: "ต้นฉบับ", icon: Music2 },
  { id: "cover", label: "Cover", labelLocal: "คัฟเวอร์", icon: Mic2 },
  {
    id: "event",
    label: "Event",
    labelLocal: "เวที & คอนเสิร์ต",
    icon: Clapperboard,
  },
  {
    id: "birthday-pv",
    label: "Birthday PV",
    labelLocal: "วันเกิด",
    icon: Cake,
  },
  {
    id: "new-year",
    label: "New Year",
    labelLocal: "อวยพรปีใหม่",
    icon: PartyPopper,
  },
  {
    id: "pv",
    label: "PV",
    labelLocal: "เดบิวต์ & World End",
    icon: Sparkles,
  },
];

export type MediaCategoryGroup = MediaCategoryMeta & {
  clips: MediaClip[];
};

export function groupMediaByCategory(clips: MediaClip[]): MediaCategoryGroup[] {
  return MEDIA_CATEGORY_ORDER.map((meta) => ({
    ...meta,
    clips: clips.filter((clip) => clip.category === meta.id),
  })).filter((group) => group.clips.length > 0);
}
