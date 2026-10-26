import Image from "next/image";
import Link from "next/link";

import { EcgLine } from "@/components/common/EcgLine";
import { SectionGlow } from "@/components/common/SectionGlow";
import { buttonVariants } from "@/components/ui/button";
import { R_EYEBROW_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type HomeHeroProps = {
  data: VtuberProfile;
};

/**
 * Project R hero (doc/project-r-implementation.md · เฟส 4).
 * Plays once on load: ECG draws itself → art fades in → name, greeting and
 * buttons rise in turn. No looping motion; all of it stops under reduced motion.
 */
export function HomeHero({ data }: HomeHeroProps) {
  const { basic } = data;
  const youtube = data.socials.find((s) => s.platform === "youtube");
  const character = data.parallax_layers.find((layer) => layer.id === "hero-character");
  const artSrc = character?.src ?? "/assets/mild/kv/Mild-R_Name_Art.png";
  const artAlt = character?.alt ?? `${basic.name} key visual`;

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className={cn(
        "relative overflow-hidden px-5 pb-10 text-r-text sm:px-10 lg:px-16 lg:pb-16",
        // clear the fixed header (+ the live-today strip when it is showing)
        "pt-16 in-data-live-banner:pt-24 sm:pt-20 sm:in-data-live-banner:pt-28 lg:pt-24 lg:in-data-live-banner:pt-32"
      )}
    >
      <SectionGlow hero />

      <div className="relative mx-auto max-w-6xl">
        {/* ECG behind the art · wider than the column, like the board */}
        <div className="pointer-events-none absolute inset-x-[-10%] top-[34%] lg:top-[10%]">
          <EcgLine mode="draw" strokeWidth={6} opacity={0.55} className="h-[180px] lg:h-[240px]" />
        </div>

        <div className="relative flex flex-col lg:grid lg:min-h-[640px] lg:grid-cols-2 lg:items-end lg:gap-5">
          <div className="r-fade relative h-[470px] lg:order-2 lg:h-[640px]">
            <Image
              src={artSrc}
              alt={artAlt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              draggable={false}
              className="object-contain"
            />
          </div>

          <div className="mt-1.5 lg:order-1 lg:mt-0 lg:pb-6">
            <p className={R_EYEBROW_CLASS}>{basic.unit}</p>
            <h1
              id="hero-title"
              className="r-rise mt-3.5 font-[family-name:var(--font-display)] text-[4.75rem] leading-none font-normal text-r-text [animation-delay:0.3s] lg:text-[7.75rem]"
            >
              {basic.name}
            </h1>
            <p className="r-fade mt-5 font-[family-name:var(--font-display)] text-lg leading-normal text-r-text/90 [animation-delay:0.7s] lg:text-[1.3125rem]">
              {basic.greeting}
            </p>
            <div className="r-rise mt-7 flex flex-wrap gap-3.5 [animation-delay:0.9s]">
              {youtube ? (
                <Link
                  href={youtube.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "r-primary", size: "r-lg" }), "h-[3.25rem] px-[1.625rem]")}
                >
                  Watch on YouTube
                </Link>
              ) : null}
              <a
                href="#lore"
                className={cn(buttonVariants({ variant: "r-outline", size: "r-lg" }), "h-[3.25rem]")}
              >
                About
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
