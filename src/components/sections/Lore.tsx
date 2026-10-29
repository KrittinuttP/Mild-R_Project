"use client";

import { useRef } from "react";
import Image from "next/image";

import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { DesignCredits } from "@/components/sections/DesignCredits";
import { useDebutDay } from "@/hooks/useDebutDay";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

registerGsapPlugins();

const PROFILE_IMAGE = "/assets/mild/image/Mild_R.jpg";
const LOVE_IMAGE = "/assets/mild/image/Mild-R LoVe.png";

/** Small spaced label at the top of each box */
const BOX_LABEL = "text-[0.6875rem] tracking-[0.2em]";
const BOX_PAD = "rounded-[22px] p-5 sm:p-[22px]";
const HEART_PATH =
  "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.2 4.3 2.4.8-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";
const SIDE_LABEL = { left: "ตาฝั่งซ้าย", right: "ตาฝั่งขวา" } as const;

/** "22 May 2024" for a `YYYY-MM-DD` date (dates stay in English). */
function formatYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("block shrink-0 overflow-visible fill-current", className)}>
      <path d={HEART_PATH} />
    </svg>
  );
}

type RecordRow = { label: string; value: string; sub?: string };

/** Profile line: label · dotted leader · value (+ small Thai line). */
function RecordLine({ label, value, sub }: RecordRow) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-dashed border-r-text-2/15 py-3">
      <dt className="w-[74px] shrink-0 text-[0.8125rem] text-r-text-3">{label}</dt>
      <span aria-hidden className="min-w-3 flex-1 -translate-y-1 border-b border-dotted border-r-text-2/25" />
      <dd className="text-right font-[family-name:var(--font-display)] text-base text-r-text">
        {value}
        {sub ? <span className="block text-[0.71875rem] text-r-text-2">{sub}</span> : null}
      </dd>
    </div>
  );
}

function DayBadge({ debutDate }: { debutDate: string }) {
  const day = useDebutDay(debutDate);
  return (
    <div
      role="img"
      aria-label={day ? `วันที่ ${day} นับจากเดบิวต์` : "วันนับจากเดบิวต์"}
      className="r-day-badge flex size-20 shrink-0 -rotate-8 flex-col items-center justify-center rounded-full text-r-acc"
    >
      <span className="text-[0.59375rem] tracking-[0.1em]">วันที่</span>
      <span className="font-[family-name:var(--font-display)] text-[1.4375rem] leading-[1.05] font-medium tabular-nums">
        {day ?? "···"}
      </span>
      <span className="text-[0.53125rem]">นับจากเดบิวต์</span>
    </div>
  );
}

type LoreProps = {
  data: VtuberProfile;
};

/**
 * About · รู้จัก Mild-R (AX1b): profile card · patient record · story · LoVe · likes · team credits.
 * The 4-chapter timeline (lore.chapters) is kept in data for the future About page.
 */
export function Lore({ data }: LoreProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { basic, fan, lore, characterDesign: design } = data;

  // STORY: pull quote + the first three lines that aren't the quote (the LoVe line has its own box).
  const quote = lore.quote?.trim();
  const story = lore.paragraphs.map((p) => p.trim()).filter((p) => p && p !== quote).slice(0, 3);
  const companions = design.companions ?? [];
  const likes = basic.likes ?? [];
  const dislikes = basic.dislikes ?? [];

  // Column order: left = species · birthday · height, right = debut · unit · fans (phones read top to bottom).
  const rows: Array<RecordRow | null> = [
    basic.species ? { label: "สายพันธุ์", value: basic.species, sub: basic.speciesLocal } : null,
    basic.birthdayLabel ? { label: "วันเกิด", value: basic.birthdayLabel } : null,
    basic.heightCm ? { label: "ส่วนสูง", value: `${basic.heightCm} cm` } : null,
    { label: "เดบิวต์", value: formatYmd(basic.debutDate) },
    { label: "ยูนิต", value: basic.unit, sub: basic.agency },
    { label: "แฟนคลับ", value: `${fan.fanName} ${fan.oshiMark}`, sub: fan.greetingToFans },
  ];
  const record = rows.filter((row): row is RecordRow => row !== null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(root.querySelectorAll("[data-lore-box]"), {
        autoAlpha: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
        scrollTrigger: { trigger: root.querySelector("[data-lore-grid]"), start: "top 82%", once: true },
      });
    },
    { scope: rootRef }
  );

  return (
    <Section ref={rootRef} id="lore" aria-labelledby="lore-title">
      <SectionHeader eyebrow="About · Lore" title={`รู้จัก ${basic.name}`} titleId="lore-title" />

      <div
        data-lore-grid
        className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] xl:gap-x-[22px]"
      >
        {/* ── Profile card ── */}
        <article
          data-lore-box
          className="flex flex-col overflow-hidden rounded-3xl bg-r-pri/5 ring-[1.5px] ring-r-pri/45 ring-inset"
        >
          <div className="flex items-center justify-between gap-3 bg-r-pri px-4 py-2.5 text-r-on-pri">
            <span className="truncate text-xs tracking-[0.16em]">
              {basic.name} · {basic.unit}
            </span>
            <Heart className="size-3" />
          </div>
          <div className="flex flex-1 flex-col p-4">
            {/* tablet–laptop: the card matches the record + story column, so the photo grows to fill it */}
            <div
              data-protect-media
              className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_50%_40%,var(--r-text),color-mix(in_srgb,var(--r-text-2)_45%,var(--r-text)))] md:aspect-auto md:min-h-72 md:flex-1 xl:aspect-square xl:flex-none"
            >
              <Image
                src={PROFILE_IMAGE}
                alt={basic.name}
                fill
                draggable={false}
                sizes="(min-width: 1280px) 388px, (min-width: 768px) 330px, 100vw"
                className="object-cover object-[50%_30%] select-none"
              />
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-[18px]">
              <div className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--font-display)] text-[2.5rem] leading-none text-r-text lg:text-[2.75rem]">
                  {basic.name}
                </h3>
                {basic.nameLocal ? <p className="mt-1.5 text-sm text-r-text-2">{basic.nameLocal}</p> : null}
              </div>
              <DayBadge debutDate={basic.debutDate} />
            </div>
          </div>
        </article>

        {/* ── Patient record + story ── */}
        <div className="flex min-w-0 flex-col gap-[18px]">
          <section data-lore-box aria-label="ข้อมูล" className="r-card rounded-[22px] px-5 pt-[18px] pb-2 sm:px-6">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className={cn(BOX_LABEL, "text-r-pri")}>PROFILE · ข้อมูล</p>
              <span className="hidden text-[0.71875rem] text-r-text-3 sm:inline">{basic.agency}</span>
            </div>
            <dl className="grid xl:grid-flow-col xl:grid-cols-2 xl:grid-rows-3 xl:gap-x-9">
              {record.map((row) => (
                <RecordLine key={row.label} {...row} />
              ))}
            </dl>
          </section>

          <section
            data-lore-box
            aria-label="Story"
            className="flex-1 rounded-3xl bg-white/[0.02] bg-[radial-gradient(circle_at_90%_0%,color-mix(in_srgb,var(--r-pri)_22%,transparent),transparent_55%)] px-5 py-6 ring-1 ring-r-pri/30 ring-inset sm:px-[26px]"
          >
            <p className={cn(BOX_LABEL, "text-r-pri")}>STORY · เรื่องราว</p>
            {quote ? (
              <blockquote className="mt-3 font-[family-name:var(--font-display)] text-xl leading-normal font-light text-balance text-r-text sm:text-[1.4375rem]">
                “{quote}”
              </blockquote>
            ) : null}
            {story.length > 0 ? (
              <div className={cn("space-y-3", quote && "mt-4 border-t border-r-text-2/15 pt-3.5")}>
                {story.map((p) => (
                  <p key={p} className="text-base leading-[1.75] text-r-text/85">
                    {p}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        {/* ── LoVe ── */}
        {companions.length > 0 ? (
          <section
            data-lore-box
            aria-label={design.companionGroupName ?? "LoVe"}
            className={cn(
              BOX_PAD,
              "flex flex-col bg-[linear-gradient(150deg,color-mix(in_srgb,var(--r-acc)_8%,transparent),rgb(255_255_255/0.02))] ring-1 ring-r-acc/30 ring-inset"
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className={cn(BOX_LABEL, "text-r-acc")}>
                {design.companionGroupName}
                {design.companionGroupNameLocal ? ` · ${design.companionGroupNameLocal}` : ""}
              </p>
              {design.companionGroupTagline ? (
                <span className="text-right text-[0.71875rem] text-r-text-3">{design.companionGroupTagline}</span>
              ) : null}
            </div>
            <div className="my-auto pt-3.5">
              <div data-protect-media className="relative aspect-video overflow-hidden rounded-[18px]">
                <Image
                  src={LOVE_IMAGE}
                  alt={`${design.companionGroupNameLocal ?? ""} · ${companions.map((c) => c.name).join(" และ ")}`}
                  fill
                  draggable={false}
                  sizes="(min-width: 1280px) 376px, (min-width: 768px) 316px, 100vw"
                  className="object-cover object-[50%_35%] select-none"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[18px] ring-[1.5px] ring-r-acc/35 ring-inset" />
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {companions.map((c) => (
                  <li key={c.id} className={cn(c.side === "right" && "text-right")}>
                    <p className="text-[0.9375rem] text-r-text">
                      {c.nameLocal ? `${c.nameLocal} · ` : ""}
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-xs text-r-text-3">
                      {[c.personality, SIDE_LABEL[c.side]].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ── Likes / dislikes ── */}
        {likes.length + dislikes.length > 0 ? (
          <section data-lore-box aria-label="ชอบ / ไม่ชอบ" className={cn(BOX_PAD, "r-card flex flex-col")}>
            <p className={cn(BOX_LABEL, "text-r-pri")}>LIKES · ชอบ / ไม่ชอบ</p>
            <div className="mt-3.5 grid flex-1 gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              {likes.length > 0 ? (
                <div className="rounded-[18px] bg-r-pri/6 px-5 py-[18px] ring-1 ring-r-pri/22 ring-inset">
                  <p className="flex items-center gap-2 text-[0.9375rem] text-r-text">
                    <Heart className="size-3.5 text-r-pri" /> ของที่ชอบ
                  </p>
                  <ul className="mt-3.5 flex flex-wrap gap-2">
                    {likes.map((item) => (
                      <li key={item} className="rounded-full bg-r-pri/14 px-3.5 py-1.5 text-sm text-r-text/85">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {dislikes.length > 0 ? (
                <div className="rounded-[18px] bg-white/[0.02] px-5 py-[18px] ring-1 ring-r-text-2/15 ring-inset">
                  <p className="text-[0.9375rem] text-r-text/85">
                    <span aria-hidden>✕ </span>ของที่ไม่ชอบ
                  </p>
                  <ul className="mt-3.5 flex flex-wrap gap-2">
                    {dislikes.map((item) => (
                      <li key={item} className="rounded-full bg-white/6 px-3.5 py-1.5 text-sm text-r-text-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── Team ── */}
        <section
          data-lore-box
          aria-label="ทีมผู้สร้าง"
          className="r-card rounded-[22px] px-5 py-6 sm:px-7 md:col-span-2"
        >
          <p className={cn(BOX_LABEL, "mb-[18px] text-r-pri")}>ทีมผู้สร้าง</p>
          <DesignCredits design={design} variant="aplus" />
        </section>
      </div>
    </Section>
  );
}
