import { cn } from "@/lib/utils";

type SectionGlowProps = {
  /** Hero · Member · Follow get the stronger corner light (CI A+). */
  strong?: boolean;
  /** Hero light: larger and brighter than any other section. */
  hero?: boolean;
  className?: string;
};

/**
 * CI A+ corner light — pink from the top-left, mint from the bottom-right.
 * Place as the first child of a `relative` section; content sits above it.
 * Styles live in globals.css (`.r-glow`).
 */
export function SectionGlow({ strong = false, hero = false, className }: SectionGlowProps) {
  return (
    <div
      aria-hidden
      data-strong={strong ? "" : undefined}
      data-hero={hero ? "" : undefined}
      className={cn("r-glow pointer-events-none absolute inset-0", className)}
    />
  );
}
