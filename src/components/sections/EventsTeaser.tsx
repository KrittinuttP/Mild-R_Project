"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { EventCard } from "@/components/events/EventCard";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import { buttonVariants } from "@/components/ui/button";
import { featuredEvents } from "@/lib/events";
import {
  CTA_PRIMARY_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { EventsBoard } from "@/types/vtuber";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";

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
      <Section id="events">
        <ScrollReveal>
          <SectionHeader eyebrow="Events" title="อีเวนต์" description="อีเวนต์ที่กำลังจัด เร็วๆ นี้ และล่าสุด" />
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
