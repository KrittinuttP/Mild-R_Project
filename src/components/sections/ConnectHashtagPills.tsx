"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HashtagGroup } from "@/types/vtuber";

const CATEGORY_HINT: Record<HashtagGroup["category"], string> = {
  general: "ทั่วไป",
  art: "แฟนอาร์ต",
  meme: "มีม",
  fan: "แฟน",
  other: "อื่นๆ",
};

type ConnectHashtagPillsProps = {
  groups: HashtagGroup[];
  className?: string;
};

/** Follow · hashtag rows — tap a row to copy the tag (project R · FW1-b / FO1-b). */
export function ConnectHashtagPills({ groups, className }: ConnectHashtagPillsProps) {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const items = groups.flatMap((group) => group.tags.map((tag) => ({ tag, hint: CATEGORY_HINT[group.category] })));

  async function copyTag(tag: string) {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      window.setTimeout(() => setCopiedTag((current) => (current === tag ? null : current)), 2000);
    } catch {
      // clipboard may be unavailable
    }
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map(({ tag, hint }) => {
        const copied = copiedTag === tag;
        return (
          <li key={tag}>
            <button
              type="button"
              onClick={() => copyTag(tag)}
              aria-label={copied ? `คัดลอก ${tag} แล้ว` : `คัดลอก ${tag}`}
              className="flex h-11 w-full items-center gap-2.5 rounded-[14px] bg-r-pri/8 px-3.5 text-left ring-1 ring-r-pri/20 ring-inset transition-colors hover:bg-r-pri/14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
            >
              <span className="flex-1 font-[family-name:var(--font-display)] text-[0.9375rem] text-r-text-2">{tag}</span>
              <span className="text-xs text-r-text-3">{copied ? "คัดลอกแล้ว" : hint}</span>
              {copied ? (
                <Check aria-hidden className="size-4 text-r-acc" />
              ) : (
                <Copy aria-hidden className="size-4 text-r-text-3" />
              )}
            </button>
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
