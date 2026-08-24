import type { Metadata } from "next";

import { CafeEventComic } from "@/components/cafe/CafeEventComic";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: `${mildRData.cafeEvent.title} | Cafe Event`,
  description:
    mildRData.cafeEvent.tagline ??
    mildRData.cafeEvent.titleLocal ??
    mildRData.cafeEvent.title,
};

export default function CafeEventPage() {
  return <CafeEventComic event={mildRData.cafeEvent} />;
}
