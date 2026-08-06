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
  const xFromData = cafe.ctas.find((cta) => cta.url.includes("x.com"));
  const followUrl = xFromData?.url ?? CAFE_X.url;
  const followLabel = xFromData?.label ?? CAFE_X.label;

  return (
    <footer className="border-t border-[#9a7b5a]/25 bg-[#07090b] px-6 py-14 text-[#d8d0c4] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-1" aria-hidden>
          <div className="border-t-2 border-[#9a7b5a]/35" />
          <div className="border-t border-[#9a7b5a]/25" />
        </div>

        <div className="mt-8 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.62rem] tracking-[0.28em] text-[#9a7b5a] uppercase">
              Fan project · Not official
              {cafe.edition?.caseNo ? ` · ${cafe.edition.caseNo}` : ""}
            </p>
            <p className="mt-2 font-[family-name:var(--font-cafe-serif)] text-2xl font-semibold tracking-tight text-[#f4ebe3] italic sm:text-3xl">
              {masthead}
            </p>
            {cafe.titleLocal ? (
              <p className="mt-1 text-sm text-[#c4b8a8]">{cafe.titleLocal}</p>
            ) : null}
            <p className="mt-4 max-w-md font-[family-name:var(--font-cafe-serif)] text-sm leading-relaxed text-[#c4b8a8]/90">
              คาเฟ่นี้จัดทำโดยแฟนคลับ Honeycomb — ไม่ใช่โครงการทางการของ Mild-R /
              หน่วยงานอย่างเป็นทางการ · เว็บโปรโมทนี้ก็เป็นงานแฟนเมดเช่นกัน
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link
                href={followUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#c46a7a] transition hover:text-[#f4ebe3]"
              >
                {followLabel}
                <span className="text-[#9a7b5a]">({CAFE_X.handle})</span>
                <ExternalLink className="size-3.5 opacity-60" />
              </Link>
              <Link
                href="/projects/cafe"
                className="text-[#d8d0c4] transition hover:text-[#c46a7a]"
              >
                Case file
              </Link>
            </div>
          </div>

          <div className="space-y-3 md:text-right">
            {cafe.disclaimer ? (
              <p className="max-w-md text-xs leading-relaxed text-[#9a7b5a]/85 md:ml-auto">
                {cafe.disclaimer}
              </p>
            ) : null}
            <p className="text-xs tracking-[0.16em] text-[#9a7b5a]/70 uppercase">
              © {year} · Honey Pulse Cafe · Fan-made
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
