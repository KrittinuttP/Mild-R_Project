import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HomeEntry } from "@/components/layout/HomeEntry";
import { MediaProtection } from "@/components/media/MediaProtection";
import { EventsTeaser } from "@/components/sections/EventsTeaser";
import { Gallery } from "@/components/sections/Gallery";
import { HomeHero } from "@/components/sections/HomeHero";
import {
  LiveTeaser,
  type InitialLiveSchedule,
} from "@/components/sections/LiveTeaser";
import { Lore } from "@/components/sections/Lore";
import { Media } from "@/components/sections/Media";
import { Membership } from "@/components/sections/Membership";
import { Projects } from "@/components/sections/Projects";
import { Socials } from "@/components/sections/Socials";
import { getEventsBoard, mildRData } from "@/data/vtuber-data";
import { listGalleryFanArt } from "@/lib/fanart-submissions-store";
import { flattenLiveSlots, surroundingWeeksRangeYmdBangkok } from "@/lib/events";
import {
  loadLiveStreamsInRange,
  mergeLiveWeeksWithStreams,
} from "@/lib/live-streams";
import { resolveGate, readGateEnv } from "@/lib/cafe-gate";
import { loadGate } from "@/lib/cafe-gate-store";
import { loadVideos } from "@/lib/videos";
import { loadXFeedTabs } from "@/lib/x-posts";
import type { HeroPost, HeroPremiere } from "@/hooks/useHeroStatus";

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

/** Newest premieres on Mild-R's own channel (an upcoming one sorts first); the hero shows one only while it is still ahead. */
async function loadHeroPremieres(): Promise<HeroPremiere[]> {
  const items = await loadVideos({ kinds: ["premiere"], limit: 10 });
  return items
    .filter((v) => v.isOwnChannel && v.date && v.time)
    .map((v) => ({ title: v.title, url: v.youtubeUrl, startIso: `${v.date}T${v.time}:00+07:00` }));
}

/** The cafe KV stays hidden until the cafe opens (same lock as /cafe: clock or team override). */
async function loadCafeOpen(): Promise<boolean> {
  const { config } = await loadGate();
  return resolveGate(config, readGateEnv(process.env), Date.now()).phase === "open";
}

export default async function Home() {
  const [{ posts: xPosts, retweets: xRetweets }, initialLiveSchedule, fanArt, heroPremieres, cafeOpen] =
    await Promise.all([
      loadXFeedTabs(),
      loadInitialLiveSchedule(),
      listGalleryFanArt(24),
      loadHeroPremieres(),
      loadCafeOpen(),
    ]);

  const heroPosts: HeroPost[] = xPosts
    .filter((p) => p.text && p.posted_at)
    .slice(0, 3)
    .map((p) => ({
      text: p.text!,
      postedAt: p.posted_at!,
      url: p.original_url ?? `https://x.com/i/status/${p.tweet_id}`,
    }));

  return (
    <>
      <MediaProtection />
      <HomeEntry
        name={mildRData.basic.name}
        oshiMark={mildRData.fan.oshiMark}
      />
      <Header data={mildRData} />
      {/* Section order = project R (doc/project-r-implementation.md §2) */}
      <main className="flex-1 bg-r-bg">
        <HomeHero
          data={mildRData}
          initialSlots={initialLiveSchedule ? flattenLiveSlots(initialLiveSchedule.weeks) : []}
          premieres={heroPremieres}
          posts={heroPosts}
        />
        <LiveTeaser initialLiveSchedule={initialLiveSchedule} ownChannelLabel={mildRData.basic.name.toUpperCase()} />
        <Lore data={mildRData} />
        <Media data={mildRData} />
        <Gallery data={mildRData} fanArt={fanArt} />
        <EventsTeaser board={getEventsBoard()} />
        <Projects data={mildRData} cafeOpen={cafeOpen} />
        <Membership data={mildRData} />
        <Socials data={mildRData} xPosts={xPosts} xRetweets={xRetweets} />
      </main>
      <Footer data={mildRData} />
      <BackToTop />
    </>
  );
}
