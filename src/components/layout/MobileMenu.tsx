"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, Heart, Play, Sparkles } from "lucide-react";

import { SocialIconButton } from "@/components/icons/SocialIconButton";
import { FOLLOW_PLATFORMS, MENU_GALLERY_PHOTO_ID, NAV_ITEMS, SOCIALS_HASH } from "@/components/layout/header-nav";
import { NavProjectList, shortDate } from "@/components/layout/NavProjectList";
import type { HeaderLive, HeaderWeek } from "@/components/layout/useHeaderLive";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { bangkokDateFromIso } from "@/lib/live-preview-match";
import { cn } from "@/lib/utils";
import { getYoutubePosterUrl, getYoutubeVideoId } from "@/lib/youtube";
import type { CalendarEvent, VtuberProfile } from "@/types/vtuber";

type NavigateFn = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;

type MobileMenuProps = {
  data: VtuberProfile;
  onHome: boolean;
  live: HeaderLive | null;
  week: HeaderWeek | null;
  onNavigate: NavigateFn;
};

const WEEK_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const SCRIM = "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(20,10,13,0.9))]";

/** Ongoing event first (latest start), else the next one; `null` when nothing is on. */
function currentEvent(events: CalendarEvent[], today: string) {
  const ongoing = events
    .filter((event) => event.date <= today && (event.endDate ?? event.date) >= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (ongoing) return { event: ongoing, when: ongoing.endDate ? `ถึง ${shortDate(ongoing.endDate)}` : "วันนี้" };
  const next = events.filter((event) => event.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
  return next ? { event: next, when: shortDate(next.date) } : null;
}

function Tile({
  href,
  onNavigate,
  icon,
  title,
  sub,
  children,
  className,
}: {
  href: string;
  onNavigate: NavigateFn;
  icon: ReactNode;
  title: string;
  sub?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => onNavigate(event, href)}
      className={cn(
        "relative block h-32 overflow-hidden rounded-2xl border border-r-text-2/14 bg-[#22121a] transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc",
        className
      )}
    >
      {children}
      <span className="absolute inset-x-3 bottom-2.5 flex flex-col gap-px [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
        <span className="flex items-center gap-1.5 text-base font-semibold text-r-text">
          {icon}
          {title}
        </span>
        {sub ? <span className="truncate text-[12.5px] text-[#f7d7de]">{sub}</span> : null}
      </span>
    </Link>
  );
}

function Accordion({
  label,
  expanded,
  onToggle,
  id,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={onToggle}
        className="flex min-h-12 items-center justify-between border-b border-r-text-2/8 text-left text-base text-r-text"
      >
        {label}
        <ChevronDown aria-hidden className={cn("size-4 opacity-70 transition-transform duration-200", expanded && "rotate-180")} />
      </button>
      <div
        id={id}
        inert={!expanded ? true : undefined}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/** Mobile ☰ menu (project R · header Final M6a): live card · 4 picture tiles · About / Projects · follow row. */
export function MobileMenu({ data, onHome, live, week, onNavigate }: MobileMenuProps) {
  const [expanded, setExpanded] = useState<"about" | "projects" | null>("projects");
  const toggle = (key: "about" | "projects") => setExpanded((current) => (current === key ? null : key));
  const home = (hash: string, page: string) => (onHome ? hash : page);

  const today = bangkokDateFromIso(new Date().toISOString()) ?? "";
  const clip = data.media.find((item) => item.featured) ?? data.media[0];
  const clipId = clip ? getYoutubeVideoId(clip.youtubeUrl) : null;
  const clipName = clip ? (clip.titleLocal ?? clip.title) : null;
  const photo = data.gallery.find((item) => item.id === MENU_GALLERY_PHOTO_ID) ?? data.gallery[0];
  const eventNow = currentEvent(data.events.events, today);
  const eventCover = eventNow?.event.cover ?? data.events.events[0]?.cover;
  const about = NAV_ITEMS.find((item) => item.key === "about");
  const socials = FOLLOW_PLATFORMS.map((platform) => data.socials.find((s) => s.id === platform || s.platform === platform)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s)
  );

  return (
    <nav
      aria-label="Mobile"
      className="mx-auto flex max-w-xl flex-col px-4 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      {live ? (
        <LiveCard live={live} onNavigate={onNavigate} />
      ) : null}

      <div className={cn("grid grid-cols-2 gap-2", live && "mt-3")}>
        <Tile
          href={home("#live", "/live")}
          onNavigate={onNavigate}
          icon={<CalendarDays className="size-3.5" aria-hidden />}
          title="Live"
          sub={week ? (week.count > 0 ? `สัปดาห์นี้ ${week.count} ไลฟ์` : "สัปดาห์นี้ยังไม่มีไลฟ์") : null}
          className="border-r-pri/30 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--r-pri)_16%,transparent),rgba(20,10,13,0.55))]"
        >
          {week ? (
            <span className="absolute inset-x-2.5 top-3 flex justify-between" aria-hidden>
              {week.days.map((day, i) => (
                <span key={day.iso} className="flex w-[18px] flex-col items-center gap-1">
                  <span className={cn("text-[10px] leading-none", day.isToday ? "font-semibold text-r-text" : "text-r-text-2/70")}>
                    {WEEK_LETTERS[i]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full",
                      day.isToday ? "size-3.5 ring-2 ring-r-pri/40" : "size-2.5",
                      day.hasLive ? "bg-r-pri" : "border border-r-text-2/45"
                    )}
                  />
                  {day.isToday ? <span className="text-[9px] leading-none text-r-pri">วันนี้</span> : null}
                </span>
              ))}
            </span>
          ) : null}
        </Tile>

        <Tile
          href={home("#media", "/media")}
          onNavigate={onNavigate}
          icon={<Play className="size-3.5 fill-current" aria-hidden />}
          title="Media"
          sub={clip && clipName ? (clip.category === "original" ? `เพลง ${clipName}` : clipName) : null}
        >
          {clipId ? (
            <ProtectedImage
              src={getYoutubePosterUrl(clipId, "hq")}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <span className={SCRIM} />
          <span className="absolute top-[35%] left-1/2 inline-flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-r-text/85 bg-r-bg/60 text-r-text">
            <Play className="size-5 fill-current" aria-hidden />
          </span>
        </Tile>

        <Tile href="/gallery" onNavigate={onNavigate} icon={<Heart className="size-3.5 fill-current" aria-hidden />} title="Gallery">
          {photo ? (
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="50vw"
              draggable={false}
              className="object-cover object-[center_30%]"
            />
          ) : null}
          <span className={SCRIM} />
        </Tile>

        <Tile
          href={home("#events", "/events")}
          onNavigate={onNavigate}
          icon={<Sparkles className="size-3.5" aria-hidden />}
          title="Events"
          sub={eventNow ? [eventNow.event.title, eventNow.when].filter(Boolean).join(" · ") : null}
        >
          {eventCover ? (
            <Image src={eventCover} alt="" fill sizes="50vw" draggable={false} className="object-cover object-[center_35%]" />
          ) : null}
          <span className={SCRIM} />
        </Tile>
      </div>

      <div className="mt-2">
        {about?.children ? (
          <Accordion label={about.label} expanded={expanded === "about"} onToggle={() => toggle("about")} id="mobile-nav-about">
            <div className="flex flex-col py-1">
              {about.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={(event) => onNavigate(event, child.href)}
                  className="flex min-h-11 items-center gap-3 pl-1 text-[15px] text-r-text/80 transition hover:text-r-text"
                >
                  <child.icon className="size-4 text-r-pri" aria-hidden />
                  {child.label}
                </Link>
              ))}
            </div>
          </Accordion>
        ) : null}

        <Accordion label="Projects" expanded={expanded === "projects"} onToggle={() => toggle("projects")} id="mobile-nav-projects">
          <NavProjectList data={data} size="md" onNavigate={onNavigate} className="my-1.5" />
          <Link
            href="/projects"
            onClick={(event) => onNavigate(event, "/projects")}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-r-pri"
          >
            ดูโปรเจกต์ทั้งหมด
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Accordion>
      </div>

      {socials.length ? (
        <div className="mt-3 border-t border-r-text-2/10 pt-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12.5px] text-r-text-2/80">ติดตาม {data.basic.name}</span>
            <Link
              href={home(SOCIALS_HASH, `/${SOCIALS_HASH}`)}
              onClick={(event) => onNavigate(event, home(SOCIALS_HASH, `/${SOCIALS_HASH}`))}
              className="inline-flex min-h-8 items-center gap-1 text-[13px] text-r-pri"
            >
              ทั้งหมด
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="flex gap-2">
            {socials.map((social) => (
              <li key={social.id}>
                <SocialIconButton platform={social.platform} href={social.url} label={social.label} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}

/** Today's live at the top of the menu; the arrow stays faint (the whole card is the link). */
function LiveCard({ live, onNavigate }: { live: HeaderLive; onNavigate: NavigateFn }) {
  const isLive = live.state === "live";
  const status = isLive ? (
    <>
      <span className="inline-flex items-center gap-1 rounded-full bg-r-pri px-2 py-px text-[10px] font-bold tracking-[0.14em] text-r-on-pri">
        <span className="r-ping-fast size-1.5 rounded-full bg-r-on-pri" aria-hidden />
        LIVE
      </span>
      {live.clock ? <span className="tabular-nums">{live.clock}</span> : null}
    </>
  ) : (
    <>
      <span className={cn("size-[7px] rounded-full bg-r-pri", live.state !== "later" && "r-ping-fast")} aria-hidden />
      {live.state === "soon" && live.clock ? (
        <span>
          เริ่มใน <b className="font-r-mono font-bold tabular-nums text-r-pri-hover">{live.clock}</b>
        </span>
      ) : live.state === "waiting" ? (
        <span className="text-r-pri">ถึงเวลาแล้ว · รอเริ่มไลฟ์</span>
      ) : (
        <span>ไลฟ์วันนี้{live.time ? ` · ${live.time}` : ""}</span>
      )}
      {live.extra > 0 ? <span className="text-r-text-2/60">+{live.extra} ไลฟ์</span> : null}
    </>
  );
  const body = (
    <>
      <span className="relative aspect-video w-[104px] shrink-0 overflow-hidden rounded-[10px] bg-r-bg">
        {live.coverUrl ? (
          <ProtectedImage
            src={live.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center gap-1.5 text-xs text-r-text-2">{status}</span>
        <span className="truncate text-sm text-r-text">{live.title}</span>
      </span>
      {live.external ? (
        <ArrowUpRight className="size-4 shrink-0 text-r-text-2/55" aria-hidden />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-r-text-2/55" aria-hidden />
      )}
    </>
  );
  const className = cn(
    "flex items-center gap-3 rounded-[18px] border p-2.5 transition active:scale-[0.99]",
    isLive
      ? "border-r-pri/60 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--r-pri)_24%,transparent),rgba(20,10,13,0.4))]"
      : "border-r-pri/35 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--r-pri)_14%,transparent),rgba(20,10,13,0.4))]"
  );
  return live.external ? (
    <a href={live.href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={live.href} onClick={(event) => onNavigate(event, live.href)} className={className}>
      {body}
    </Link>
  );
}
