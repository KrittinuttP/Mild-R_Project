import type { ReactNode } from "react";
import { headers } from "next/headers";
import {
  Courier_Prime,
  Newsreader,
  Noto_Serif_Thai,
  Sriracha,
} from "next/font/google";

import { CafeEntry } from "@/components/cafe/CafeEntry";
import { CafeFooter } from "@/components/cafe/CafeFooter";
import { CafeHeader } from "@/components/cafe/CafeHeader";
import { BackToTop } from "@/components/layout/BackToTop";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { isCafePromotionHost } from "@/lib/cafe-host";
import { loadCafeVisibility } from "@/lib/cafe-visibility-store";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-cafe-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-cafe-thai",
  weight: ["400", "600"],
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  variable: "--font-cafe-type",
  weight: ["400", "700"],
});

const sriracha = Sriracha({
  subsets: ["thai", "latin"],
  variable: "--font-cafe-hand",
  weight: "400",
});

export default async function CafeLayout({ children }: { children: ReactNode }) {
  const visibility = await loadCafeVisibility();
  const requestHeaders = await headers();
  const onCafeDomain = isCafePromotionHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );

  return (
    <div
      className={`${newsreader.variable} ${notoSerifThai.variable} ${courierPrime.variable} ${sriracha.variable} flex min-h-full flex-col bg-[#0a0c0e] text-[#d8d0c4]`}
    >
      <MediaProtection />
      <CafeEntry cafe={mildRData.cafe} />
      <CafeHeader
        cafe={mildRData.cafe}
        showMainSiteLink={visibility.mainSiteLink && !onCafeDomain}
      />
      <main className="flex-1">{children}</main>
      <CafeFooter cafe={mildRData.cafe} />
      <BackToTop />
    </div>
  );
}
