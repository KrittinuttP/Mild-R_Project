import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { ParallaxScene } from "@/components/animations/ParallaxScene";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type HeroProps = {
  data: VtuberProfile;
};

export function Hero({ data }: HeroProps) {
  const youtube = data.socials.find((s) => s.platform === "youtube");

  return (
    <ParallaxScene
      layers={data.parallax_layers}
      className="min-h-[100dvh]"
      travel={160}
    >
      <section
        aria-label={`${data.basic.name} hero`}
        className="relative flex min-h-[100dvh] flex-col justify-end px-6 pb-16 pt-28 sm:px-10 lg:px-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140a0d]/90 via-[#140a0d]/35 to-transparent" />

        <div className="relative mx-auto w-full max-w-6xl">
          <p className="mb-3 text-sm tracking-[0.28em] text-[#f3b8c4]/80 uppercase">
            {data.basic.unit}
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,14vw,9rem)] leading-[0.88] font-bold tracking-tight text-[#fff5f7]">
            {data.basic.name}
          </h1>

          <p className="mt-5 max-w-xl text-base text-[#f7d7de]/90 sm:text-lg">
            {data.basic.greeting}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {youtube ? (
              <Link
                href={youtube.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full bg-[#e85a7a] px-6 text-white hover:bg-[#d44868]"
                )}
              >
                Watch on YouTube
              </Link>
            ) : null}

            <Link
              href="#profile"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full border-[#f3b8c4]/40 bg-transparent text-[#fff5f7] hover:bg-[#fff5f7]/10"
              )}
            >
              Meet {data.basic.name}
            </Link>
          </div>
        </div>

        <a
          href="#profile"
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[#f3b8c4]/70 transition hover:text-[#fff5f7]"
          aria-label="Scroll to profile"
        >
          <span className="text-[0.65rem] tracking-[0.2em] uppercase">
            Scroll
          </span>
          <ChevronDown className="size-5 animate-bounce" />
        </a>
      </section>
    </ParallaxScene>
  );
}
