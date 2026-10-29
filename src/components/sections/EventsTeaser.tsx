"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { RChip } from "@/components/common/RChip";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { featuredEvents, formatEventDateRangeEn, ongoingEvents, upcomingEvents } from "@/lib/events";
import { R_CTA_OUTLINE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventFormat, EventsBoard } from "@/types/vtuber";

type EventsTeaserProps = {
  /** Board with date-derived status, resolved on the server. */
  board: EventsBoard;
};

/** Bento: 1 big tile + 4 small (project R · Events). */
const BENTO_COUNT = 5;

/** Corner dot / label per format: online = mint · offline = pink · campaign = nurse white. */
const FORMAT: Record<CalendarEventFormat, { label: string; dot: string; text: string }> = {
  online: { label: "ออนไลน์", dot: "bg-r-acc", text: "text-r-acc" },
  offline: { label: "ออฟไลน์", dot: "bg-r-pri", text: "text-r-pri" },
  campaign: { label: "แคมเปญ", dot: "bg-r-nurse", text: "text-r-nurse" },
};

function FormatLabel({ format }: { format: CalendarEventFormat }) {
  const f = FORMAT[format];
  return (
    <span className={cn("inline-flex items-center gap-[5px] text-xs", f.text)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", f.dot)} />
      {f.label}
    </span>
  );
}

function StatusChip({ event }: { event: CalendarEvent }) {
  if (event.status === "ongoing")
    return <RChip className="bg-r-acc/8 text-r-acc ring-r-acc/32">กำลังจัด</RChip>;
  if (event.status === "upcoming") return <RChip tone="pri">เร็วๆ นี้</RChip>;
  return <RChip>จบแล้ว</RChip>;
}

const TILE =
  "group relative block w-full overflow-hidden rounded-3xl text-left ring-1 ring-r-text-2/15 ring-inset focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-r-acc";
/** Fade the cover into the floor so the text stays readable on any poster. */
const TILE_FADE =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,color-mix(in_srgb,var(--r-bg)_72%,transparent)_52%,color-mix(in_srgb,var(--r-bg)_97%,transparent)_82%)]";

function Cover({ event }: { event: CalendarEvent }) {
  return (
    <>
      <ProtectedImage
        src={event.cover}
        alt={event.coverAlt ?? event.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <span aria-hidden className={TILE_FADE} />
    </>
  );
}

function BigTile({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const meta = [event.venue, event.platform].filter(Boolean).join(" · ");
  return (
    <button type="button" onClick={onOpen} className={cn(TILE, "h-[400px] md:h-full")}>
      <Cover event={event} />
      <span className="absolute top-4 left-4 flex gap-1.5">
        <StatusChip event={event} />
        <RChip tone="pri">ล่าสุด</RChip>
      </span>
      <span className="absolute inset-x-5 bottom-5 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] md:inset-x-[26px] md:bottom-6">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <FormatLabel format={event.format} />
          {meta ? <span className="text-xs text-r-text-2">· {meta}</span> : null}
        </span>
        <span className="mt-2 block text-[0.8125rem] text-r-text-2">{formatEventDateRangeEn(event)}</span>
        <span className="mt-1 block font-[family-name:var(--font-display)] text-2xl leading-[1.3] text-r-text md:text-[1.75rem]">
          {event.title}
        </span>
        {event.titleLocal ? <span className="mt-0.5 block text-[0.84375rem] text-r-text-2">{event.titleLocal}</span> : null}
        {event.summary ? (
          <span className="mt-2.5 line-clamp-2 max-w-[560px] text-sm leading-[1.65] text-r-text/85">{event.summary}</span>
        ) : null}
      </span>
    </button>
  );
}

function SmallTile({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${event.titleLocal ?? event.title} · ${FORMAT[event.format].label}`}
      className={cn(TILE, "h-[176px] md:h-full")}
    >
      <Cover event={event} />
      <span
        aria-hidden
        className={cn("absolute top-3 right-3 size-2.5 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,var(--r-bg)_75%,transparent)]", FORMAT[event.format].dot)}
      />
      <span className="absolute inset-x-4 bottom-3.5 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
        <span className="block text-xs text-r-text-2">{formatEventDateRangeEn(event)}</span>
        <span className="mt-[3px] line-clamp-2 font-[family-name:var(--font-display)] text-base leading-[1.35] text-r-text">
          {event.titleLocal ?? event.title}
        </span>
      </span>
    </button>
  );
}

function AllEventsLink({ total, className }: { total: number; className?: string }) {
  return (
    <Link href="/events" className={cn(R_CTA_OUTLINE_CLASS, className)}>
      อีเวนต์ทั้งหมด ({total})
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Home · อีเวนต์ (project R): status line, Bento 1 + 4, counts since debut from events.json. */
export function EventsTeaser({ board }: EventsTeaserProps) {
  const events = featuredEvents(board, BENTO_COUNT);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = events.find((event) => event.id === activeId) ?? null;

  if (events.length === 0) return null;

  const [lead, ...rest] = events;
  const total = board.events.length;
  const ongoing = ongoingEvents(board).length;
  const upcoming = upcomingEvents(board).length;
  const byFormat = (format: CalendarEventFormat) => board.events.filter((e) => e.format === format).length;
  const statusLine =
    ongoing > 0
      ? `กำลังจัด ${ongoing} งาน`
      : upcoming > 0
        ? `เร็วๆ นี้ ${upcoming} งาน`
        : "ตอนนี้ยังไม่มีงานที่กำลังจัด";

  return (
    <>
      <Section id="events">
        <ScrollReveal>
          <SectionHeader
            eyebrow="Events"
            title="อีเวนต์"
            description={
              <span className="inline-flex items-center gap-2.5 rounded-2xl bg-white/[0.03] px-3.5 py-2 text-[0.8125rem] text-r-text-3 ring-1 ring-r-text-2/15 ring-inset">
                <CalendarDays aria-hidden className="size-4 shrink-0 text-r-text-2" />
                {statusLine}
              </span>
            }
            action={<AllEventsLink total={total} className="hidden md:inline-flex" />}
          />
        </ScrollReveal>

        <ScrollReveal className="mt-6 md:mt-8">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] md:grid-rows-[200px_200px] md:gap-5 lg:grid-rows-[240px_240px]">
            <li className="col-span-2 md:col-span-1 md:row-span-2">
              <BigTile event={lead} onOpen={() => setActiveId(lead.id)} />
            </li>
            {rest.map((event) => (
              <li key={event.id} className="min-w-0">
                <SmallTile event={event} onOpen={() => setActiveId(event.id)} />
              </li>
            ))}
          </ul>

          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-r-text-3">
            <span className="text-r-text">ตั้งแต่เดบิวต์ {total} งาน</span>
            {(Object.keys(FORMAT) as CalendarEventFormat[]).map((format) => {
              const count = byFormat(format);
              return count > 0 ? (
                <span key={format} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <FormatLabel format={format} />
                  <span className="text-r-text">{count}</span>
                </span>
              ) : null;
            })}
          </p>
        </ScrollReveal>

        <AllEventsLink total={total} className="mt-6 md:hidden" />
      </Section>

      <EventDetailModal
        event={active}
        open={activeId !== null}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      />
    </>
  );
}
