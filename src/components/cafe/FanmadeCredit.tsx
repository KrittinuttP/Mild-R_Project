import Link from "next/link";

import { SERIF } from "@/components/cafe/board/pieces";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { cn } from "@/lib/utils";

/** Who built the cafe site. Shown once the cafe opens; the countdown hides it. */
export const CAFE_DEVELOPER = {
  name: "ZAYZHIK 🦈",
  xUrl: "https://x.com/ZAYZHIK_KungV2",
} as const;

type FanmadeCreditProps = {
  /** Credit to show. Leave out to keep the name blacked out until the reveal. */
  creator?: { name: string; xUrl: string };
  className?: string;
};

/**
 * Faint gold rule + one line: fan-made notice, heart, credit. Shared by the
 * countdown pages and the cafe footer so both read the same.
 */
export function FanmadeCredit({ creator, className }: FanmadeCreditProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2.5 text-center", className)}>
      <div
        className="mb-2 h-px w-full max-w-[880px] bg-gradient-to-r from-transparent via-cafe-gold/35 to-transparent"
        aria-hidden
      />
      <p
        className={cn(
          SERIF,
          "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[length:clamp(11px,0.85vw,12px)] tracking-[0.06em] text-cafe-gold"
        )}
      >
        <span>© 2026 Fan-made · Unofficial</span>
        <span className="inline-flex items-center gap-1.5">
          Made with
          <svg
            viewBox="-46 -40 92 72"
            role="img"
            aria-label="love"
            className="h-[11px] w-[13px] flex-none fill-cafe-heart"
          >
            <path d="M0 30 C -40 5 -45 -30 -22 -36 C -10 -39 -2 -32 0 -24 C 2 -32 10 -39 22 -36 C 45 -30 40 5 0 30 Z" />
          </svg>
          by
          {creator ? (
            <Link
              href={creator.xUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 underline-offset-4 transition hover:text-cafe-gold-soft hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
            >
              <span>{creator.name}</span>
              <SocialPlatformIcon
                platform="x"
                className="size-[0.9em] shrink-0 opacity-80 transition group-hover:opacity-100"
              />
              <span className="sr-only">บน X</span>
            </Link>
          ) : (
            <span
              role="img"
              aria-label="ชื่อผู้จัดทำถูกปิดไว้"
              className="inline-block h-[1.1em] w-[6.4em] -rotate-1 bg-cafe-cream opacity-80"
            />
          )}
        </span>
      </p>
    </div>
  );
}
