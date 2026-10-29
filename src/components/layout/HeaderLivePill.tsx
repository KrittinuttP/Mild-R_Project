"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { HeaderLive } from "@/components/layout/useHeaderLive";
import { cn } from "@/lib/utils";

type HeaderLivePillProps = {
  live: HeaderLive;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
  className?: string;
};

/** Spoken summary for the pill (the visible text is cut short on small screens). */
export function liveSummary(live: HeaderLive) {
  const head =
    live.state === "live"
      ? "กำลังไลฟ์"
      : live.state === "soon" && live.clock
        ? `ไลฟ์เริ่มใน ${live.clock}`
        : live.state === "waiting"
          ? "ถึงเวลาแล้ว รอเริ่มไลฟ์"
          : `ไลฟ์วันนี้ ${live.time ?? ""}`.trim();
  return `${head} · ${live.title}`;
}

/**
 * H1 · today's live as a pill beside the logo (replaces the strip under the header).
 * Title shows from xl; md–lg and phones keep only the time / countdown.
 */
export function HeaderLivePill({ live, onNavigate, className }: HeaderLivePillProps) {
  const isLive = live.state === "live";
  const soon = live.state === "soon";

  const title = (
    <span className="hidden min-w-0 items-center gap-1.5 xl:inline-flex">
      <span className={isLive ? "opacity-60" : "text-r-text-2/40"} aria-hidden>
        ·
      </span>
      <span className={cn("max-w-52 truncate", isLive ? "" : "text-r-text/85")}>{live.title}</span>
    </span>
  );

  const body = isLive ? (
    <>
      <span className="r-ping-fast size-1.5 shrink-0 rounded-full bg-r-on-pri" aria-hidden />
      <b className="font-bold tracking-[0.12em]">LIVE</b>
      {title}
      <span className="inline-flex items-center gap-0.5 font-semibold">
        ดู<span className="hidden xl:inline">ไลฟ์</span>
        <ArrowUpRight className="size-3.5" aria-hidden />
      </span>
    </>
  ) : (
    <>
      <span
        className={cn("size-1.5 shrink-0 rounded-full bg-r-pri", soon || live.state === "waiting" ? "r-ping-fast" : "")}
        aria-hidden
      />
      {soon && live.clock ? (
        <>
          <span className="text-r-text-2/85">เริ่มใน</span>
          <b className="font-r-mono font-bold tabular-nums text-r-pri-hover [text-shadow:0_0_12px_color-mix(in_srgb,var(--r-pri)_60%,transparent)]">
            {live.clock}
          </b>
        </>
      ) : live.state === "waiting" ? (
        <span className="text-r-pri">รอเริ่มไลฟ์</span>
      ) : (
        <>
          <span className="text-r-text-2/85">วันนี้</span>
          {live.time ? <b className="font-semibold tabular-nums">{live.time}</b> : null}
        </>
      )}
      {title}
    </>
  );

  const pillClass = cn(
    "inline-flex h-[30px] min-w-0 shrink items-center gap-[7px] rounded-full px-[11px] text-xs whitespace-nowrap transition sm:h-8 sm:px-3.5 sm:text-[13px]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc",
    isLive
      ? "bg-r-pri text-r-on-pri shadow-[0_0_22px_color-mix(in_srgb,var(--r-pri)_45%,transparent)] hover:bg-r-pri-hover"
      : soon || live.state === "waiting"
        ? "border border-r-pri/70 bg-r-pri/16 text-r-text shadow-[0_0_18px_color-mix(in_srgb,var(--r-pri)_25%,transparent)] hover:bg-r-pri/22"
        : "border border-r-pri/35 bg-r-pri/8 text-r-text hover:border-r-pri/55 hover:bg-r-pri/12",
    className
  );

  if (live.external) {
    return (
      <a href={live.href} target="_blank" rel="noopener noreferrer" aria-label={liveSummary(live)} className={pillClass}>
        {body}
      </a>
    );
  }
  return (
    <Link
      href={live.href}
      aria-label={liveSummary(live)}
      onClick={(event) => onNavigate(event, live.href)}
      className={pillClass}
    >
      {body}
    </Link>
  );
}
