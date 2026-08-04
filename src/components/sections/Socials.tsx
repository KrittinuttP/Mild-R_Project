import Link from "next/link";
import { ExternalLink, Music2, Play, X } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type SocialsProps = {
  data: VtuberProfile;
};

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "youtube") {
    return <Play className="size-5" aria-hidden />;
  }

  if (platform === "x") {
    return <X className="size-5" aria-hidden />;
  }

  return <ExternalLink className="size-5" aria-hidden />;
}

export function Socials({ data }: SocialsProps) {
  const tags = data.hashtags.flatMap((group) => group.tags);
  const song = data.basic.originalSong;

  return (
    <section
      id="socials"
      className="relative scroll-mt-24 bg-[#140a0d] px-6 py-28 text-[#fff5f7] sm:px-10 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#10080c] to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <p className="text-sm tracking-[0.28em] text-[#f3b8c4]/75 uppercase">
            Connect
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            ติดตาม Mild-R
          </h2>
          <p className="mt-4 max-w-xl text-base text-[#f7d7de]/85">
            {data.fan.greetingToFans ?? `${data.fan.fanName} ${data.fan.oshiMark}`}
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-16 lg:grid-cols-2">
          <ScrollReveal className="space-y-4">
            <h3 className="text-sm tracking-[0.2em] text-[#f3b8c4]/65 uppercase">
              Platforms
            </h3>
            <ul className="divide-y divide-[#f3b8c4]/15 border-y border-[#f3b8c4]/15">
              {data.socials.map((social) => (
                <li key={social.id}>
                  <Link
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 py-5 transition hover:text-[#e85a7a]"
                  >
                    <span className="flex items-center gap-3">
                      <PlatformIcon platform={social.platform} />
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
                    "mt-4 rounded-full bg-[#e85a7a] px-5 text-white hover:bg-[#d44868]"
                  )}
                >
                  <Music2 data-icon="inline-start" />
                  {song.title}
                  {song.titleEn ? ` · ${song.titleEn}` : ""}
                </Link>
              </div>
            ) : null}
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h3 className="text-sm tracking-[0.2em] text-[#f3b8c4]/65 uppercase">
              Hashtags
            </h3>
            <p className="mt-4 text-sm text-[#f7d7de]/70">
              แท็กสำหรับแฟนอาร์ต มีม และการรายงานตัวของ{data.fan.fanName}
            </p>
            <ul className="mt-8 space-y-3">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="border-l border-[#e85a7a]/60 pl-4 font-[family-name:var(--font-display)] text-xl text-[#fff5f7] sm:text-2xl"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
