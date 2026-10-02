"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  PlayCircle,
} from "lucide-react";

import { CoverImage } from "@/components/cards/CoverCard";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EventTags } from "@/components/events/EventTags";
import { BackLink } from "@/components/layout/BackLink";
import {
  ImageLightbox,
  type ImageLightboxItem,
} from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import {
  eventVideosLabel,
  formatEventDateRange,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/events";
import {
  BODY_CLASS,
  DISPLAY_H1_CLASS,
  DISPLAY_H2_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type {
  CalendarEvent,
  EventGalleryImage,
  EventLive,
} from "@/types/vtuber";

type EventDetailProps = {
  event: CalendarEvent;
  gallery: EventGalleryImage[];
  lives?: EventLive[];
  older?: CalendarEvent;
  newer?: CalendarEvent;
};

type GalleryTile = ImageLightboxItem & { thumb: string };

function toTiles(event: CalendarEvent, gallery: EventGalleryImage[]): GalleryTile[] {
  if (gallery.length > 0) {
    return gallery.map((image, index) => ({
      id: `${event.id}-${index}`,
      src: image.src,
      thumb: image.thumb,
      alt: image.alt,
      caption: image.alt,
      description: image.publishedAt
        ? `โพสต์ ${formatThaiDate(image.publishedAt.slice(0, 10))}`
        : undefined,
    }));
  }
  return (event.images ?? []).map((image, index) => ({
    id: `${event.id}-${index}`,
    src: image.src,
    thumb: image.src,
    alt: image.alt,
    caption: image.alt,
  }));
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className={cn("text-2xl sm:text-3xl", DISPLAY_H2_CLASS)}>{children}</h2>;
}

function EventLiveRow({ live }: { live: EventLive }) {
  const when = [live.date ? formatThaiDate(live.date) : null, live.time]
    .filter(Boolean)
    .join(" · ");
  const stats = [
    live.durationLabel,
    live.views !== undefined ? `${live.views.toLocaleString("en-US")} วิว` : null,
  ].filter(Boolean);

  return (
    <a
      href={live.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-2xl border border-[#f3b8c4]/12 bg-[#1a0c12]/60 p-2.5 transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60 sm:gap-4 sm:p-3"
    >
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-[#12080c] sm:w-44">
        <ProtectedImage
          src={live.cover}
          alt=""
          wrapClassName="absolute inset-0 block"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
          <PlayCircle className="size-8 text-white" aria-hidden />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="line-clamp-2 text-sm leading-snug text-[#fff5f7] sm:text-base">
          {live.title}
        </p>
        {live.channelName ? (
          <p className="truncate text-xs text-[#f3b8c4]/65">{live.channelName}</p>
        ) : null}
        {when || stats.length ? (
          <p className="text-xs tabular-nums text-[#f3b8c4]/55">
            {[when, ...stats].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <ExternalLink
        className="mt-1 size-4 shrink-0 self-start text-[#f3b8c4]/50 transition group-hover:text-[#e85a7a]"
        aria-hidden
      />
    </a>
  );
}

export function EventDetail({
  event,
  gallery,
  lives = [],
  older,
  newer,
}: EventDetailProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tiles = toTiles(event, gallery);
  const place = [event.venue, event.platform].filter(Boolean).join(" · ");
  const videosLabel = eventVideosLabel(lives);

  return (
    <article className="relative mx-auto max-w-6xl">
      <BackLink href="/events" className="mb-8">
        อีเวนต์ทั้งหมด
      </BackLink>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="mx-auto w-full max-w-md lg:sticky lg:top-28 lg:max-w-none lg:self-start">
          <CoverImage
            src={event.cover}
            alt={event.coverAlt ?? event.title}
            media="square-contain"
            className="rounded-3xl border border-[#f3b8c4]/12"
          />
        </div>

        <div className="min-w-0 space-y-12">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge event={event} />
              <EventTags event={event} />
            </div>
            <h1 className={cn("mt-4", DISPLAY_H1_CLASS)}>
              {event.titleLocal ?? event.title}
            </h1>
            {event.titleLocal ? (
              <p className="mt-2 text-base text-[#f3b8c4]/70">{event.title}</p>
            ) : null}

            <dl className="mt-6 space-y-2 text-sm text-[#f7d7de]/85 sm:text-base">
              <div className="flex items-start gap-2.5">
                <dt className="sr-only">วันที่</dt>
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#e85a7a]" aria-hidden />
                <dd className="tabular-nums">
                  {formatEventDateRange(event)}
                  {event.timeLabel ? ` · ${event.timeLabel}` : null}
                </dd>
              </div>
              {place ? (
                <div className="flex items-start gap-2.5">
                  <dt className="sr-only">สถานที่</dt>
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#e85a7a]" aria-hidden />
                  <dd>{place}</dd>
                </div>
              ) : null}
            </dl>

            {event.summary ? (
              <p className={cn("mt-6", BODY_CLASS)}>{event.summary}</p>
            ) : null}
            {event.details?.map((paragraph) => (
              <p key={paragraph} className={cn("mt-4", BODY_CLASS)}>
                {paragraph}
              </p>
            ))}
          </header>

          {event.schedule?.length ? (
            <section aria-labelledby="event-schedule">
              <div id="event-schedule">
                <SectionTitle>ตารางเวลา</SectionTitle>
              </div>
              <ol className="mt-5 divide-y divide-[#f3b8c4]/10 overflow-hidden rounded-2xl border border-[#f3b8c4]/12 bg-[#1a0c12]/60">
                {event.schedule.map((item, index) => (
                  <li
                    key={`${item.date}-${index}`}
                    className="grid gap-1 px-4 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
                  >
                    <div className="text-sm tabular-nums text-[#f3b8c4]/80">
                      {formatThaiDateRange(item.date, item.endDate)}
                      {item.time ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-[#f3b8c4]/60">
                          <Clock className="size-3" aria-hidden />
                          {item.time}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm text-[#fff5f7] sm:text-base">{item.label}</p>
                      {item.note ? (
                        <p className="mt-0.5 text-xs text-[#f3b8c4]/60 sm:text-sm">
                          {item.note}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {lives.length > 0 ? (
            <section aria-labelledby="event-lives">
              <div id="event-lives" className="flex items-baseline justify-between gap-4">
                <SectionTitle>{`${videosLabel}ที่เกี่ยวข้อง`}</SectionTitle>
                <span className="text-sm tabular-nums text-[#f3b8c4]/60">
                  {lives.length} {videosLabel === "ไลฟ์และวิดีโอ" ? "รายการ" : videosLabel}
                </span>
              </div>
              <ul className="mt-5 space-y-3">
                {lives.map((live) => (
                  <li key={live.videoId}>
                    <EventLiveRow live={live} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {event.notes?.length ? (
            <section className="rounded-2xl border border-[#f3b8c4]/12 bg-white/[0.03] px-4 py-4 sm:px-5">
              <h2 className="flex items-center gap-2 text-sm font-medium text-[#fff5f7]">
                <Info className="size-4 text-[#e85a7a]" aria-hidden />
                หมายเหตุ
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-[#f7d7de]/75">
                {event.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {tiles.length > 0 ? (
            <section aria-labelledby="event-gallery">
              <div id="event-gallery" className="flex items-baseline justify-between gap-4">
                <SectionTitle>ภาพจากอีเวนต์</SectionTitle>
                <span className="text-sm tabular-nums text-[#f3b8c4]/60">
                  {tiles.length} ภาพ
                </span>
              </div>
              <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                {tiles.map((tile, index) => (
                  <li key={tile.id}>
                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-label={`ดูภาพ: ${tile.alt}`}
                      className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-[#f3b8c4]/12 bg-[#12080c] transition hover:border-[#e85a7a]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60"
                    >
                      <ProtectedImage
                        src={tile.thumb}
                        alt=""
                        loading="lazy"
                        wrapClassName="absolute inset-0 block"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {event.sources?.length ? (
            <section aria-labelledby="event-sources">
              <div id="event-sources">
                <SectionTitle>แหล่งข้อมูล</SectionTitle>
              </div>
              <ul className="mt-4 space-y-2">
                {event.sources.map((source) => (
                  <li key={source.url}>
                    <Link
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#e85a7a] underline-offset-4 hover:underline sm:text-base"
                    >
                      {source.label}
                      <ExternalLink className="size-3.5 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {older || newer ? (
        <nav
          aria-label="อีเวนต์อื่น"
          className="mt-16 grid gap-3 border-t border-[#f3b8c4]/10 pt-8 sm:grid-cols-2"
        >
          {older ? (
            <Link
              href={`/events/${older.id}`}
              className="group rounded-2xl border border-[#f3b8c4]/12 px-4 py-4 transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-[#f3b8c4]/60">
                <ArrowLeft className="size-3.5" aria-hidden />
                ก่อนหน้า
              </span>
              <span className="mt-1 block text-[#fff5f7] group-hover:text-white">
                {older.titleLocal ?? older.title}
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {newer ? (
            <Link
              href={`/events/${newer.id}`}
              className="group rounded-2xl border border-[#f3b8c4]/12 px-4 py-4 text-right transition hover:border-[#e85a7a]/40 hover:bg-[#1a0c12]"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-[#f3b8c4]/60">
                ถัดไป
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-1 block text-[#fff5f7] group-hover:text-white">
                {newer.titleLocal ?? newer.title}
              </span>
            </Link>
          ) : null}
        </nav>
      ) : null}

      <ImageLightbox
        items={tiles}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        useProtectedImage
      />
    </article>
  );
}
