import Link from "next/link";
import { ExternalLink, Heart, Music2 } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ConnectHashtagPills } from "@/components/sections/ConnectHashtagPills";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { buttonVariants } from "@/components/ui/button";
import {
  BADGE_SOFT_CLASS,
  BODY_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H2_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { SocialLink, VtuberProfile } from "@/types/vtuber";

type SocialsProps = {
  data: VtuberProfile;
};

const PRIMARY_SOCIAL_IDS = new Set(["youtube", "x"]);

function PrimarySocialCard({ social }: { social: SocialLink }) {
  return (
    <Link
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex min-h-[5.5rem] items-center rounded-3xl border p-5 transition sm:min-h-[6rem] sm:p-6",
        "border-[#f3b8c4]/12 bg-[#1a0c12]/60 hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
      )}
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e85a7a]/10 text-[#f3b8c4]">
            <SocialPlatformIcon platform={social.platform} className="size-5" />
          </span>
          <span>
            <span className="block font-medium text-[#fff5f7]">{social.label}</span>
            {social.handle ? (
              <span className="mt-0.5 block text-sm text-[#f3b8c4]/65 group-hover:text-[#e85a7a]/80">
                {social.handle}
              </span>
            ) : null}
          </span>
        </span>
        <ExternalLink className="size-4 shrink-0 opacity-40 transition group-hover:opacity-100" />
      </span>
    </Link>
  );
}

export function Socials({ data }: SocialsProps) {
  const song = data.basic.originalSong;
  const hasHashtags = data.hashtags.some((group) => group.tags.length > 0);
  const primarySocials = data.socials.filter((social) => PRIMARY_SOCIAL_IDS.has(social.id));
  const secondarySocials = data.socials.filter((social) => !PRIMARY_SOCIAL_IDS.has(social.id));

  return (
    <section
      id="socials"
      className="relative scroll-mt-20 bg-[#140a0d] px-5 py-20 pb-[max(5rem,env(safe-area-inset-bottom))] text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_at_80%_100%,rgba(232,90,122,0.14),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <Heart className="size-4 text-[#e85a7a]" aria-hidden />
            <p className={META_CLASS}>Connect</p>
          </div>
          <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>ติดตาม Mild-R</h2>
          <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>
            {data.fan.greetingToFans ?? `${data.fan.fanName} ${data.fan.oshiMark}`}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="mt-10 space-y-10 sm:mt-14 sm:space-y-12">
          <div>
            <h3 className={META_MUTED_CLASS}>ช่องทางหลัก</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
              {primarySocials.map((social) => (
                <PrimarySocialCard key={social.id} social={social} />
              ))}
            </div>
          </div>

          {secondarySocials.length > 0 ? (
            <div>
              <h3 className={META_MUTED_CLASS}>ช่องทางอื่นๆ</h3>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {secondarySocials.map((social) => (
                  <li key={social.id}>
                    <Link
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        BADGE_SOFT_CLASS,
                        "inline-flex min-h-9 items-center gap-2 py-2 transition hover:border-[#e85a7a]/35 hover:text-[#e85a7a]"
                      )}
                    >
                      <SocialPlatformIcon
                        platform={social.platform}
                        className="size-3.5 shrink-0"
                      />
                      {social.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasHashtags ? (
            <div className="border-t border-[#f3b8c4]/10 pt-10">
              <h3 className={META_MUTED_CLASS}>แฮชแท็ก</h3>
              <p className="mt-2 text-sm text-[#f3b8c4]/65">
                แท็กตอนโพสต์ · กดคัดลอกได้
              </p>
              <ConnectHashtagPills groups={data.hashtags} className="mt-4" />
            </div>
          ) : null}

          {song ? (
            <div
              className={cn(
                hasHashtags && "border-t border-[#f3b8c4]/10 pt-10"
              )}
            >
              <Link
                href={song.url ?? data.socials[0]?.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  CTA_PRIMARY_CLASS,
                  "h-auto min-h-11 w-full px-5 py-3 sm:w-auto"
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
      </div>
    </section>
  );
}
