import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HomeEntry } from "@/components/layout/HomeEntry";
import { MediaProtection } from "@/components/media/MediaProtection";
import { EventsTeaser } from "@/components/sections/EventsTeaser";
import { Gallery } from "@/components/sections/Gallery";
import { HeroProfileScroll } from "@/components/sections/HeroProfileScroll";
import { Lore } from "@/components/sections/Lore";
import { Media } from "@/components/sections/Media";
import { Socials } from "@/components/sections/Socials";
import { mildRData } from "@/data/vtuber-data";
import {
  loadLiveStreams,
  mergeLiveWeeksWithStreams,
} from "@/lib/live-streams";

export const revalidate = 300;

export default async function Home() {
  const streams = await loadLiveStreams();
  const liveWeeks = mergeLiveWeeksWithStreams([], streams);

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
        <Gallery data={mildRData} />
        <Media data={mildRData} />
        <EventsTeaser data={mildRData} liveWeeks={liveWeeks} />
        <Socials data={mildRData} />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
