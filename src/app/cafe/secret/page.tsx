import type { Metadata } from "next";

import { CafeSecretClient } from "@/components/cafe/CafeSecretClient";
import { mildRData } from "@/data/vtuber-data";
import { caseFileCover } from "@/lib/cafe-case-file";
import { isCafeSettingsUnlocked } from "@/lib/cafe-settings-auth";
import type { CafePage } from "@/types/vtuber";

export const metadata: Metadata = {
  title: "Cafe Secret · Full reveal",
  // Own description so the site-wide one (which names the event) is not used.
  description: "Staff only.",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Secret full-reveal preview — password gate on this page. Shows every
 * section and every item (see `fullPreview`), whatever the DB visibility says. The cafe data is
 * only sent once the team cookie checks out on the server; before that the
 * page source holds the password form alone.
 */
/**
 * Everything the page can show, as one sample: goods for sale are listed and
 * the pre-order is open now (its start date is dropped, the end date stays).
 */
function fullPreview(cafe: CafePage): CafePage {
  return {
    ...cafe,
    goods: cafe.goods ? { ...cafe.goods, saleListed: true } : cafe.goods,
    preorder: cafe.preorder ? { ...cafe.preorder, startsAt: undefined } : cafe.preorder,
  };
}

export default async function CafeSecretPage() {
  const unlocked = await isCafeSettingsUnlocked();
  return (
    <CafeSecretClient
      cafe={unlocked ? fullPreview(mildRData.cafe) : null}
      caseCover={unlocked ? caseFileCover() : null}
    />
  );
}
