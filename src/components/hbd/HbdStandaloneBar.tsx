import { mildRData } from "@/data/vtuber-data";
import { heroNameFont } from "@/lib/hero-fonts";
import { cn } from "@/lib/utils";

/**
 * Logo-only bar for the standalone HBD pages (/upload/hbd/*). Not a link:
 * these pages stay separate from the main site. Same bar as /upload/fanart.
 */
export function HbdStandaloneBar({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`${heroNameFont.variable} sticky top-0 z-30 border-b border-white/10 bg-r-bg/88 pt-[env(safe-area-inset-top)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md`}
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-lg items-center px-4 sm:h-16 sm:px-5",
          wide && "lg:max-w-[1160px] lg:px-10"
        )}
      >
        <span className="inline-flex items-baseline gap-1.5 font-r-name text-[1.3rem] leading-none font-extrabold text-r-text sm:text-[1.45rem]">
          {mildRData.basic.name}
          <span className="font-sans text-[13px] font-normal" aria-hidden>
            {mildRData.fan.oshiMark}
          </span>
        </span>
      </div>
    </div>
  );
}
