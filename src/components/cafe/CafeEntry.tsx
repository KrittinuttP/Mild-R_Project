"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { CafeSplash } from "@/components/cafe/CafeSplash";
import { SectionScrollRestore } from "@/components/layout/SectionScrollRestore";
import type { CafePage } from "@/types/vtuber";

type CafeEntryProps = {
  cafe: CafePage;
};

/** Cafe splash + section scroll restore (gated until splash finishes). */
export function CafeEntry({ cafe }: CafeEntryProps) {
  const pathname = usePathname();
  const skipSplash =
    pathname.startsWith("/cafe/settings") || pathname.startsWith("/cafe/lab");
  const [ready, setReady] = useState(skipSplash);
  const edition = cafe.edition;

  if (skipSplash) {
    return <SectionScrollRestore ready />;
  }

  return (
    <>
      <CafeSplash
        masthead={edition?.masthead ?? cafe.title}
        kicker={edition?.kicker}
        caseNo={edition?.caseNo}
        heroImage={cafe.heroImage}
        onFinished={() => setReady(true)}
      />
      <SectionScrollRestore ready={ready} />
    </>
  );
}
