import type { CSSProperties } from "react";
import { Award, ChevronDown, ExternalLink, Heart, Smile } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { RChip } from "@/components/common/RChip";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { MembershipIntroVideo } from "@/components/sections/MembershipIntroVideo";
import { R_CTA_OUTLINE_CLASS, R_CTA_PRIMARY_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import { getYoutubeVideoId } from "@/lib/youtube";
import type { MembershipInfo, MembershipTier, VtuberProfile } from "@/types/vtuber";

type MembershipProps = {
  data: VtuberProfile;
};

const HEART_PATH =
  "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.2 4.3 2.4.8-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";

/** ♥ × level — one heart per tier step. */
function Hearts({ count, className }: { count: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex gap-0.5", className)}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-3 fill-current">
          <path d={HEART_PATH} />
        </svg>
      ))}
    </span>
  );
}

const price = (thb: number) => `฿${thb.toLocaleString("en-US")}`;
/** "MyHoneyหวานๆ" → "หวานๆ" */
const tierShort = (tier: MembershipTier) => tier.name.replace(/^MyHoney\s*/, "");

/**
 * "รวมสิทธิ์ระดับหวานๆ" for the 2nd tier, "รวมสิทธิ์ระดับก่อนหน้า" after that.
 * Skipped when the tier's own perk already says it ("เหมือนขั้นก่อนหน้า …").
 */
function inheritLine(tiers: MembershipTier[], index: number): string | null {
  if (index === 0) return null;
  if (tiers[index].perks.some((p) => p.label.includes("ก่อนหน้า"))) return null;
  return index === 1 ? `รวมสิทธิ์ระดับ${tierShort(tiers[0])}` : "รวมสิทธิ์ระดับก่อนหน้า";
}

/** Tier name in the card header */
const TIER_LABEL = "min-w-0 truncate font-[family-name:var(--font-display)] text-sm";

/* ── desktop / tablet ────────────────────────────────────────────── */

function TierCard({ tiers, index }: { tiers: MembershipTier[]; index: number }) {
  const tier = tiers[index];
  const lead = index === 0;
  const inherit = inheritLine(tiers, index);
  return (
    <article
      className={cn(
        "r-card relative overflow-hidden rounded-[22px] shadow-none",
        lead ? "ring-[2.5px] ring-r-pri" : "ring-2 ring-r-pri/32"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          lead ? "bg-r-pri text-r-text" : "bg-r-pri/10 text-r-text-2"
        )}
      >
        <h3 className={TIER_LABEL}>{tier.name}</h3>
        <Hearts count={index + 1} />
      </div>
      {lead ? (
        <span
          aria-hidden
          className="r-shine pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      ) : null}
      <div className="relative px-4 pt-3.5 pb-[18px]">
        <p className="font-[family-name:var(--font-display)] text-[1.875rem] font-semibold text-r-text-2">
          {price(tier.priceThb)} <span className="text-[0.8125rem] font-normal text-r-text-3">/ เดือน</span>
        </p>
        {lead ? <RChip className="mt-1 bg-r-acc/8 text-r-acc ring-r-acc/32">เริ่มต้น</RChip> : null}
        <ul className="mt-3 flex flex-col gap-1.5 text-[0.8125rem] leading-[1.45] text-r-text/90">
          {inherit ? <li className="text-r-text-2">{inherit}</li> : null}
          {tier.perks.map((perk) => (
            <li key={perk.label} className="flex gap-1.5">
              <span aria-hidden>{perk.icon}</span>
              {perk.label}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** Channel emoji sliding past in a loop (pauses on hover; still under reduced motion). */
function EmojiMarquee({ membership }: { membership: MembershipInfo }) {
  const row = (copy: boolean) => (
    <span aria-hidden={copy || undefined} className={cn("flex shrink-0 gap-2.5 pr-2.5", copy && "r-ticker-copy")}>
      {membership.emojis.map((emoji) => (
        <span
          key={emoji.id}
          title={copy ? undefined : emoji.alt}
          className="r-card flex size-[60px] shrink-0 items-center justify-center rounded-[18px] p-1.5 shadow-none ring-2 ring-r-pri/32"
        >
          <ProtectedImage
            src={emoji.src}
            alt={copy ? "" : emoji.alt}
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        </span>
      ))}
    </span>
  );
  return (
    <div className="r-ticker-mask overflow-hidden py-1">
      <div className="r-ticker flex w-max px-0.5" style={{ "--r-ticker-dur": "22s" } as CSSProperties}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

/* ── phones ──────────────────────────────────────────────────────── */

function TierAccordion({ tiers, index }: { tiers: MembershipTier[]; index: number }) {
  const tier = tiers[index];
  const lead = index === 0;
  const inherit = inheritLine(tiers, index);
  const summary = [inherit, ...tier.perks.map((p) => p.label)].filter(Boolean).join(" · ");
  return (
    <details
      open={lead}
      className={cn(
        "group r-card rounded-[20px] px-4 py-3.5 shadow-none",
        lead ? "relative ring-[1.5px] ring-r-pri" : "ring-1 ring-r-text-2/15"
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 font-[family-name:var(--font-display)] text-[0.9375rem] text-r-text">{tier.name}</span>
            <Hearts count={index + 1} className="shrink-0 text-r-pri" />
          </span>
          {/* closed: one-line summary (only the <summary> shows while closed) */}
          <span className="mt-2 block text-xs leading-relaxed text-r-text-3 group-open:hidden">{summary}</span>
        </span>
        <span className="text-right">
          <span className="block font-[family-name:var(--font-display)] text-[1.375rem] leading-tight font-semibold text-r-text-2">
            {price(tier.priceThb)}
          </span>
          <span className="block text-[0.6875rem] text-r-text-3">/ เดือน</span>
        </span>
        <ChevronDown aria-hidden className="mt-2 size-4 shrink-0 text-r-text-2 transition-transform group-open:rotate-180" />
      </summary>
      {lead ? (
        <RChip className="absolute -top-3 right-4 bg-r-bg text-r-acc ring-r-acc/40">เริ่มต้น</RChip>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2 border-t border-r-text-2/15 pt-3 text-sm text-r-text/90">
        {inherit ? <li className="text-r-text-2">{inherit}</li> : null}
        {tier.perks.map((perk) => (
          <li key={perk.label} className="flex gap-2">
            <span aria-hidden>{perk.icon}</span>
            {perk.label}
          </li>
        ))}
      </ul>
    </details>
  );
}

function PerksBox({ membership }: { membership: MembershipInfo }) {
  return (
    <div className="r-card rounded-[20px] p-4 shadow-none ring-1 ring-r-text-2/15">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-base text-r-text">สิ่งที่สมาชิกจะได้</h3>
        <span className="text-xs text-r-text-3">ทุกระดับ</span>
      </div>
      <p className="mt-3.5 flex items-center gap-2 text-[0.8125rem] text-r-text-2">
        <Smile aria-hidden className="size-4" /> อีโมจิเฉพาะช่อง · {membership.emojis.length} แบบ
      </p>
      <ul className="mt-2.5 grid grid-cols-6 gap-1.5">
        {membership.emojis.map((emoji) => (
          <li key={emoji.id} title={emoji.alt} className="aspect-square rounded-[10px] p-1 ring-1 ring-r-pri/32">
            <ProtectedImage src={emoji.src} alt={emoji.alt} loading="lazy" className="size-full object-contain" />
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-2 text-[0.8125rem] text-r-text-2">
        <Award aria-hidden className="size-4" /> ป้ายสมาชิกตามอายุ · {membership.badges.length} แบบ
      </p>
      <ol className="mt-2.5 grid grid-cols-6 gap-1.5">
        {membership.badges.map((badge) => (
          <li key={badge.id} className="flex flex-col items-center gap-1 text-center">
            <ProtectedImage src={badge.src} alt="" loading="lazy" className="size-10 object-contain" />
            <span className="text-[0.6875rem] leading-tight text-r-text-2">{badge.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── section ─────────────────────────────────────────────────────── */

/** Home · สมาชิก MyHoney (project R · MB1 + intro clip). Stronger corner light (CI A+). */
export function Membership({ data }: MembershipProps) {
  const { membership } = data;
  const introVideoId = getYoutubeVideoId(membership.introVideoUrl);
  const cheapest = membership.tiers.reduce((min, t) => Math.min(min, t.priceThb), Infinity);

  const joinButton = (label: string, className?: string) => (
    <a href={membership.joinUrl} target="_blank" rel="noopener noreferrer" className={cn(R_CTA_PRIMARY_CLASS, className)}>
      <Heart aria-hidden className="size-4 fill-current" />
      {label}
    </a>
  );

  return (
    <Section id="member" strong className="overflow-hidden">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-9">
        <ScrollReveal>
          <SectionHeader eyebrow="Member" title={membership.title} description={membership.description} />
          <div className="mt-[22px] hidden flex-wrap gap-3.5 md:flex">
            {joinButton("สมัครสมาชิก")}
            {membership.introVideoUrl ? (
              <a href={membership.introVideoUrl} target="_blank" rel="noopener noreferrer" className={R_CTA_OUTLINE_CLASS}>
                ดูบน YouTube
                <ExternalLink aria-hidden className="size-4" />
              </a>
            ) : null}
          </div>
        </ScrollReveal>
        {introVideoId ? (
          <ScrollReveal delay={0.08} className="hidden md:block">
            <MembershipIntroVideo videoId={introVideoId} title={membership.title} label="คลิปแนะนำ MyHoney" />
          </ScrollReveal>
        ) : null}
      </div>

      {/* tablet + desktop */}
      <div className="hidden md:block">
        <ScrollReveal className="mt-[22px]">
          <EmojiMarquee membership={membership} />
        </ScrollReveal>
        <ScrollReveal className="mt-[26px]">
          <div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-4">
            {membership.tiers.map((tier, index) => (
              <TierCard key={tier.id} tiers={membership.tiers} index={index} />
            ))}
          </div>
          <div className="mt-[18px] flex flex-wrap items-center gap-2">
            <span className="text-[0.78125rem] text-r-text-3">ป้ายสมาชิกตามอายุ:</span>
            {membership.badges.map((badge) => (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1.5 rounded-full py-[3px] pr-[13px] pl-1.5 text-[0.8125rem] text-r-text/90 ring-1 ring-r-text-2/15 ring-inset"
              >
                <ProtectedImage src={badge.src} alt="" width={20} height={20} loading="lazy" className="size-5 object-contain" />
                {badge.label}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* phones */}
      <div className="mt-6 flex flex-col gap-2.5 md:hidden">
        {membership.tiers.map((tier, index) => (
          <TierAccordion key={tier.id} tiers={membership.tiers} index={index} />
        ))}
        <div className="mt-1.5">
          <PerksBox membership={membership} />
        </div>
        {introVideoId ? (
          <div className="mt-4">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h3 className="font-[family-name:var(--font-display)] text-base text-r-text">คลิปแนะนำ MyHoney</h3>
              <span className="text-xs text-r-text-3">ดูก่อนสมัคร</span>
            </div>
            <MembershipIntroVideo videoId={introVideoId} title={membership.title} />
          </div>
        ) : null}
        {joinButton(`สมัครสมาชิก · เริ่ม ${price(cheapest)}/เดือน`, "mt-4 h-[52px] w-full")}
        <a
          href={membership.joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto inline-flex items-center gap-1.5 text-[0.8125rem] text-r-text-2"
        >
          สมัครผ่าน YouTube
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </div>
    </Section>
  );
}
