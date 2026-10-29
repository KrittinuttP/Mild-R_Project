import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { cn } from "@/lib/utils";

/** Brand marks differ in visual weight; shrink the heavy/wide ones so all read the same size. */
const OPTICAL_SCALE: Record<string, number> = {
  x: 0.86,
  tiktok: 0.92,
  facebook: 0.92,
};

type SocialIconButtonProps = {
  platform: string;
  href: string;
  label: string;
  /** sm = 34px (desktop header) · md = 44px (touch). */
  size?: "sm" | "md";
  className?: string;
};

/** Round follow button with a platform logo — one look everywhere in the header. */
export function SocialIconButton({ platform, href, label, size = "md", className }: SocialIconButtonProps) {
  const scale = OPTICAL_SCALE[platform] ?? 1;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-r-text-2/22 bg-r-text/[0.03] text-r-text transition",
        "hover:border-r-pri/50 hover:bg-r-pri/10 hover:text-r-pri active:bg-r-pri/15",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc",
        size === "sm" ? "size-[34px]" : "size-11",
        className
      )}
    >
      <span className="inline-flex" style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}>
        <SocialPlatformIcon platform={platform} className={size === "sm" ? "size-4" : "size-5"} />
      </span>
    </a>
  );
}
