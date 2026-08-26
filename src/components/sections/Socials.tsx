import Link from "next/link";
import { ExternalLink, Music2 } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { buttonVariants } from "@/components/ui/button";
import {
  BODY_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H2_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
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
          <p className={META_CLASS}>Connect</p>
          <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
            ติดตาม Mild-R
          </h2>
          <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>
            {data.fan.greetingToFans ?? `${data.fan.fanName} ${data.fan.oshiMark}`}
          </p>
        </ScrollReveal>

        <div className="mt-10 grid gap-12 sm:mt-14 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal className="space-y-4">
            <h3 className={META_MUTED_CLASS}>Platforms</h3>
            <ul className="space-y-3">
              {data.socials.map((social) => (
                <li key={social.id}>
                  <Link
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-14 items-center justify-between gap-4 rounded-3xl border border-[#f3b8c4]/12 bg-[#1a0c12]/60 px-4 py-4 transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12] sm:px-5 sm:py-5"
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
                <p className={META_MUTED_CLASS}>Original song</p>
                <Link
                  href={song.url ?? data.socials[0]?.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    CTA_PRIMARY_CLASS,
                    "mt-4 h-auto min-h-11 w-full px-5 py-3 sm:w-auto"
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
            <h3 className={META_MUTED_CLASS}>Hashtags</h3>
            <ul className="mt-6 space-y-3 sm:mt-8">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={getXHashtagUrl(tag)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-[#f3b8c4]/10 bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-display)] text-lg text-[#fff5f7] transition hover:border-[#e85a7a]/40 hover:text-[#e85a7a] sm:px-5 sm:text-xl md:text-2xl"
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
