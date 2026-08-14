import type { Metadata } from "next";

import { CafeSecretClient } from "@/components/cafe/CafeSecretClient";
import { mildRData } from "@/data/vtuber-data";

export const metadata: Metadata = {
  title: "Cafe Secret · Full reveal",
  robots: { index: false, follow: false, nocache: true },
};

/** Secret full-reveal preview — password gate on this page. */
export default function CafeSecretPage() {
  return <CafeSecretClient cafe={mildRData.cafe} />;
}
