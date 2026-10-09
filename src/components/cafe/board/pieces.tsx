import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const SERIF = "font-[family-name:var(--font-cafe-serif)]";
export const TYPE = "font-[family-name:var(--font-cafe-type)]";
export const HAND = "font-[family-name:var(--font-cafe-hand)]";

export const LABEL = cn(
  TYPE,
  "text-xs tracking-[0.14em] text-[#c4a882] uppercase"
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
    <span
      data-pin={id}
      className={cn(
        "absolute top-0 left-1/2 z-10 size-4 -translate-x-1/2 -translate-y-[calc(50%-2px)] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd0db,#e85a7a_55%,#a8323f)] shadow-[0_0_12px_rgba(232,90,122,0.8)]",
        className
      )}
      aria-hidden
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
        TYPE,
        "inline-block border-[3px] px-2 py-1 text-xs font-bold tracking-[0.14em] uppercase opacity-90",
        tone === "paper"
          ? "border-[#a8323f] text-[#a8323f]"
          : "border-[#e85a7a] text-[#e85a7a]",
        className
      )}
    >
      {children}
    </span>
  );
}

type PaperProps = {
  children: ReactNode;
  className?: string;
  pin?: string;
  tilt?: number;
  tone?: "paper" | "pink" | "mint";
  /** Entrance hook read by `useBoardMotion` (`data-motion`). */
  motion?: string;
  style?: CSSProperties;
};

const TONE = {
  paper: "bg-[#f4ebe3] text-[#1a1410]",
  pink: "bg-[#f3b8c4] text-[#1a1410]",
  mint: "bg-[#b9e6e1] text-[#0f4f55]",
};

export function Paper({
  children,
  className,
  pin,
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
      {pin ? <Pin id={pin} /> : null}
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
        {eyebrow ? <p className={LABEL}>{eyebrow}</p> : null}
        <h2
          className={cn(
            SERIF,
            "mt-1 text-[2rem] leading-none font-medium text-[#f4ebe3] sm:text-[2.75rem]"
          )}
        >
          {title}
        </h2>
        {titleLocal ? (
          <p className={cn(HAND, "mt-2 text-[22px] leading-snug text-[#f3b8c4]")}>
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

export function EmptyFrame({
  letter,
  className,
}: {
  letter?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[#14100c]",
        className
      )}
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent 0 12px, rgba(244,235,227,0.05) 12px 13px)",
      }}
      aria-hidden
    >
      {letter ? (
        <span className={cn(TYPE, "text-6xl font-bold text-[#f4ebe3]/80")}>
          {letter}
        </span>
      ) : null}
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
