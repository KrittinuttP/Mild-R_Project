import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Gallery } from "@/components/sections/Gallery";
import { Hero } from "@/components/sections/Hero";
import { Lore } from "@/components/sections/Lore";
import { Profile } from "@/components/sections/Profile";
import { Socials } from "@/components/sections/Socials";
import { mildRData } from "@/data/vtuber-data";

export default function Home() {
  return (
    <>
      <Header data={mildRData} />
      <main id="top" className="flex-1 bg-[#140a0d]">
        <Hero data={mildRData} />
        <Profile data={mildRData} />
        <Lore data={mildRData} />
        <Gallery data={mildRData} />
        <Socials data={mildRData} />
      </main>
      <Footer data={mildRData} />
    </>
  );
}
