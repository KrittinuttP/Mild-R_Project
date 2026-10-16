import type { CSSProperties, ReactNode } from "react";

import { BrassPin, KEYHOLE, KeyholePlate } from "@/components/cafe/board/brass";
import { cn } from "@/lib/utils";

/** Libre Baskerville for Latin, Noto Serif Thai for Thai in the same run. */
export const SERIF =
  "font-[family-name:var(--font-cafe-serif),var(--font-cafe-thai),serif]";
export const THAI = "font-[family-name:var(--font-cafe-thai),serif]";
/** Monospace — only for codes, links and the countdown digits, not for display text. */
export const TYPE = "font-[family-name:var(--font-cafe-type)]";

/** Small caps label, as "CASE No. 0612" on GB01. */
export const LABEL = cn(
  SERIF,
  "text-[11px] font-bold tracking-[0.22em] text-cafe-gold uppercase sm:text-xs"
);

export function tiltStyle(deg: number): CSSProperties {
  return { ["--tilt" as string]: `${deg}deg` };
}

export const TILT =
  "origin-top transition duration-300 ease-out [transform:rotate(var(--tilt))] hover:[transform:rotate(0deg)_translateY(-4px)_scale(1.02)] motion-reduce:transition-none";

type PinProps = {
  id?: string;
  className?: string;
};

export function Pin({ id, className }: PinProps) {
  return (
    <BrassPin
      id={id}
      className={cn("top-0 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2", className)}
    />
  );
}

type StampProps = {
  children: ReactNode;
  tone?: "paper" | "wall";
  className?: string;
  /** Entrance hook read by `useBoardMotion` (`data-motion`). */
  motion?: string;
};

export function Stamp({
  children,
  tone = "paper",
  className,
  motion,
}: StampProps) {
  return (
    <span
      data-motion={motion}
      className={cn(
        SERIF,
        "inline-block border-2 px-2 pt-1 pb-0.5 text-[11px] font-bold tracking-[0.2em] uppercase opacity-90",
        tone === "paper"
          ? "border-cafe-gold-deep text-cafe-gold-deep"
          : "border-cafe-gold text-cafe-gold",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Text under a black bar that stays. The server has already swapped hidden
 * text for filler of the same length (`cafeForVisibility`); this only draws it.
 * `wall` is for text on the dark page, where a black bar would not show.
 */
export function Classified({
  hidden,
  tone = "paper",
  children,
}: {
  hidden: boolean;
  tone?: "paper" | "wall";
  children: ReactNode;
}) {
  if (!hidden) return <>{children}</>;
  return (
    <>
      <span
        className={cn(
          "break-all text-transparent select-none [-webkit-box-decoration-break:clone] [box-decoration-break:clone]",
          tone === "paper" ? "bg-cafe-void" : "bg-cafe-void-soft"
        )}
        aria-hidden
      >
        {children}
      </span>
      <span className="sr-only">ข้อมูลลับ</span>
    </>
  );
}

/**
 * One dark panel and a stamp, standing in for a whole hidden card.
 * Give it an aspect ratio or a min height; the panel fills that box.
 */
export function SealedFace({
  className,
  small = false,
  letter,
}: {
  className?: string;
  small?: boolean;
  letter?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <EmptyFrame letter={letter} className="absolute inset-0 h-full w-full" />
      <ClassifiedStamp small={small} />
      <span className="sr-only">ข้อมูลลับ</span>
    </div>
  );
}

/** One classified panel across a whole hidden section. Headings stay above it. */
export function SealedZone({
  id,
  className,
}: {
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      data-motion="rise"
      className={cn(
        "relative mt-10 scroll-mt-24 border border-[rgba(201,161,74,0.45)] shadow-[0_18px_32px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <SealedFace className="min-h-64 sm:min-h-80" />
    </div>
  );
}

/** Gold ink stamp across a card whose section is hidden. The card must be `relative`. */
export function ClassifiedStamp({ small = false }: { small?: boolean }) {
  return (
    <span
      className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 -rotate-12"
      aria-hidden
    >
      <Stamp
        className={cn(
          "bg-cafe-cream/85 whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
          small ? "px-1.5 text-[0.6rem]" : "text-sm"
        )}
      >
        Classified
      </Stamp>
    </span>
  );
}

type PaperProps = {
  children: ReactNode;
  className?: string;
  pin?: string;
  /** Hang the paper on a brass keyhole plate instead of a pushpin. */
  plate?: boolean;
  tilt?: number;
  tone?: "paper" | "pink" | "mint";
  /** Entrance hook read by `useBoardMotion` (`data-motion`). */
  motion?: string;
  style?: CSSProperties;
};

const TONE = {
  paper: "bg-cafe-cream text-cafe-ink",
  pink: "bg-cafe-blush text-cafe-ink",
  mint: "bg-cafe-gold-pale text-cafe-ink",
};

export function Paper({
  children,
  className,
  pin,
  plate = false,
  tilt = 0,
  tone = "paper",
  motion,
  style,
}: PaperProps) {
  return (
    <article
      data-motion={motion}
      className={cn(
        "relative shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
        TONE[tone],
        TILT,
        className
      )}
      style={{ ...tiltStyle(tilt), ...style }}
    >
      {pin && plate ? (
        <KeyholePlate id={pin} className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
      ) : pin ? (
        <Pin id={pin} />
      ) : null}
      {children}
    </article>
  );
}

type SectionHeadProps = {
  eyebrow?: string;
  title: string;
  titleLocal?: string;
  stamp?: string;
  align?: "start" | "center";
};

export function SectionHead({
  eyebrow,
  title,
  titleLocal,
  stamp,
  align = "start",
}: SectionHeadProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        align === "center" && "flex-col items-center text-center"
      )}
    >
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow ? (
          <p className={cn(LABEL, "flex items-center gap-2.5")}>
            <span className="size-1.5 rotate-45 bg-cafe-gold" aria-hidden />
            {eyebrow}
          </p>
        ) : null}
        <h2
          data-motion="lens"
          className={cn(
            SERIF,
            "mt-2 text-[1.85rem] leading-[1.1] font-bold text-cafe-cream sm:text-[2.6rem]"
          )}
        >
          {title}
        </h2>
        {titleLocal ? (
          <p className={cn(THAI, "mt-2 text-lg leading-snug text-cafe-gold-soft sm:text-xl")}>
            {titleLocal}
          </p>
        ) : null}
      </div>
      {stamp && align !== "center" ? (
        <Stamp tone="wall" className="-rotate-2" motion="stamp">
          {stamp}
        </Stamp>
      ) : null}
    </div>
  );
}

/**
 * Felt panel with a faint keyhole where a picture is not ready (or is
 * classified). `pending` adds "Evidence pending" and a slow lamp sweep, so an
 * empty slot does not look like a broken image.
 */
export function EmptyFrame({
  letter,
  pending = false,
  className,
}: {
  letter?: string;
  pending?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-cafe-felt px-3 text-center",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 42%, rgba(201,161,74,0.16), transparent 62%)",
        boxShadow:
          "inset 0 0 0 1px rgba(201,161,74,0.35), inset 0 0 0 5px var(--color-cafe-felt), inset 0 0 0 6px rgba(201,161,74,0.22)",
      }}
      aria-hidden={!pending}
    >
      <span className="flex aspect-square w-[min(4rem,38%)] items-center justify-center rounded-full border-[1.5px] border-dashed border-cafe-gold/60">
        <svg viewBox="0 0 64 148" className="h-auto w-[24%] fill-cafe-gold/55" aria-hidden>
          <path d={KEYHOLE} />
        </svg>
      </span>
      {letter ? (
        <span className={cn(LABEL, "mt-3 text-[10px] text-cafe-gold/80 sm:text-[10px]")}>
          Exhibit {letter}
        </span>
      ) : null}
      {pending ? (
        <>
          <span className={cn(LABEL, "mt-3 text-[10px] text-cafe-gold/85 sm:text-[10px]")}>
            Evidence pending
          </span>
          <span className={cn(THAI, "mt-1 text-xs text-cafe-muted")}>
            ภาพจริงจะอัปเดตเร็ว ๆ นี้
          </span>
          <span
            className="animate-cafe-sweep pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(233,207,134,0.14),transparent)]"
            aria-hidden
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Green felt evidence board in a dark frame with a gold hairline — the same
 * surface as the overview board. (Named for the cork board it replaced.)
 */
export const FELT_STYLE: CSSProperties = {
  backgroundColor: "var(--color-cafe-felt)",
  backgroundImage:
    "radial-gradient(ellipse at 50% 40%, rgba(30,74,64,.9), transparent 70%), radial-gradient(circle at 18% 22%, rgba(241,230,207,.05) 0 1px, transparent 1.4px), radial-gradient(circle at 72% 64%, rgba(0,0,0,.18) 0 1px, transparent 1.4px)",
  backgroundSize: "100% 100%, 7px 9px, 9px 11px",
  boxShadow:
    "inset 0 0 0 1px rgba(201,161,74,.55), inset 0 0 0 7px var(--color-cafe-void), inset 0 0 0 8px rgba(201,161,74,.25), inset 0 0 110px 24px rgba(5,14,12,.55), 0 30px 70px rgba(0,0,0,.55)",
};

export const FELT_FRAME =
  "border-[10px] border-cafe-void outline outline-1 -outline-offset-1 outline-cafe-gold/40 min-[1100px]:border-[16px]";

export function CorkBoard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", FELT_FRAME, className)} style={FELT_STYLE}>
      {children}
    </div>
  );
}

export function BoardSection({
  id,
  children,
  className,
  width = "1280",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  width?: "1280" | "1080" | "820";
}) {
  const max =
    width === "820"
      ? "max-w-[820px]"
      : width === "1080"
        ? "max-w-[1080px]"
        : "max-w-[1280px]";

  return (
    <section
      id={id}
      className={cn("relative scroll-mt-24 px-5 sm:px-8", className)}
    >
      <div className={cn("mx-auto", max)}>{children}</div>
    </section>
  );
}
