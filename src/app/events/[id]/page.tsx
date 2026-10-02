import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventDetail } from "@/components/events/EventDetail";
import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MediaProtection } from "@/components/media/MediaProtection";
import {
  getEventById,
  getEventGallery,
  getEventIds,
  mildRData,
} from "@/data/vtuber-data";
import { loadEventLives } from "@/lib/event-lives";

type EventPageProps = {
  params: Promise<{ id: string }>;
};

/** Re-derive the status badge from the Bangkok date and refresh live view counts. */
export const revalidate = 3600;

export function generateStaticParams() {
  return getEventIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const found = getEventById(id);

  if (!found) {
    return { title: "Events | Mild-R Fanclub" };
  }

  const { event } = found;
  return {
    title: `${event.titleLocal ?? event.title} | Mild-R Events`,
    description: event.summary,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const found = getEventById(id);

  if (!found) {
    notFound();
  }

  const lives = await loadEventLives(found.event);

  return (
    <>
      <MediaProtection />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <section className="relative px-5 pb-24 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,90,122,0.18),transparent_55%)]" />
          <EventDetail
            event={found.event}
            gallery={getEventGallery(id)}
            lives={lives}
            older={found.older}
            newer={found.newer}
          />
        </section>
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
