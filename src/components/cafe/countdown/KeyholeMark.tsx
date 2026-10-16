import { cn } from "@/lib/utils";

/** Keyhole of the Sherlock Sweetie mark, hole cut out (viewbox 64 × 148). */
const KEYHOLE_CUTOUT =
  "M21 68.75 A28 28 0 1 1 43 68.75 L56 119 H8 Z M28 52.17 A10 10 0 1 1 36 52.17 L40 92 H24 Z";

type KeyholeMarkProps = {
  className?: string;
  /** Glow around the shape, as on the B07 teaser. */
  glow?: boolean;
};

export function KeyholeMark({ className, glow }: KeyholeMarkProps) {
  return (
    <svg
      viewBox="0 0 64 148"
      aria-hidden
      className={cn(
        "aspect-[64/148] w-auto fill-cafe-drop",
        glow &&
          "[filter:drop-shadow(0_0_18px_var(--color-cafe-drop))_drop-shadow(0_0_56px_var(--color-cafe-drop))]",
        className
      )}
    >
      <path fillRule="evenodd" d={KEYHOLE_CUTOUT} />
    </svg>
  );
}
