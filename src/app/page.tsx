import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Gallery } from "@/components/sections/Gallery";
import { HeroProfileScroll } from "@/components/sections/HeroProfileScroll";
import { Lore } from "@/components/sections/Lore";
import { Socials } from "@/components/sections/Socials";
import { mildRData } from "@/data/vtuber-data";

export default function Home() {
  return (
    <>
      <Header data={mildRData} />
      <main className="flex-1 bg-[#140a0d]">
        <HeroProfileScroll data={mildRData} />
        <Lore data={mildRData} />
        <Gallery data={mildRData} />
        <Socials data={mildRData} />
      </main>
      <Footer data={mildRData} />
    </>
  );
}
