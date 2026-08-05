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
        onFinished={() => setReady(true)}
      />
      <SectionScrollRestore ready={ready} />
    </>
  );
}
