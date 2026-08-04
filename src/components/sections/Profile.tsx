import { ScrollReveal } from "@/components/animations/ScrollReveal";
import type { VtuberProfile } from "@/types/vtuber";

type ProfileProps = {
  data: VtuberProfile;
};

function formatDebutDate(iso: string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function Profile({ data }: ProfileProps) {
  const { basic, fan, characterDesign } = data;

  return (
    <section
      id="profile"
      className="relative scroll-mt-24 bg-[#140a0d] px-6 py-24 text-[#fff5f7] sm:px-10 lg:px-16"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <ScrollReveal>
          <p className="text-sm tracking-[0.28em] text-[#f3b8c4]/75 uppercase">
            Profile
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            {basic.name}
            {basic.nameLocal ? (
              <span className="mt-2 block text-xl font-medium text-[#f3b8c4]/85">
                {basic.nameLocal}
              </span>
            ) : null}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f7d7de]/85">
            {data.lore.summary}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.12} className="space-y-6 text-sm sm:text-base">
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
              <dd className="text-right">{formatDebutDate(basic.debutDate)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Fan name</dt>
              <dd className="text-right">
                {fan.fanName} {fan.oshiMark}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Illustrator</dt>
              <dd className="text-right">{characterDesign.illustrator.name}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-[#f3b8c4]/65">Rigger</dt>
              <dd className="text-right">{characterDesign.rigger.name}</dd>
            </div>
          </dl>
        </ScrollReveal>
      </div>
    </section>
  );
}
