import { ProtectedImage } from "@/components/media/ProtectedImage";
import { CAFE_GREEN_BG } from "@/components/projects/CafeLensMark";
import { cn } from "@/lib/utils";

/**
 * The cafe's logo banner (Sherlock Sweetie wordmark on the cafe's green, 3:1).
 * Web copy of `banner_cafe.png` (2400×800 webp).
 */
export const CAFE_BANNER_SRC = "/assets/cafe/other/banner_cafe.webp";

type CafeProjectCoverProps = {
  /** Alt text for the banner. */
  label: string;
  className?: string;
};

/**
 * Cover of the cafe project (cards + /projects/cafe): the logo banner, never
 * the Key Visual. Fills its parent and crops the banner's sides only — the
 * wordmark sits in the middle ~45% of the banner, so any box from 3:1 down to
 * 3:2 keeps it whole.
 */
export function CafeProjectCover({ label, className }: CafeProjectCoverProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", CAFE_GREEN_BG, className)}>
      <ProtectedImage
        src={CAFE_BANNER_SRC}
        alt={label}
        loading="lazy"
        className="absolute inset-0 size-full object-cover object-center"
      />
    </div>
  );
}
