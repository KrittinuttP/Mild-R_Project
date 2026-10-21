import type { Metadata } from "next";
import { Palette } from "lucide-react";

import { FanArtEmpty } from "@/components/gallery/FanArtEmpty";
import { GallerySection } from "@/components/gallery/GallerySection";
import { listGalleryFanArt } from "@/lib/fanart-submissions-store";

export const metadata: Metadata = {
  title: "Fan Art | Mild-R Fanclub",
  description: "คลังแฟนอาร์ตของ Mild-R จากฮันนี่",
};

/** Admin approve / hide / delete refreshes this page right away (revalidatePath). */
export const revalidate = 300;

export default async function GalleryFanArtPage() {
  const items = await listGalleryFanArt();
  return (
    <GallerySection
      id="fan-art"
      eyebrow="Fan art"
      icon={Palette}
      title="แฟนอาร์ต"
      description="แฟนอาร์ต Mild-R จากฮันนี่"
      headingSize="h2"
      showTopFade={false}
      items={items}
      empty={<FanArtEmpty />}
      variant="fan-art"
      mode="full"
      className="bg-[#12080c] pt-8 sm:pt-10"
    />
  );
}
