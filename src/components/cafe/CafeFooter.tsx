import Link from "next/link";

import { SherlockSweetieLogo } from "@/components/cafe/SherlockSweetieLogo";
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
    <footer className="border-t border-cafe-gold/20 bg-cafe-deep px-5 py-12 text-cafe-text sm:px-10 sm:py-14 lg:px-16">
      <div className="mx-auto max-w-[1280px]">
        <div
          className="h-px bg-gradient-to-r from-transparent via-cafe-gold/40 to-transparent"
          aria-hidden
        />

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-cafe-serif)] text-[0.58rem] font-bold tracking-[0.24em] text-cafe-gold uppercase sm:text-[0.62rem] sm:tracking-[0.28em]">
              Fan project · Not official
              {cafe.edition?.caseNo ? ` · ${cafe.edition.caseNo}` : ""}
            </p>
            <SherlockSweetieLogo
              variant="inline"
              label={masthead}
              as="p"
              className="mt-3 flex-wrap text-[17px] sm:text-[21px] md:text-2xl"
            />
            {cafe.titleLocal ? (
              <p className="mt-2 text-sm text-cafe-muted">{cafe.titleLocal}</p>
            ) : null}
            <p className="mt-3 max-w-md font-[family-name:var(--font-cafe-thai)] text-sm leading-relaxed text-cafe-muted/90 sm:mt-4">
              คาเฟ่นี้จัดทำโดยแฟนคลับ Honeycomb — ไม่ใช่โครงการทางการของ Mild-R /
              หน่วยงานอย่างเป็นทางการ · เว็บโปรโมทนี้ก็เป็นงานแฟนเมดเช่นกัน
            </p>

          </div>

          <div className="space-y-3 border-t border-cafe-gold/15 pt-6 md:border-t-0 md:pt-0 md:text-right">
            {cafe.closing.disclaimer ? (
              <p className="max-w-md text-xs leading-relaxed text-cafe-gold/85 md:ml-auto">
                {cafe.closing.disclaimer}
              </p>
            ) : null}
            <p className="m-0 text-[0.65rem] leading-none tracking-[0.14em] text-cafe-gold/90 uppercase sm:text-xs sm:tracking-[0.16em]">
              © {year} · {cafe.title.split(": ", 2)[0] ?? cafe.title} · Fan-made
              <Link
                href="/cafe/settings"
                aria-label="Cafe settings"
                className="ml-1 inline-block text-cafe-gold/25 transition hover:text-cafe-gold/70"
              >
                ·
              </Link>
            </p>
            <p className="m-0 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs leading-none tracking-wide text-cafe-gold/90 md:justify-end">
              <span>Made with 🩷 by</span>
              <Link
                href={DEVELOPER.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 transition hover:text-cafe-gold-soft"
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
