import { ExternalLink, Music2, Play } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { ConnectHashtagPills } from "@/components/sections/ConnectHashtagPills";
import { XFeed } from "@/components/sections/XFeed";
import { cn } from "@/lib/utils";
import type { SocialLink, VtuberProfile } from "@/types/vtuber";
import type { XPost } from "@/types/x-post";

type SocialsProps = {
  data: VtuberProfile;
  xPosts?: XPost[];
  xRetweets?: XPost[];
};

const PRIMARY_SOCIAL_IDS = new Set(["youtube", "x"]);
const BOX = "r-card rounded-[20px] shadow-none ring-1 ring-r-text-2/15";
const BOX_LABEL = "text-xs tracking-[0.2em] text-r-text-3";

/** "19 May 2024" (dates stay in English). */
function enDate(ymd: string | undefined) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

function PrimaryCard({ social }: { social: SocialLink }) {
  return (
    <div className={cn(BOX, "relative flex items-center gap-3.5 p-[18px]")}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[15px] bg-r-pri/12 text-r-text-2">
        <SocialPlatformIcon platform={social.platform} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base text-r-text">{social.label}</p>
        {social.handle ? <p className="mt-0.5 truncate text-[0.8125rem] text-r-text-3">{social.handle}</p> : null}
      </div>
      <a
        href={social.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`ติดตามบน ${social.label}`}
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-r-pri px-4 text-sm text-r-on-pri transition-colors after:absolute after:inset-0 after:rounded-[20px] hover:bg-r-pri-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-r-acc"
      >
        ติดตาม
        <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </div>
  );
}

function OtherChannels({ socials }: { socials: SocialLink[] }) {
  return (
    <div className={cn(BOX, "px-[18px] pt-[18px] pb-2")}>
      <p className={cn(BOX_LABEL, "mb-2")}>ช่องทางอื่น</p>
      <ul className="-mx-1.5">
        {socials.map((social) => (
          <li key={social.id} className="[&+&]:border-t [&+&]:border-r-text-2/15">
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3.5 py-[11px] transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-r-acc"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-r-pri/12 text-r-text-2">
                <SocialPlatformIcon platform={social.platform} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.90625rem] text-r-text">{social.label}</span>
                {social.handle ? <span className="block truncate text-[0.78125rem] text-r-text-3">{social.handle}</span> : null}
              </span>
              <ExternalLink aria-hidden className="size-3.5 shrink-0 text-r-text-3" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SongCard({ song, fallbackUrl }: { song: NonNullable<VtuberProfile["basic"]["originalSong"]>; fallbackUrl: string }) {
  const released = enDate(song.releasedAt);
  return (
    <div className="relative flex items-center gap-3.5 rounded-[20px] bg-[linear-gradient(120deg,color-mix(in_srgb,var(--r-pri)_16%,transparent),color-mix(in_srgb,var(--r-text-2)_5%,transparent))] px-4 py-3.5 ring-[1.5px] ring-r-pri/32 ring-inset">
      <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-r-pri text-r-on-pri">
        <Music2 aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] tracking-[0.2em] text-r-text-2">เพลงออริจินัล</p>
        <p className="mt-[3px] truncate text-base text-r-text">
          {song.title}
          {song.titleEn ? ` · ${song.titleEn}` : ""}
        </p>
        <p className="mt-px text-xs text-r-text-3">{[released, "YouTube"].filter(Boolean).join(" · ")}</p>
      </div>
      <a
        href={song.url ?? fallbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`ฟัง ${song.title} บน YouTube`}
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-4 text-sm text-r-text ring-1 ring-r-text-2/25 ring-inset transition-colors after:absolute after:inset-0 after:rounded-[20px] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-r-acc"
      >
        <Play aria-hidden className="size-3.5" />
        ฟัง
      </a>
    </div>
  );
}

/** Home · ติดตาม (project R · FW1-b desktop / FO1-b phone). Stronger corner light (CI A+). */
export function Socials({ data, xPosts = [], xRetweets = [] }: SocialsProps) {
  const song = data.basic.originalSong;
  const hasHashtags = data.hashtags.some((group) => group.tags.length > 0);
  const primary = data.socials.filter((social) => PRIMARY_SOCIAL_IDS.has(social.id));
  const secondary = data.socials.filter((social) => !PRIMARY_SOCIAL_IDS.has(social.id));
  const xProfile = data.socials.find((s) => s.platform === "x")?.url ?? "https://x.com";

  return (
    <Section id="socials" strong className="pb-[max(5rem,env(safe-area-inset-bottom))]">
      <ScrollReveal>
        <SectionHeader
          eyebrow="Follow"
          title={`ติดตาม ${data.basic.name}`}
          description={<span className="text-base text-r-text-2">{data.fan.greetingToFans ?? `${data.fan.fanName} ${data.fan.oshiMark}`}</span>}
        />
      </ScrollReveal>

      <div className="mt-8 grid grid-cols-1 items-start gap-4 lg:mt-9 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-7">
        <ScrollReveal className="flex flex-col gap-4">
          {primary.map((social) => (
            <PrimaryCard key={social.id} social={social} />
          ))}
          {secondary.length > 0 ? <OtherChannels socials={secondary} /> : null}
          {hasHashtags ? (
            <div className={cn(BOX, "px-5 py-[18px]")}>
              <p className="mb-3 flex items-baseline justify-between">
                <span className={BOX_LABEL}>แฮชแท็ก</span>
                <span className="text-xs text-r-text-3">แตะเพื่อคัดลอก</span>
              </p>
              <ConnectHashtagPills groups={data.hashtags} />
            </div>
          ) : null}
          {song ? <SongCard song={song} fallbackUrl={data.socials[0]?.url ?? "#"} /> : null}
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="min-w-0 max-lg:mt-4">
          <XFeed posts={xPosts} retweets={xRetweets} profileUrl={xProfile} />
        </ScrollReveal>
      </div>
    </Section>
  );
}
