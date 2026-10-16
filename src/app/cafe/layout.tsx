import type { ReactNode } from "react";
import { headers } from "next/headers";
import {
  Courier_Prime,
  Libre_Baskerville,
  Noto_Serif_Thai,
  Shippori_Mincho,
  Sriracha,
} from "next/font/google";

import { CafeEntry } from "@/components/cafe/CafeEntry";
import { CafeFooter } from "@/components/cafe/CafeFooter";
import { CafeHeader } from "@/components/cafe/CafeHeader";
import { BackToTop } from "@/components/layout/BackToTop";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { isCafePromotionHost } from "@/lib/cafe-host";
import { cafeForVisibility } from "@/lib/cafe-visibility";
import { loadCafeVisibility } from "@/lib/cafe-visibility-store";

// Sherlock Sweetie brand face (G00 / GB01). No Thai glyphs — `SERIF` in
// board/pieces.tsx chains --font-cafe-thai after it for Thai text.
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-cafe-serif",
  weight: ["400", "700"],
  style: "normal",
});

const libreBaskervilleItalic = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-cafe-serif-italic",
  weight: "400",
  style: "italic",
});

// Only the katakana line under the logo uses it, so it is not preloaded.
const shipporiMincho = Shippori_Mincho({
  subsets: ["latin"],
  variable: "--font-cafe-jp",
  weight: "400",
  preload: false,
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-cafe-thai",
  weight: ["400", "600", "700"],
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
  const cafe = cafeForVisibility(mildRData.cafe, visibility);
  const requestHeaders = await headers();
  const onCafeDomain = isCafePromotionHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );

  return (
    <div
      className={`${libreBaskerville.variable} ${libreBaskervilleItalic.variable} ${shipporiMincho.variable} ${notoSerifThai.variable} ${courierPrime.variable} ${sriracha.variable} flex min-h-full flex-col bg-cafe-ground text-cafe-text`}
    >
      <MediaProtection />
      <CafeEntry cafe={cafe} />
      <CafeHeader
        cafe={cafe}
        showMainSiteLink={visibility.mainSiteLink && !onCafeDomain}
      />
      <main className="flex-1">{children}</main>
      <CafeFooter cafe={cafe} />
      <BackToTop />
    </div>
  );
}
