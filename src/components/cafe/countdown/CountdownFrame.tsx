import type { ReactNode } from "react";

import { SERIF } from "@/components/cafe/board/pieces";
import { CaseGhostMotifs } from "@/components/cafe/SherlockSweetieLogo";
import { cn } from "@/lib/utils";

const TAG = cn(
  SERIF,
  "absolute top-[clamp(32px,4vw,56px)] text-[length:clamp(11px,1vw,15px)] font-bold tracking-[0.32em] whitespace-nowrap text-cafe-gold"
);

/**
 * CD1 centres its content; CD2 reads top to bottom (logo, timer, teaser).
 * CD2 sizes also follow screen height so the timer and its date fit the first
 * view on laptops (1280x720 up), leaving room for the scroll hint.
 */
const VARIANT = {
  center:
    "justify-center pt-[clamp(88px,9vw,120px)] pb-[clamp(150px,11vw,168px)] bg-[radial-gradient(ellipse_at_50%_42%,var(--color-cafe-glow)_0%,var(--color-cafe-ground)_72%)]",
  top: "pt-[clamp(80px,min(8vw,12svh),120px)] pb-[clamp(176px,12vw,188px)] bg-[radial-gradient(ellipse_80%_60%_at_50%_22%,var(--color-cafe-glow)_0%,var(--color-cafe-ground)_78%)]",
} as const;

type CountdownFrameProps = {
  variant: keyof typeof VARIANT;
  /** `lens`: only the faint magnifier (CD1). `both`: keyhole and magnifier (CD2). */
  ghost: "lens" | "both";
  /** Top-left tag, e.g. `CASE No. 0612`. */
  leftTag: ReactNode;
  /** Top-right tag, e.g. `SEALED`. */
  rightTag: ReactNode;
  children: ReactNode;
};

/** Green wall, double gold frame and corner tags shared by the countdown pages. */
export function CountdownFrame({
  variant,
  ghost,
  leftTag,
  rightTag,
  children,
}: CountdownFrameProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col items-center overflow-hidden px-4 text-cafe-cream",
        VARIANT[variant]
      )}
    >
      <CaseGhostMotifs only={ghost === "lens" ? "lens" : undefined} />
      <div
        className="pointer-events-none absolute inset-[clamp(12px,2vw,28px)] border border-cafe-gold opacity-[0.35]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-[clamp(18px,2.6vw,36px)] border border-cafe-gold opacity-[0.175]"
        aria-hidden
      />
      <div className={cn(TAG, "left-[clamp(32px,4.4vw,64px)]")}>{leftTag}</div>
      <div className={cn(TAG, "right-[clamp(32px,4.4vw,64px)]")}>{rightTag}</div>
      {children}
    </div>
  );
}
