import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HomeEntry } from "@/components/layout/HomeEntry";
import { MediaProtection } from "@/components/media/MediaProtection";
import {
  EventsTeaser,
  type InitialLiveSchedule,
} from "@/components/sections/EventsTeaser";
import { Gallery } from "@/components/sections/Gallery";
import { HeroProfileScroll } from "@/components/sections/HeroProfileScroll";
import { Lore } from "@/components/sections/Lore";
import { Media } from "@/components/sections/Media";
import { Projects } from "@/components/sections/Projects";
import { Socials } from "@/components/sections/Socials";
import { mildRData } from "@/data/vtuber-data";
import { surroundingWeeksRangeYmdBangkok } from "@/lib/events";
import {
  loadLiveStreamsInRange,
  mergeLiveWeeksWithStreams,
} from "@/lib/live-streams";
import { loadXFeedTabs } from "@/lib/x-posts";

export const revalidate = 300;

async function loadInitialLiveSchedule(): Promise<InitialLiveSchedule | null> {
  const { from, to } = surroundingWeeksRangeYmdBangkok();
  try {
    const streams = await loadLiveStreamsInRange(from, to, 500);
    const weeks = mergeLiveWeeksWithStreams([], streams, { from, to });
    return { from, to, weeks };
  } catch (err) {
    console.error("[home] live schedule", err);
    return null;
  }
}

export default async function Home() {
  const [{ posts: xPosts, retweets: xRetweets }, initialLiveSchedule] =
    await Promise.all([loadXFeedTabs(), loadInitialLiveSchedule()]);

  return (
    <>
      <MediaProtection />
      <HomeEntry
        name={mildRData.basic.name}
        oshiMark={mildRData.fan.oshiMark}
      />
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <HeroProfileScroll data={mildRData} />
        <Lore data={mildRData} />
        <Media data={mildRData} />
        <EventsTeaser data={mildRData} initialLiveSchedule={initialLiveSchedule} />
        <Gallery data={mildRData} />
        <Projects data={mildRData} />
        <Socials data={mildRData} xPosts={xPosts} xRetweets={xRetweets} />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
