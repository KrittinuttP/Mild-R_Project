"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { CAFE_ENTRY_READY_EVENT } from "@/components/cafe/board/useBoardMotion";
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
    pathname.startsWith("/cafe/settings") ||
    pathname.startsWith("/cafe/secret") ||
    pathname.startsWith("/cafe/lab") ||
    pathname.startsWith("/cafe/event");
  const [ready, setReady] = useState(skipSplash);
  const edition = cafe.edition;

  if (skipSplash) {
    return <SectionScrollRestore ready />;
  }

  return (
    <>
      <CafeSplash
        title={cafe.title}
        titleLocal={cafe.titleLocal}
        kicker={edition?.kicker}
        caseNo={edition?.caseNo}
        // Already swapped for the blacked-out copy when the KV is hidden.
        preloadImage={cafe.heroCutout}
        onFinished={() => {
          setReady(true);
          // Tells the cork board (`useBoardMotion`) the page is now visible.
          document.documentElement.dataset.cafeEntry = "ready";
          window.dispatchEvent(new Event(CAFE_ENTRY_READY_EVENT));
        }}
      />
      <SectionScrollRestore ready={ready} />
    </>
  );
}
