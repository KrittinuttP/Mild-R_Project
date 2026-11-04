import type { Metadata } from "next";

import { CafePromo } from "@/components/cafe/CafePromo";
import { mildRData } from "@/data/vtuber-data";
import { caseFileCover } from "@/lib/cafe-case-file";
import { loadCafeFeeds } from "@/lib/cafe-feeds-store";
import { cafeForVisibility } from "@/lib/cafe-visibility";
import { loadCafeVisibility } from "@/lib/cafe-visibility-store";

export const metadata: Metadata = {
  title: `${mildRData.cafe.title} | Cafe Promo`,
  description: mildRData.cafe.tagline,
};

export const revalidate = 30;

export default async function CafePage() {
  const [visibility, feeds] = await Promise.all([loadCafeVisibility(), loadCafeFeeds()]);
  return (
    <CafePromo
      cafe={cafeForVisibility(mildRData.cafe, visibility)}
      visibility={visibility}
      caseCover={visibility.caseFile ? caseFileCover() : null}
      feeds={{
        notices: visibility.notices ? feeds.notices : [],
        tapes: visibility.tapes ? feeds.tapes : [],
      }}
    />
  );
}
