import type { CSSProperties, ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * "Sherlock Sweetie" wordmark in live text (G00 / GB01): the O of SHERLOCK is
 * a magnifying glass with a heart in the lens, the I of SWEETIE is a keyhole.
 * Every size is in `em`, so set `font-size` on the wrapper to scale it.
 *
 * The drawn letters are `aria-hidden`; the real title is read from `label`.
 */

const BRAND_FONT =
  "font-[family-name:var(--font-cafe-serif),var(--font-cafe-thai),serif]";

/** Lens + handle, tilted −8.75° like the Canva master. Viewbox 124 × 148. */
function LensGlyph({
  className,
  style,
  mark,
}: {
  className?: string;
  style?: CSSProperties;
  /** Hook for motion: the lens that stands in for the O. */
  mark?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 124 148"
      data-lens={mark ? "" : undefined}
      className={cn("flex-none overflow-visible", className)}
      style={style}
      aria-hidden
    >
      <circle
        cx="56"
        cy="74"
        r="44"
        fill="none"
        className="stroke-cafe-gold"
        strokeWidth="18"
      />
      <line
        transform="rotate(-8.75 62 74)"
        x1="88"
        y1="106"
        x2="116"
        y2="136"
        className="stroke-cafe-gold"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        transform="translate(56 77) scale(0.55)"
        d="M0 30 C -40 5 -45 -30 -22 -36 C -10 -39 -2 -32 0 -24 C 2 -32 10 -39 22 -36 C 45 -30 40 5 0 30 Z"
        className="fill-cafe-heart"
      />
    </svg>
  );
}

/** Keyhole standing in for the I. Viewbox 64 × 148. */
function KeyholeGlyph({
  className,
  style,
  mark,
}: {
  className?: string;
  style?: CSSProperties;
  /** Hook for motion: the keyhole that stands in for the I (the splash opens through it). */
  mark?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 148"
      data-keyhole={mark ? "" : undefined}
      className={cn("flex-none", className)}
      style={style}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M21 68.75 A28 28 0 1 1 43 68.75 L56 119 H8 Z M28 52.17 A10 10 0 1 1 36 52.17 L40 92 H24 Z"
        className="fill-cafe-gold"
      />
    </svg>
  );
}

/** One line of the wordmark: SHERL◯CK or SWEET⚷E. */
function WordLine({ second }: { second?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center leading-none font-bold whitespace-nowrap",
        second
          ? "tracking-[0.08em] text-cafe-gold"
          : "tracking-[0.04em] text-cafe-cream"
      )}
    >
      {second ? (
        <>
          <span>SWEET</span>
          <KeyholeGlyph mark style={{ width: "0.4328em", height: "1em", marginRight: "0.08em" }} />
          <span>E</span>
        </>
      ) : (
        <>
          <span>SHERL</span>
          <LensGlyph mark style={{ width: "0.8375em", height: "1em", margin: "0 0.013em" }} />
          <span>CK</span>
        </>
      )}
    </span>
  );
}

type SherlockSweetieLogoProps = {
  /** `stack`: the GB01 lock-up. `inline`: one line for header and footer. */
  variant?: "stack" | "inline";
  /** What screen readers hear, e.g. the page title. */
  label?: string;
  /** Show the BIRTHDAY CASE FILE rule and the katakana line (stack only). */
  subtitle?: boolean;
  as?: ElementType;
  className?: string;
  /** Entrance hook read by `useBoardMotion`. */
  motion?: string;
};

export function SherlockSweetieLogo({
  variant = "stack",
  label = "Mild-R: Sherlock Sweetie",
  subtitle = true,
  as: Tag = "div",
  className,
  motion,
}: SherlockSweetieLogoProps) {
  if (variant === "inline") {
    return (
      <Tag
        data-motion={motion}
        className={cn(BRAND_FONT, "inline-flex items-center gap-[0.6em]", className)}
      >
        <span className="sr-only">{label}</span>
        <span
          className="text-[0.62em] font-bold tracking-[0.3em] text-cafe-gold"
          aria-hidden
        >
          MILD-R
        </span>
        <span className="flex items-center gap-[0.32em]" aria-hidden>
          <WordLine />
          <WordLine second />
        </span>
      </Tag>
    );
  }

  return (
    <Tag
      data-motion={motion}
      className={cn(
        BRAND_FONT,
        "flex flex-col items-center text-center",
        className
      )}
    >
      <span className="sr-only">{label}</span>
      <span className="flex flex-col items-center" aria-hidden>
        <span
          className="block pl-[0.405em] font-bold tracking-[0.405em] text-cafe-gold"
          style={{ fontSize: "0.2477em", marginBottom: "0.49em" }}
        >
          MILD-R
        </span>
        <WordLine />
        <WordLine second />
        {subtitle ? (
          <>
            <span
              className="flex items-center"
              style={{ gap: "0.1625em", marginTop: "0.2164em" }}
            >
              <span className="block bg-cafe-gold" style={{ width: "0.946em", height: "max(1px, 0.0133em)" }} />
              <span
                className="block pl-[0.36em] font-bold tracking-[0.36em] whitespace-nowrap text-cafe-cream"
                style={{ fontSize: "max(0.2023em, 10px)" }}
              >
                BIRTHDAY CASE FILE
              </span>
              <span className="block bg-cafe-gold" style={{ width: "0.946em", height: "max(1px, 0.0133em)" }} />
            </span>
            <span
              className="block pl-[0.3em] font-[family-name:var(--font-cafe-jp),serif] tracking-[0.3em] whitespace-nowrap text-cafe-muted"
              style={{ fontSize: "max(0.1664em, 11px)", marginTop: "0.4em" }}
            >
              シャーロック・スウィーティー
            </span>
          </>
        ) : null}
      </span>
    </Tag>
  );
}

/** Faint keyhole and lens behind a hero, as on the GB01 banner (4–5% gold). */
export function CaseGhostMotifs({
  className,
  only,
}: {
  className?: string;
  /** Draw just one of the two marks. */
  only?: "lens" | "keyhole";
}) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {only !== "lens" ? (
        <KeyholeGlyph className="absolute top-[18%] left-[7%] aspect-[64/148] h-[62%] w-auto opacity-[0.04]" />
      ) : null}
      {only !== "keyhole" ? (
        <LensGlyph className="absolute top-[3%] right-[2%] aspect-[124/148] h-[40%] w-auto opacity-[0.04]" />
      ) : null}
    </div>
  );
}
