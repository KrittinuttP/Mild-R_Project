"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { EventCard } from "@/components/events/EventCard";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import { buttonVariants } from "@/components/ui/button";
import { featuredEvents } from "@/lib/events";
import {
  BODY_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H2_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { EventsBoard } from "@/types/vtuber";

type EventsTeaserProps = {
  /** Board with date-derived status, resolved on the server. */
  board: EventsBoard;
};

export function EventsTeaser({ board }: EventsTeaserProps) {
  const events = featuredEvents(board, 3);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = events.find((event) => event.id === activeId) ?? null;

  if (events.length === 0) return null;

  return (
    <>
      <section
        id="events"
        className="relative scroll-mt-20 bg-[#10070b] px-5 py-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:py-28 lg:px-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[#e85a7a]" aria-hidden />
              <p className={META_CLASS}>Events</p>
            </div>
            <h2 className={cn("mt-3", DISPLAY_H2_CLASS)}>
              อีเวนต์
            </h2>
            <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>
              อีเวนต์ที่กำลังจัด เร็วๆ นี้ และล่าสุด
            </p>
          </ScrollReveal>

          <ScrollReveal className="mt-8 sm:mt-10">
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
              {events.map((event) => (
                <li key={event.id} className="h-full">
                  <EventCard event={event} onOpen={() => setActiveId(event.id)} />
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal delay={0.08} className="mt-8 sm:mt-10">
            <Link
              href="/events"
              className={cn(
                buttonVariants({ size: "lg" }),
                CTA_PRIMARY_CLASS
              )}
            >
              ดูอีเวนต์ทั้งหมด
              <ArrowUpRight className="size-4" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

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
