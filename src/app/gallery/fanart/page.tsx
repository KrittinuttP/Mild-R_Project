import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";

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
      title="แฟนอาร์ต"
      description="แฟนอาร์ต Mild-R จากฮันนี่"
      headingSize="h2"
      showTopFade={false}
      items={items}
      headerAction={
        // Small, quiet button: this page is for looking at fan art (4 Nov). Only place to upload from.
        <Link
          href="/fanart/upload"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-r-text-2/35 px-4 text-sm text-r-text transition-colors hover:border-r-pri/60 hover:bg-r-pri/10 active:bg-r-pri/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc"
        >
          <Upload aria-hidden className="size-4 text-r-pri" />
          ส่งแฟนอาร์ต
        </Link>
      }
      empty={<FanArtEmpty />}
      variant="fan-art"
      mode="full"
      className="bg-r-bg pt-8 sm:pt-10"
    />
  );
}
