"use client";

import { useState } from "react";

import { SectionScrollRestore } from "@/components/layout/SectionScrollRestore";
import { SiteSplash } from "@/components/layout/SiteSplash";

type HomeEntryProps = {
  name: string;
  oshiMark: string;
};

/** Splash + section scroll restore for the home page only. */
export function HomeEntry({ name, oshiMark }: HomeEntryProps) {
  const [ready, setReady] = useState(false);

  return (
    <>
      <SiteSplash
        name={name}
        oshiMark={oshiMark}
        // scroll to `/#section` while the splash still covers the page, so the fade reveals it in place
        onCovered={() => setReady(true)}
        onFinished={() => setReady(true)}
      />
      <SectionScrollRestore ready={ready} />
    </>
  );
}
