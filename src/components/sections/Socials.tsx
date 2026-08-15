import Link from "next/link";
import { ExternalLink, Music2 } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type SocialsProps = {
  data: VtuberProfile;
};

function getXHashtagUrl(tag: string) {
  const slug = tag.replace(/^#/, "").trim();
  return `https://x.com/hashtag/${encodeURIComponent(slug)}`;
}

export function Socials({ data }: SocialsProps) {
  const tags = data.hashtags.flatMap((group) => group.tags);
  const song = data.basic.originalSong;

  return (
    <section
      id="socials"
      className="relative scroll-mt-20 bg-[#140a0d] px-5 py-20 pb-[max(5rem,env(safe-area-inset-bottom))] text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#10080c] to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <p className="text-[0.7rem] tracking-[0.28em] text-[#f3b8c4]/75 uppercase sm:text-sm">
            Connect
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            ติดตาม Mild-R
          </h2>
          <p className="mt-4 max-w-xl text-sm text-[#f7d7de]/85 sm:text-base">
            {data.fan.greetingToFans ?? `${data.fan.fanName} ${data.fan.oshiMark}`}
          </p>
        </ScrollReveal>

        <div className="mt-10 grid gap-12 sm:mt-14 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal className="space-y-4">
            <h3 className="text-[0.7rem] tracking-[0.2em] text-[#f3b8c4]/65 uppercase sm:text-sm">
              Platforms
            </h3>
            <ul className="divide-y divide-[#f3b8c4]/15 border-y border-[#f3b8c4]/15">
              {data.socials.map((social) => (
                <li key={social.id}>
                  <Link
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-14 items-center justify-between gap-4 py-4 transition hover:text-[#e85a7a] sm:py-5"
                  >
                    <span className="flex items-center gap-3">
                      <SocialPlatformIcon platform={social.platform} />
                      <span>
                        <span className="block font-medium">{social.label}</span>
                        {social.handle ? (
                          <span className="mt-0.5 block text-sm text-[#f3b8c4]/65 group-hover:text-[#e85a7a]/80">
                            {social.handle}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ExternalLink className="size-4 opacity-50 transition group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>

            {song ? (
              <div className="pt-6">
                <p className="text-sm tracking-[0.2em] text-[#f3b8c4]/65 uppercase">
                  Original song
                </p>
                <Link
                  href={song.url ?? data.socials[0]?.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-4 h-auto min-h-11 w-full rounded-full bg-[#e85a7a] px-5 py-3 text-white hover:bg-[#d44868] sm:w-auto"
                  )}
                >
                  <Music2 data-icon="inline-start" />
                  <span className="text-left leading-snug">
                    {song.title}
                    {song.titleEn ? ` · ${song.titleEn}` : ""}
                  </span>
                </Link>
              </div>
            ) : null}
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h3 className="text-[0.7rem] tracking-[0.2em] text-[#f3b8c4]/65 uppercase sm:text-sm">
              Hashtags
            </h3>
            <ul className="mt-6 space-y-3 sm:mt-8">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={getXHashtagUrl(tag)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 border-l border-[#e85a7a]/60 pl-4 font-[family-name:var(--font-display)] text-lg text-[#fff5f7] transition hover:text-[#e85a7a] sm:text-xl md:text-2xl"
                  >
                    <span>{tag}</span>
                    <ExternalLink className="size-4 shrink-0 opacity-40 transition group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
