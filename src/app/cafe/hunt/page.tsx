import type { Metadata } from "next";

import { HuntBook } from "@/components/cafe/hunt/HuntBook";
import { HuntFrame } from "@/components/cafe/hunt/HuntFrame";
import { HuntShell } from "@/components/cafe/hunt/HuntShell";
import { mildRData } from "@/data/vtuber-data";
import { cafeHunt } from "@/lib/cafe-hunt";

export const metadata: Metadata = {
  title: `${cafeHunt.title} | ${mildRData.cafe.title}`,
  description:
    "สมุดสะสมหลักฐาน: สแกน QR ให้ครบทุกจุดในงาน แล้วลงชื่อลุ้นรับรางวัล",
};

/** Stamp book. Progress lives in the visitor's browser, so this page is the same for everyone. */
export default function CafeHuntPage() {
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
