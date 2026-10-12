import type { Metadata } from "next";

import { HuntBook, type HuntArrival } from "@/components/cafe/hunt/HuntBook";
import { HuntFrame } from "@/components/cafe/hunt/HuntFrame";
import { HuntShell } from "@/components/cafe/hunt/HuntShell";
import { mildRData } from "@/data/vtuber-data";
import { cafeHunt } from "@/lib/cafe-hunt";
import { cafeHuntItemIndexForToken } from "@/lib/cafe-hunt-tokens";

export const metadata: Metadata = {
  title: `${cafeHunt.title} | ${mildRData.cafe.title}`,
  // Each URL holds a secret code: keep these pages out of search engines.
  robots: { index: false, follow: false },
};

type CafeHuntTokenPageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Where a phone camera app lands after scanning an evidence QR. The code is
 * checked here on the server; the page is the stamp book itself, which
 * stamps the piece (or shows "QR นี้ใช้ไม่ได้") and then moves the address
 * back to /cafe/hunt.
 */
export default async function CafeHuntTokenPage({
  params,
}: CafeHuntTokenPageProps) {
  const { token } = await params;
  const index = cafeHuntItemIndexForToken(token);
  const arrival: HuntArrival =
    index >= 0 && cafeHunt.items[index]
      ? { kind: "found", index, token }
      : { kind: "invalid" };

  const cafe = mildRData.cafe;
  const caseNo = cafe.edition?.caseNo;

  return (
    <HuntFrame>
      <HuntShell
        title={cafeHunt.title}
        cafeTitle={cafe.title}
        caseNo={caseNo}
        count={cafeHunt.items.length}
      >
        <HuntBook
          arrival={arrival}
          huntTitle={cafeHunt.title}
          cafeTitle={cafe.title}
          drawAt={cafeHunt.drawAt}
          items={cafeHunt.items}
          caseNo={caseNo}
        />
      </HuntShell>
    </HuntFrame>
  );
}
