"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { BADGE_SOFT_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { HashtagGroup } from "@/types/vtuber";

const CATEGORY_HINT: Record<HashtagGroup["category"], string> = {
  general: "ทั่วไป",
  art: "แฟนอาร์ต",
  meme: "มีม",
  fan: "แฟน",
  other: "อื่นๆ",
};

function getXHashtagUrl(tag: string) {
  const slug = tag.replace(/^#/, "").trim();
  return `https://x.com/hashtag/${encodeURIComponent(slug)}`;
}

type ConnectHashtagPillsProps = {
  groups: HashtagGroup[];
  className?: string;
};

export function ConnectHashtagPills({ groups, className }: ConnectHashtagPillsProps) {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const items = groups.flatMap((group) =>
    group.tags.map((tag) => ({
      tag,
      hint: CATEGORY_HINT[group.category],
    }))
  );

  async function copyTag(tag: string) {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      window.setTimeout(
        () => setCopiedTag((current) => (current === tag ? null : current)),
        2000
      );
    } catch {
      // ignore — clipboard may be unavailable
    }
  }

  return (
    <ul className={cn("flex flex-wrap gap-2.5", className)}>
      {items.map(({ tag, hint }) => {
        const copied = copiedTag === tag;

        return (
          <li key={tag}>
            <span
              className={cn(
                BADGE_SOFT_CLASS,
                "inline-flex min-h-9 items-center gap-0.5 py-1 pr-1 pl-3 transition hover:border-[#e85a7a]/35"
              )}
            >
              <Link
                href={getXHashtagUrl(tag)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-[family-name:var(--font-display)] text-sm text-[#fff5f7] transition hover:text-[#e85a7a] sm:text-base"
              >
                {tag}
              </Link>
              <span className="hidden px-1 text-[#f3b8c4]/45 sm:inline">·</span>
              <span className="hidden text-xs text-[#f3b8c4]/55 sm:inline">{hint}</span>
              <button
                type="button"
                onClick={() => copyTag(tag)}
                aria-label={copied ? `คัดลอก ${tag} แล้ว` : `คัดลอก ${tag}`}
                className="ml-1 inline-flex size-7 items-center justify-center rounded-full text-[#f3b8c4]/70 transition hover:bg-[#e85a7a]/15 hover:text-[#e85a7a]"
              >
                {copied ? (
                  <Check className="size-3.5 text-[#e85a7a]" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </button>
            </span>
            {copied ? (
              <span className="sr-only" role="status">
                คัดลอกแล้ว
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
