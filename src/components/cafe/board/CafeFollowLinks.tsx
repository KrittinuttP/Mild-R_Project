import Link from "next/link";

import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { cn } from "@/lib/utils";
import type { ProjectCta } from "@/types/vtuber";

const OUTLINE =
  "inline-flex min-h-12 items-center justify-center gap-2.5 border border-cafe-gold/60 px-6 text-[15px] font-semibold text-cafe-cream transition hover:-translate-y-0.5 hover:border-cafe-gold hover:bg-cafe-gold/10 motion-reduce:transition-none";
/** On cream paper: ink outline. */
const OUTLINE_PAPER =
  "inline-flex min-h-12 items-center justify-center gap-2.5 border-[1.5px] border-cafe-ink px-5 text-[15px] font-semibold text-cafe-ink transition hover:-translate-y-0.5 hover:bg-cafe-ink/[0.06] motion-reduce:transition-none";

function platformOf(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "x.com" || host === "twitter.com") return "x";
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") return "youtube";
  } catch {
    return null;
  }
  return null;
}

/** The cafe's follow buttons (X, YouTube …) from `closing.ctas`, each with its brand mark. */
export function CafeFollowLinks({
  ctas,
  className,
  tone = "wall",
}: {
  ctas: ProjectCta[] | undefined;
  className?: string;
  tone?: "wall" | "paper";
}) {
  const links = (ctas ?? []).filter((cta) => cta.url);
  if (links.length === 0) return null;
  return (
    <>
      {links.map((cta) => {
        const platform = platformOf(cta.url);
        return (
          <Link
            key={cta.url}
            href={cta.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(tone === "paper" ? OUTLINE_PAPER : OUTLINE, className)}
          >
            {platform ? (
              <SocialPlatformIcon
                platform={platform}
                className={cn("size-4", tone === "paper" ? "text-cafe-ink" : "text-cafe-gold-soft")}
              />
            ) : null}
            {cta.label}
          </Link>
        );
      })}
    </>
  );
}
