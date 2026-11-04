import type { Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { CafeChromeGate } from "@/components/cafe/CafeChromeGate";
import { CafeEntry } from "@/components/cafe/CafeEntry";
import { CafeFooter } from "@/components/cafe/CafeFooter";
import { CafeHeader } from "@/components/cafe/CafeHeader";
import { BackToTop } from "@/components/layout/BackToTop";
import { MediaProtection } from "@/components/media/MediaProtection";
import { mildRData } from "@/data/vtuber-data";
import { CAFE_CHROME_HEADER } from "@/lib/cafe-countdown";
import { isCafePromotionHost } from "@/lib/cafe-host";
import { loadCafeFeeds } from "@/lib/cafe-feeds-store";
import { cafeForVisibility } from "@/lib/cafe-visibility";
import { loadCafeVisibility } from "@/lib/cafe-visibility-store";

import "@/fonts/cafe-fonts.css";

// Sherlock Sweetie brand face (G00 / GB01). No Thai glyphs — `SERIF` in
// board/pieces.tsx chains --font-cafe-thai after it for Thai text.
// Self-hosted fonts (src/fonts/cafe-fonts.css), same files next/font/google used to fetch:
// Libre Baskerville 400/700 + italic 400, Shippori Mincho 400, Noto Serif Thai 400/600/700,
// Courier Prime 400/700 (its faces are declared in site-fonts.css).
const libreBaskerville = { variable: "font-v-cafe-serif" } as const;
const libreBaskervilleItalic = { variable: "font-v-cafe-serif-italic" } as const;
const shipporiMincho = { variable: "font-v-cafe-jp" } as const;
const notoSerifThai = { variable: "font-v-cafe-thai" } as const;
const courierPrime = { variable: "font-v-cafe-type" } as const;

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

  const [visibility, feeds] = await Promise.all([loadCafeVisibility(), loadCafeFeeds()]);
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
          feedLinks={{
            notices: visibility.notices && feeds.notices.length > 0,
            tapes: visibility.tapes && feeds.tapes.length > 0,
          }}
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
