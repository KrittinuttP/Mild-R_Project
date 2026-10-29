import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type Readout = {
  /** Small label on the top line (hugs the corner). */
  label: ReactNode;
  /** Value on the second line. */
  value: ReactNode;
  /** Shorter value for phones (< md); `value` is used when omitted. */
  valuePhone?: ReactNode;
  href?: string;
  external?: boolean;
  /** Full text for links whose visible text is cut / moving. */
  ariaLabel?: string;
};

type Corner = "tl" | "tr" | "bl" | "br";

const POSITION: Record<Corner, string> = {
  tl: "left-3 top-2.5 md:left-[18px] md:top-3.5 short:top-2",
  tr: "right-3 top-2.5 items-end text-right md:right-[18px] md:top-3.5 short:top-2",
  bl: "left-3 bottom-2.5 md:left-[18px] md:bottom-3.5 short:bottom-2",
  br: "right-3 bottom-2.5 items-end text-right md:right-[18px] md:bottom-3.5 short:bottom-2",
};

const BRACKET: Record<Corner, string> = {
  tl: "left-0 top-0 border-l-2 border-t-2 border-r-pri",
  tr: "right-0 top-0 border-r-2 border-t-2 border-r-nurse",
  bl: "left-0 bottom-0 border-b-2 border-l-2 border-r-nurse",
  br: "right-0 bottom-0 border-b-2 border-r-2 border-r-acc",
};

function ReadoutBlock({ corner, readout }: { corner: Corner; readout: Readout }) {
  const body = (
    <>
      <span className="text-[11px] uppercase tracking-[0.14em] text-r-text-2/85 md:tracking-[0.18em]">
        {readout.label}
      </span>
      {readout.valuePhone !== undefined ? (
        <>
          <span className="text-sm tracking-[0.02em] text-r-text md:hidden">{readout.valuePhone}</span>
          <span className="hidden text-[17px] tracking-[0.03em] text-r-text md:block short:text-sm">{readout.value}</span>
        </>
      ) : (
        <span className="text-sm tracking-[0.02em] text-r-text md:text-[17px] md:tracking-[0.03em] short:text-sm">
          {readout.value}
        </span>
      )}
    </>
  );
  const cls = cn(
    "absolute flex flex-col gap-[3px] whitespace-nowrap font-r-mono md:gap-[5px] short:gap-[3px]",
    POSITION[corner]
  );

  if (!readout.href) return <div className={cls}>{body}</div>;
  return (
    <Link
      href={readout.href}
      aria-label={readout.ariaLabel}
      {...(readout.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        cls,
        "pointer-events-auto rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-acc focus-visible:outline-solid"
      )}
    >
      {body}
    </Link>
  );
}

/**
 * Patient-monitor frame for the hero: corner brackets (pink · white · white · mint) and a
 * two-line readout in each corner. Sits inside a `relative` section; uses `--hero-top`
 * (header + live strip height) to clear the fixed header.
 */
export function MonitorReadouts({
  tl,
  tr,
  bl,
  br,
  className,
}: Record<Corner, Readout> & { className?: string }) {
  return (
    <div
      data-hero-frame
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-4 top-[calc(var(--hero-top)+12px)] z-[4]",
        "md:inset-x-10 md:bottom-10 md:top-[calc(var(--hero-top)+24px)]",
        // sideways phone / tablet: hug the screen edges so the content band stays tall enough
        "short:bottom-3 short:top-[calc(var(--hero-top)+8px)]",
        className
      )}
    >
      {(Object.keys(BRACKET) as Corner[]).map((corner) => (
        <span key={corner} aria-hidden className={cn("absolute size-7 opacity-75 md:size-11", BRACKET[corner])} />
      ))}
      <ReadoutBlock corner="tl" readout={tl} />
      <ReadoutBlock corner="tr" readout={tr} />
      <ReadoutBlock corner="bl" readout={bl} />
      <ReadoutBlock corner="br" readout={br} />
    </div>
  );
}
