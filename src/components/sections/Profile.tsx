import Link from "next/link";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { DesignCredits } from "@/components/sections/DesignCredits";
import { formatEnglishDate } from "@/lib/events";
import { BODY_CLASS, DISPLAY_H1_CLASS, META_MUTED_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type ProfileProps = {
  data: VtuberProfile;
};

export function Profile({ data }: ProfileProps) {
  const { basic, fan, characterDesign } = data;

  return (
    <section
      id="profile"
      className="relative scroll-mt-24 bg-[#140a0d] px-6 py-24 text-[#fff5f7] sm:px-10 lg:px-16"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <ScrollReveal>
          <p className={META_MUTED_CLASS}>Profile</p>
          <h2 className={cn("mt-3", DISPLAY_H1_CLASS)}>
            {basic.name}
            {basic.nameLocal ? (
              <span className="mt-2 block text-xl font-medium text-[#f3b8c4]/85">
                {basic.nameLocal}
              </span>
            ) : null}
          </h2>
          {basic.species ? (
            <p className="mt-3 text-sm tracking-[0.12em] text-[#e85a7a] uppercase">
              {basic.species}
            </p>
          ) : null}
          <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>
            {data.lore.summary}
          </p>

          {basic.likes?.length || basic.dislikes?.length ? (
            <div className="mt-8 space-y-4">
              {basic.likes?.length ? (
                <div>
                  <p className={META_MUTED_CLASS}>Likes</p>
                  <p className="mt-2 leading-relaxed text-[#f7d7de]/90">
                    {basic.likes.join(" · ")}
                  </p>
                </div>
              ) : null}
              {basic.dislikes?.length ? (
                <div>
                  <p className={META_MUTED_CLASS}>Dislikes</p>
                  <p className="mt-2 leading-relaxed text-[#f7d7de]/90">
                    {basic.dislikes.join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </ScrollReveal>

        <ScrollReveal delay={0.12} className="space-y-10 text-sm sm:text-base">
          <dl className="space-y-4 border-t border-[#f3b8c4]/20 pt-6">
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Unit</dt>
              <dd className="text-right">{basic.unit}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Agency</dt>
              <dd className="text-right">{basic.agency}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Debut</dt>
              <dd className="text-right">{formatEnglishDate(basic.debutDate)}</dd>
            </div>
            {basic.heightCm ? (
              <div className="flex justify-between gap-6">
                <dt className="text-[#f3b8c4]/65">Height</dt>
                <dd className="text-right">{basic.heightCm} cm</dd>
              </div>
            ) : null}
            {basic.birthdayLabel || basic.birthday ? (
              <div className="flex justify-between gap-6">
                <dt className="text-[#f3b8c4]/65">Birthday</dt>
                <dd className="text-right">
                  {basic.birthdayLabel ?? basic.birthday}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Fan name</dt>
              <dd className="text-right">
                {fan.fanName}
                {fan.fanNameEn ? ` / ${fan.fanNameEn}` : ""} {fan.oshiMark}
              </dd>
            </div>
            {basic.originalSong ? (
              <div className="flex justify-between gap-6">
                <dt className="text-[#f3b8c4]/65">Original</dt>
                <dd className="max-w-[60%] text-right">
                  {basic.originalSong.url ? (
                    <Link
                      href={basic.originalSong.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition hover:text-[#e85a7a]"
                    >
                      {basic.originalSong.title}
                    </Link>
                  ) : (
                    basic.originalSong.title
                  )}
                  {basic.originalSong.note ? (
                    <span className="mt-0.5 block text-xs text-[#f3b8c4]/55">
                      {basic.originalSong.note}
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          <DesignCredits
            design={characterDesign}
            variant="strip"
            size="md"
            showHandle={false}
            layout="inline"
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
