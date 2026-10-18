import type { Metadata } from "next";
import { headers } from "next/headers";

import { CountdownBoard } from "@/components/cafe/countdown/CountdownBoard";
import { CountdownFooter } from "@/components/cafe/countdown/CountdownFooter";
import { CountdownFrame } from "@/components/cafe/countdown/CountdownFrame";
import { KeyholeMark } from "@/components/cafe/countdown/KeyholeMark";
import { SERIF, THAI } from "@/components/cafe/board/pieces";
import { CAFE_GATE_TIMES_HEADER, decodeGateTimes } from "@/lib/cafe-gate";
import { cn } from "@/lib/utils";

// CD1 · counts down to the first teaser. No logo, name, date or case number:
// nothing here may give the cafe away. Spec and to-do: doc/cafe-countdown.md
export const metadata: Metadata = {
  // Tab title stays vaguer than the page itself: no "case", no theme yet.
  title: "Something Is Brewing",
  description: "Something new is on its way.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CafeCountdownPage() {
  // Switch times set in /cafe/settings, passed on by proxy.ts.
  const { teaserAt } = decodeGateTimes((await headers()).get(CAFE_GATE_TIMES_HEADER));
  return (
    <CountdownFrame
      variant="center"
      ghost="lens"
      leftTag="No. ????"
      rightTag="SEALED"
    >
      <div className="relative flex w-full max-w-[1080px] flex-col items-center text-center">
        <KeyholeMark glow className="h-[clamp(130px,19vw,260px)]" />
        <h1
          className={cn(
            SERIF,
            "mt-[clamp(32px,3.6vw,52px)] text-[length:clamp(20px,3.2vw,46px)] leading-[1.25] font-bold tracking-[clamp(3px,0.9vw,13px)] text-cafe-cream"
          )}
        >
          SOMETHING IS BREWING.
        </h1>
        <p
          className={cn(
            THAI,
            "mt-2.5 text-[length:clamp(16px,1.8vw,24px)] leading-[1.6] font-medium text-cafe-cream/85"
          )}
        >
          บางอย่างกำลังจะถูกเปิดเผย
        </p>
        <CountdownBoard
          targetMs={teaserAt}
          eyebrow="THE FILE OPENS IN"
          size="large"
          className="mt-[clamp(36px,4.4vw,64px)]"
          open={{
            label: "THE FILE IS OPEN",
            labelTh: "แฟ้มถูกเปิดแล้ว",
            cta: "ดูทีเซอร์ · WATCH",
          }}
        />
      </div>
      <CountdownFooter />
    </CountdownFrame>
  );
}
