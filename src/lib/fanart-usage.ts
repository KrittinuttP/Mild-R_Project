import type { FanartUsage } from "@/components/fanart/FanartUploadClient";
import { mildRData } from "@/data/vtuber-data";

/** Where sent fan art is used, for the note beside the upload form. Server only. */
export function getFanartUsage(): FanartUsage {
  return {
    // Same name as the cafe page.
    cafeTitle: mildRData.cafe.title,
    birthdayLabel: mildRData.basic.birthdayLabel ?? "12 Dec",
  };
}
