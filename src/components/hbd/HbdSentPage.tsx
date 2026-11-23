import Link from "next/link";
import { ArrowLeft, MailPlus } from "lucide-react";

import { HbdSentList, type HbdSentListRow } from "@/components/hbd/HbdSentList";
import { R_CTA_PRIMARY_CLASS, R_EYEBROW_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";

type Props = {
  rows: HbdSentListRow[];
  back: { href: string; label: string };
  /** Where "ส่งการ์ดอวยพร" goes (main site or standalone form). */
  sendHref: string;
  className?: string;
};

/** Body of the sent list: back link, heading, names, send button. Used by both sent pages. */
export function HbdSentPage({ rows, back, sendHref, className }: Props) {
  return (
    <div className={cn("mx-auto max-w-lg px-4 sm:px-5", className)}>
      <Link
        href={back.href}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/20 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
          FOCUS
        )}
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {back.label}
      </Link>

      <header className="mt-6">
        <p className={R_EYEBROW_CLASS}>Birthday · 12 Dec 2026</p>
        <h1
          className={cn(
            DISPLAY,
            "mt-2.5 text-[1.875rem] leading-tight font-normal text-r-text sm:text-[2.125rem]"
          )}
        >
          ฮันนี่ที่ส่งการ์ดแล้ว
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-r-text-2">
          เจอชื่อตัวเองในรายชื่อ <span className="whitespace-nowrap">แปลว่าการ์ดส่งถึงแล้ว</span>
        </p>
      </header>

      <HbdSentList rows={rows} />

      <Link href={sendHref} prefetch={false} className={cn(R_CTA_PRIMARY_CLASS, "mt-8 w-full")}>
        <MailPlus className="size-4" aria-hidden />
        {rows.length ? "ยังไม่ได้ส่ง? ส่งการ์ดอวยพร" : "ส่งการ์ดอวยพร"}
      </Link>
    </div>
  );
}
