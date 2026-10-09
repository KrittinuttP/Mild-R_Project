import type { Metadata } from "next";

import { CafePromo } from "@/components/cafe/CafePromo";
import { mildRData } from "@/data/vtuber-data";
import { cafeForVisibility } from "@/lib/cafe-visibility";
import { loadCafeVisibility } from "@/lib/cafe-visibility-store";

export const metadata: Metadata = {
  title: `${mildRData.cafe.title} | Cafe Promo`,
  description: mildRData.cafe.tagline,
};

export const revalidate = 30;

export default async function CafePage() {
  const visibility = await loadCafeVisibility();
  return (
    <CafePromo
      cafe={cafeForVisibility(mildRData.cafe, visibility)}
      visibility={visibility}
    />
  );
}
