import Link from "next/link";

import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import type { CafePage } from "@/types/vtuber";

const DEVELOPER = {
  name: "ZAYZHIK 🦈",
  xUrl: "https://x.com/ZAYZHIK_KungV2",
} as const;

type CafeFooterProps = {
  cafe: CafePage;
};

export function CafeFooter({ cafe }: CafeFooterProps) {
  const year = new Date().getFullYear();
  const masthead = cafe.edition?.masthead ?? cafe.title;

  return (
    <footer className="border-t border-[#9a7b5a]/20 bg-[#07090b] px-5 py-12 text-[#d8d0c4] sm:px-10 sm:py-14 lg:px-16">
      <div className="mx-auto max-w-[1280px]">
        <div
          className="h-px bg-gradient-to-r from-transparent via-[#9a7b5a]/40 to-transparent"
          aria-hidden
        />

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
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

          </div>

          <div className="space-y-3 border-t border-[#9a7b5a]/15 pt-6 md:border-t-0 md:pt-0 md:text-right">
            {cafe.closing.disclaimer ? (
              <p className="max-w-md text-xs leading-relaxed text-[#9a7b5a]/85 md:ml-auto">
                {cafe.closing.disclaimer}
              </p>
            ) : null}
            <p className="m-0 text-[0.65rem] leading-none tracking-[0.14em] text-[#9a7b5a]/70 uppercase sm:text-xs sm:tracking-[0.16em]">
              © {year} · {cafe.title.split(": ", 2)[0] ?? cafe.title} · Fan-made
              <Link
                href="/cafe/settings"
                aria-label="Cafe settings"
                className="ml-1 inline-block text-[#9a7b5a]/25 transition hover:text-[#9a7b5a]/70"
              >
                ·
              </Link>
            </p>
            <p className="m-0 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs leading-none tracking-wide text-[#9a7b5a]/70 md:justify-end">
              <span>Made with 🩷 by</span>
              <Link
                href={DEVELOPER.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 transition hover:text-[#c46a7a]"
              >
                <span>{DEVELOPER.name}</span>
                <SocialPlatformIcon
                  platform="x"
                  className="size-[0.85em] shrink-0 opacity-80 transition group-hover:opacity-100"
                />
                <span className="sr-only">บน X</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
