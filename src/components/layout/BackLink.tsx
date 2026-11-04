import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type BackLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/** Shared back nav (CI A+ outline pill) — left-aligned site-wide. */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 self-start items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/25 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-r-acc",
        className
      )}
    >
      <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
