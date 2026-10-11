import type { Metadata } from "next";
import Link from "next/link";

import { HAND, LABEL, SERIF } from "@/components/cafe/board/pieces";
import { HuntFound } from "@/components/cafe/hunt/HuntFound";
import { HuntFrame, WALL_LINK } from "@/components/cafe/hunt/HuntFrame";
import { HuntShell } from "@/components/cafe/hunt/HuntShell";
import { mildRData } from "@/data/vtuber-data";
import { cafeHunt } from "@/lib/cafe-hunt";
import { cafeHuntItemIndexForToken } from "@/lib/cafe-hunt-tokens";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${cafeHunt.title} | ${mildRData.cafe.title}`,
  // Each URL holds a secret code: keep these pages out of search engines.
  robots: { index: false, follow: false },
};

type CafeHuntTokenPageProps = {
  params: Promise<{ token: string }>;
};

/** Page a QR code opens. The code is checked here, on the server. */
export default async function CafeHuntTokenPage({
  params,
}: CafeHuntTokenPageProps) {
  const { token } = await params;
  const index = cafeHuntItemIndexForToken(token);
  const item = index >= 0 ? cafeHunt.items[index] : undefined;

  const cafe = mildRData.cafe;
  const caseNo = cafe.edition?.caseNo;

  if (!item) {
    return (
      <HuntFrame>
        {caseNo ? <p className={LABEL}>{caseNo}</p> : null}
        <h1
          className={cn(
            SERIF,
            "mt-1 text-[2rem] leading-[1.05] font-medium text-[#f4ebe3]"
          )}
        >
          No Evidence Here
        </h1>
        <p className={cn(HAND, "mt-1.5 text-[22px] text-[#f3b8c4]")}>
          QR นี้ใช้ไม่ได้
        </p>
        <p className="mt-4 text-[15px] leading-[1.7] text-[#d8d0c4]">
          ลิงก์นี้ไม่ตรงกับจุดหลักฐานของกิจกรรม ลองสแกน QR ที่จุดอีกครั้ง
          ถ้ายังไม่ได้ให้แจ้งทีมงานหน้างาน
        </p>
        <Link href="/cafe/hunt" className={cn(WALL_LINK, "mt-3")}>
          เปิดสมุดสะสม →
        </Link>
      </HuntFrame>
    );
  }

  return (
    <HuntFrame>
      <HuntShell
        title={cafeHunt.title}
        cafeTitle={cafe.title}
        caseNo={caseNo}
        count={cafeHunt.items.length}
      >
        <HuntFound
          item={item}
          index={index}
          itemIds={cafeHunt.items.map((entry) => entry.id)}
          token={token}
          caseNo={caseNo}
        />
      </HuntShell>
    </HuntFrame>
  );
}
