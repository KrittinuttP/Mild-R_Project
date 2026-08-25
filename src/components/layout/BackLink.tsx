import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type BackLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/** Shared glass-pill back nav — left-aligned site-wide. */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex self-start items-center gap-2 rounded-full border border-[#f3b8c4]/20 bg-white/[0.06] px-3.5 py-2 text-sm text-[#f3b8c4]/90 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm transition hover:border-[#e85a7a]/40 hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]",
        className
      )}
    >
      <ArrowLeft className="size-4 shrink-0" />
      {children}
    </Link>
  );
}
