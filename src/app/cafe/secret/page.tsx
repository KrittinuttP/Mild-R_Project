import type { Metadata } from "next";

import { CafeSecretClient } from "@/components/cafe/CafeSecretClient";
import { mildRData } from "@/data/vtuber-data";
import { caseFileCover } from "@/lib/cafe-case-file";
import { isCafeSettingsUnlocked } from "@/lib/cafe-settings-auth";

export const metadata: Metadata = {
  title: "Cafe Secret · Full reveal",
  // Own description so the site-wide one (which names the event) is not used.
  description: "Staff only.",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Secret full-reveal preview — password gate on this page. The cafe data is
 * only sent once the team cookie checks out on the server; before that the
 * page source holds the password form alone.
 */
export default async function CafeSecretPage() {
  const unlocked = await isCafeSettingsUnlocked();
  return (
    <CafeSecretClient
      cafe={unlocked ? mildRData.cafe : null}
      caseCover={unlocked ? caseFileCover() : null}
    />
  );
}
