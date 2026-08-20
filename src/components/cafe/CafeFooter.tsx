import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

import type { CafePage } from "@/types/vtuber";

const DEVELOPER = {
  name: "ZAYZHIK 🦈",
  xUrl: "https://x.com/ZAYZHIK_KungV2",
} as const;

const CAFE_X = {
  label: "ติดตามข่าวคาเฟ่บน X",
  handle: "@Mild_Honeycomb",
  url: "https://x.com/Mild_Honeycomb",
} as const;

type CafeFooterProps = {
  cafe: CafePage;
};

export function CafeFooter({ cafe }: CafeFooterProps) {
  const year = new Date().getFullYear();
  const masthead = cafe.edition?.masthead ?? cafe.title;
  const closingCtas = cafe.closing.ctas ?? [];
  const xFromData = closingCtas.find((cta) => cta.url.includes("x.com"));
  const followUrl = xFromData?.url ?? CAFE_X.url;
  const followLabel = xFromData?.label ?? CAFE_X.label;

  return (
    <footer className="border-t border-[#9a7b5a]/25 bg-[#07090b] px-5 py-12 text-[#d8d0c4] sm:px-10 sm:py-14 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-1" aria-hidden>
          <div className="border-t-2 border-[#9a7b5a]/35" />
          <div className="border-t border-[#9a7b5a]/25" />
        </div>

        <div className="mt-7 flex flex-col gap-8 sm:mt-8 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="min-w-0">
            <p className="text-[0.58rem] tracking-[0.24em] text-[#9a7b5a] uppercase sm:text-[0.62rem] sm:tracking-[0.28em]">
              Fan project · Not official
              {cafe.edition?.caseNo ? ` · ${cafe.edition.caseNo}` : ""}
            </p>
            <p className="mt-2 font-[family-name:var(--font-cafe-serif)] text-xl font-semibold tracking-tight text-[#f4ebe3] italic sm:text-2xl md:text-3xl">
              {masthead}
            </p>
            {cafe.titleLocal ? (
              <p className="mt-1 text-sm text-[#c4b8a8]">{cafe.titleLocal}</p>
            ) : null}
            <p className="mt-3 max-w-md font-[family-name:var(--font-cafe-serif)] text-sm leading-relaxed text-[#c4b8a8]/90 sm:mt-4">
              คาเฟ่นี้จัดทำโดยแฟนคลับ Honeycomb — ไม่ใช่โครงการทางการของ Mild-R /
              หน่วยงานอย่างเป็นทางการ · เว็บโปรโมทนี้ก็เป็นงานแฟนเมดเช่นกัน
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
              <Link
                href={followUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 border border-[#a84d5f]/45 bg-[#a84d5f]/15 px-3 py-2 text-sm text-[#f4ebe3] transition hover:border-[#c46a7a]/60 hover:bg-[#a84d5f]/25"
              >
                {followLabel}
                <span className="text-[#c4b8a8]">({CAFE_X.handle})</span>
                <ExternalLink className="size-3.5 opacity-70" />
              </Link>
            </div>
          </div>

          <div className="space-y-3 border-t border-[#9a7b5a]/20 pt-6 md:border-t-0 md:pt-0 md:text-right">
            {cafe.closing.disclaimer ? (
              <p className="max-w-md text-xs leading-relaxed text-[#9a7b5a]/85 md:ml-auto">
                {cafe.closing.disclaimer}
              </p>
            ) : null}
            <p className="text-[0.65rem] tracking-[0.14em] text-[#9a7b5a]/70 uppercase sm:text-xs sm:tracking-[0.16em]">
              © {year} · {cafe.title.split(": ", 2)[0] ?? cafe.title} · Fan-made
              <Link
                href="/cafe/settings"
                aria-label="Cafe settings"
                className="ml-1 inline-block text-[#9a7b5a]/25 transition hover:text-[#9a7b5a]/70"
              >
                ·
              </Link>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide text-[#9a7b5a]/70 md:justify-end">
              <span>Made with 🩷 by</span>
              <Link
                href={DEVELOPER.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 transition hover:text-[#c46a7a]"
              >
                <span>{DEVELOPER.name}</span>
                <span
                  className="inline-flex size-6 items-center justify-center border border-[#9a7b5a]/40 text-[#d8d0c4] transition group-hover:border-[#c46a7a]/55 group-hover:text-[#c46a7a]"
                  aria-hidden
                >
                  <X className="size-3.5" />
                </span>
                <span className="sr-only">บน X</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
