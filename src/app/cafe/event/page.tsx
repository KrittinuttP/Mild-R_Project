import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CafeEventComic } from "@/components/cafe/CafeEventComic";
import { mildRData } from "@/data/vtuber-data";
import { loadCafeVisibility } from "@/lib/cafe-visibility-store";

export const metadata: Metadata = {
  title: `${mildRData.cafeEvent.title} | Cafe Event`,
  description:
    mildRData.cafeEvent.tagline ??
    mildRData.cafeEvent.titleLocal ??
    mildRData.cafeEvent.title,
};

export const revalidate = 30;

export default async function CafeEventPage() {
  const visibility = await loadCafeVisibility();
  if (!visibility.caseFile) redirect("/cafe");
  return <CafeEventComic event={mildRData.cafeEvent} />;
}
