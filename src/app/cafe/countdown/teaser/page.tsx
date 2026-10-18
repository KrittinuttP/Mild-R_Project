import type { Metadata } from "next";
import { headers } from "next/headers";

import { SERIF, THAI } from "@/components/cafe/board/pieces";
import {
  CountdownBoard,
  CountdownStatusTag,
} from "@/components/cafe/countdown/CountdownBoard";
import { CountdownFooter } from "@/components/cafe/countdown/CountdownFooter";
import { CountdownFrame } from "@/components/cafe/countdown/CountdownFrame";
import { TeaserPlayer } from "@/components/cafe/countdown/TeaserPlayer";
import { SherlockSweetieLogo } from "@/components/cafe/SherlockSweetieLogo";
import { FIRST_TEASER_YOUTUBE_ID } from "@/lib/cafe-countdown";
import {
  bangkokDateLine,
  CAFE_GATE_TIMES_HEADER,
  decodeGateTimes,
} from "@/lib/cafe-gate";
import { cn } from "@/lib/utils";

// CD2 · logo + first teaser, counts down to the cafe opening.
// Spec and to-do: doc/cafe-countdown.md
export const metadata: Metadata = {
  title: "Mild-R: Sherlock Sweetie",
  description: "The case file opens soon.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CafeCountdownTeaserPage() {
  // Switch times set in /cafe/settings, passed on by proxy.ts.
  const { openAt } = decodeGateTimes((await headers()).get(CAFE_GATE_TIMES_HEADER));
  return (
    <CountdownFrame
      variant="top"
      ghost="both"
      leftTag="CASE No. 0612"
      rightTag={
        <CountdownStatusTag
          targetMs={openAt}
          sealed="SEALED"
          open="OPEN"
        />
      }
    >
      <div className="relative flex w-full max-w-[1080px] flex-col items-center text-center">
        <SherlockSweetieLogo
          as="h1"
          label="Mild-R: Sherlock Sweetie — Birthday Case File"
          className="text-[length:clamp(40px,7vw,104px)]"
        />
        <CountdownBoard
          targetMs={openAt}
          eyebrow="CASE FILE OPENS IN"
          eyebrowTh="แฟ้มคดีจะเปิดใน"
          dateLine={bangkokDateLine(openAt)}
          size="regular"
          className="mt-[clamp(40px,4.4vw,64px)]"
          open={{
            label: "CASE FILE · OPEN",
            labelTh: "แฟ้มคดีเปิดแล้ว",
            cta: "เข้าสู่คาเฟ่ · ENTER",
          }}
        />
        <div
          className="mt-[clamp(56px,6vw,88px)] flex w-full max-w-[880px] items-center gap-4"
          aria-hidden
        >
          <span className="h-px flex-1 bg-cafe-gold/35" />
          <span className="size-2 rotate-45 bg-cafe-gold" />
          <span className="h-px flex-1 bg-cafe-gold/35" />
        </div>
        <h2
          className={cn(
            SERIF,
            "mt-[clamp(28px,3vw,40px)] pl-[0.36em] text-[length:clamp(13px,1.25vw,18px)] font-bold tracking-[0.36em] text-cafe-gold"
          )}
        >
          FIRST TEASER
        </h2>
        <p
          className={cn(
            THAI,
            "mt-1 text-[length:clamp(14px,1.2vw,17px)] leading-[1.6] text-cafe-cream/85"
          )}
        >
          ทีเซอร์แรก · หลักฐานชิ้นแรกของคดี
        </p>
        <TeaserPlayer videoId={FIRST_TEASER_YOUTUBE_ID} />
      </div>
      <CountdownFooter />
    </CountdownFrame>
  );
}
