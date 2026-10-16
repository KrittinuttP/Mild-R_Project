import { SERIF } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

type CountdownFooterProps = {
  /** Credit to show. Leave out to keep the name blacked out until the reveal. */
  creator?: string;
};

/** One-line footer of the countdown pages: fan-made notice, heart, credit. */
export function CountdownFooter({ creator }: CountdownFooterProps) {
  return (
    <footer className="absolute inset-x-0 bottom-[clamp(32px,3.6vw,52px)] flex flex-col items-center gap-2.5 px-[clamp(32px,5vw,72px)] text-center">
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
            <span>{creator}</span>
          ) : (
            <span
              role="img"
              aria-label="ชื่อผู้จัดทำถูกปิดไว้"
              className="inline-block h-[1.1em] w-[6.4em] -rotate-1 bg-cafe-cream opacity-80"
            />
          )}
        </span>
      </p>
    </footer>
  );
}
