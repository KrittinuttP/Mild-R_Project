import { useId } from "react";

import { cn } from "@/lib/utils";

/** One heartbeat strip — the same trace the project R boards use. viewBox 0 0 700 80. */
const ECG_PATH =
  "M0 40 H120 L135 40 L145 18 L158 62 L170 6 L184 74 L196 40 H330 L345 40 L355 26 L366 54 L376 40 H520 L535 40 L545 18 L558 62 L570 6 L584 74 L596 40 H700";

type EcgLineProps = {
  /**
   * draw   — traces itself once (1.8s), then stays · Hero
   * run    — a short pulse travels along the line, looping · live cards
   * static — no motion
   */
  mode?: "draw" | "run" | "static";
  /** gradient = pink → nurse white → mint (left → right) · CI A+ */
  tone?: "gradient" | "white" | "pink";
  /** Faster pulse while a live is on air (run mode only). */
  fast?: boolean;
  strokeWidth?: number;
  opacity?: number;
  /** Height and placement via classes, e.g. "h-[180px] lg:h-[240px]". */
  className?: string;
};

/** Decorative ECG line. Motion stops under prefers-reduced-motion (globals.css). */
export function EcgLine({
  mode = "static",
  tone = "gradient",
  fast = false,
  strokeWidth = 3,
  opacity = 1,
  className,
}: EcgLineProps) {
  const gradientId = `ecg-${useId().replace(/:/g, "")}`;
  const stroke =
    tone === "gradient" ? `url(#${gradientId})` : tone === "white" ? "var(--r-text)" : "var(--r-pri)";

  return (
    <svg
      aria-hidden
      viewBox="0 0 700 80"
      preserveAspectRatio="none"
      className={cn("block w-full overflow-visible", className)}
    >
      {tone === "gradient" ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--r-pri)" />
            <stop offset="0.5" stopColor="var(--r-nurse)" />
            <stop offset="1" stopColor="var(--r-acc)" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d={ECG_PATH}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-fast={fast ? "" : undefined}
        className={cn(mode === "draw" && "r-ecg-draw", mode === "run" && "r-ecg-run")}
        style={{ opacity }}
      />
    </svg>
  );
}
