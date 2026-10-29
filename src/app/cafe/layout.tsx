import type { Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import {
  Courier_Prime,
  Libre_Baskerville,
  Noto_Serif_Thai,
  Shippori_Mincho,
} from "next/font/google";

import { CafeChromeGate } from "@/components/cafe/CafeChromeGate";
import { CafeEntry } from "@/components/cafe/CafeEntry";
import { CafeFooter } from "@/components/cafe/CafeFooter";
import { CafeHeader } from "@/components/cafe/CafeHeader";
import { BackToTop } from "@/components/layout/BackToTop";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { CAFE_CHROME_HEADER } from "@/lib/cafe-countdown";
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

/** Phone browser bar and overscroll in the cafe's green, not the main site's. */
export const viewport: Viewport = {
  themeColor: "#0f2a24",
};

const ROOT_CLASS = `${libreBaskerville.variable} ${libreBaskervilleItalic.variable} ${shipporiMincho.variable} ${notoSerifThai.variable} ${courierPrime.variable} flex min-h-full flex-col bg-cafe-ground text-cafe-text`;

export default async function CafeLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();

  // Bare on the countdown pages (they bring their own frame) and on every
  // page while the cafe is locked (e.g. the settings login): the splash,
  // menu and footer are client components that would carry the whole cafe
  // data into the page source even while hidden. Decided in proxy.ts.
  if (requestHeaders.get(CAFE_CHROME_HEADER) !== "full") {
    return (
      <div data-cafe-root className={ROOT_CLASS}>
        <MediaProtection />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const visibility = await loadCafeVisibility();
  const cafe = cafeForVisibility(mildRData.cafe, visibility);
  const onCafeDomain = isCafePromotionHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );

  return (
    <div data-cafe-root className={ROOT_CLASS}>
      <MediaProtection />
      <CafeEntry cafe={cafe} />
      <CafeChromeGate>
        <CafeHeader
          cafe={cafe}
          showMainSiteLink={visibility.mainSiteLink && !onCafeDomain}
        />
      </CafeChromeGate>
      <main className="flex-1">{children}</main>
      <CafeChromeGate>
        <CafeFooter />
      </CafeChromeGate>
      <BackToTop tone="cafe" />
    </div>
  );
}
