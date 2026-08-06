import type { Metadata } from "next";

import { CafePromo } from "@/components/cafe/CafePromo";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: `${mildRData.cafe.title} | Cafe Promo`,
  description: mildRData.cafe.tagline,
};

export default function CafePage() {
  return <CafePromo cafe={mildRData.cafe} />;
}
