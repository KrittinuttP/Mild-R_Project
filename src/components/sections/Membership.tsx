import { ExternalLink, Heart } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { MembershipIntroVideo } from "@/components/sections/MembershipIntroVideo";
import { buttonVariants } from "@/components/ui/button";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H3_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import { getYoutubeVideoId } from "@/lib/youtube";
import type { VtuberProfile } from "@/types/vtuber";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

type MembershipProps = {
  data: VtuberProfile;
};

const PANEL_CLASS = "rounded-3xl border border-[#f3b8c4]/12 bg-[#1a0c12]/60";

function formatPrice(thb: number): string {
  return `฿${thb.toLocaleString("th-TH")}`;
}

/** Home: YouTube channel membership — tiers, loyalty badges, custom emoji. */
export function Membership({ data }: MembershipProps) {
  const { membership } = data;
  const introVideoId = getYoutubeVideoId(membership.introVideoUrl);

  return (
    <Section id="member" strong className="overflow-hidden">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-12">
        <ScrollReveal variant="editorial" className="max-w-2xl">
          <SectionHeader eyebrow="Member" title={membership.title} description={membership.description} />
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={membership.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), CTA_PRIMARY_CLASS, "px-5")}
            >
              <Heart className="size-4" aria-hidden />
              สมัครสมาชิก
            </a>
            {membership.introVideoUrl ? (
              <a
                href={membership.introVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), CTA_OUTLINE_CLASS, "px-5")}
              >
                ดูบน YouTube
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </ScrollReveal>

        {introVideoId ? (
          <ScrollReveal variant="float" delay={0.1}>
            <MembershipIntroVideo videoId={introVideoId} title="Mild-R Membership" />
          </ScrollReveal>
        ) : null}
      </div>

      <ul className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {membership.tiers.map((tier, index) => (
          <ScrollReveal
            key={tier.id}
            as="li"
            delay={index * 0.08}
            className={cn(PANEL_CLASS, "flex flex-col p-5 sm:p-6")}
          >
            <h3 className={DISPLAY_H3_CLASS}>{tier.name}</h3>
            <p className="mt-2 text-[#fff5f7]">
              <span className="font-[family-name:var(--font-display)] text-2xl">
                {formatPrice(tier.priceThb)}
              </span>
              <span className="ml-1 text-sm text-[#f3b8c4]/60">/ เดือน</span>
            </p>
            <div className="my-4 h-px bg-[#f3b8c4]/12" />
            {index > 0 ? (
              <p className="mb-3 text-xs text-[#f3b8c4]/60">
                รวมสิทธิ์จาก {membership.tiers[index - 1].name}
              </p>
            ) : null}
            <ul className="space-y-2.5">
              {tier.perks.map((perk) => (
                <li key={perk.label} className="flex gap-2.5 text-sm leading-snug text-[#f7d7de]/85">
                  <span aria-hidden className="shrink-0">
                    {perk.icon}
                  </span>
                  {perk.label}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ScrollReveal className={cn(PANEL_CLASS, "flex flex-col p-5 sm:p-6")}>
          <h3 className={DISPLAY_H3_CLASS}>ป้ายชานมตามอายุสมาชิก</h3>
          <p className="mt-1 text-sm text-[#f3b8c4]/60">
            ป้ายข้างชื่อในแชทจะเปลี่ยนไปตามระยะเวลาที่เป็น MyHoney
          </p>
          <ol className="mt-5 grid flex-1 grid-cols-3 content-center gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-3">
            {membership.badges.map((badge) => (
              <li key={badge.id} className="flex flex-col items-center gap-2 text-center">
                <ProtectedImage
                  src={badge.src}
                  alt={`ป้ายสมาชิก ${badge.label}`}
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  className="size-14 object-contain sm:size-20"
                />
                <span className="text-xs text-[#f7d7de]/80">{badge.label}</span>
              </li>
            ))}
          </ol>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className={cn(PANEL_CLASS, "p-5 sm:p-6")}>
          <h3 className={DISPLAY_H3_CLASS}>อีโมจิเฉพาะช่อง</h3>
          <p className="mt-1 text-sm text-[#f3b8c4]/60">
            ใช้ได้ในความคิดเห็นและแชทสดของช่อง Mild-R
          </p>
          <ul className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
            {membership.emojis.map((emoji) => (
              <li
                key={emoji.id}
                title={emoji.alt}
                className="flex aspect-square items-center justify-center rounded-2xl bg-[#140a0d]/70 p-1.5 transition duration-300 hover:-translate-y-0.5 hover:bg-[#241019]"
              >
                <ProtectedImage
                  src={emoji.src}
                  alt={emoji.alt}
                  width={96}
                  height={96}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </Section>
  );
}
