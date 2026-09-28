"use client";

import { useState } from "react";
import { Images, LayoutGrid, Palette } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import {
  DEFAULT_GALLERY_CATEGORY,
  GALLERY_CATEGORIES,
  GALLERY_PILL_ACTIVE_CLASS,
  GALLERY_PILL_CLASS,
  GALLERY_PILL_IDLE_CLASS,
  type GalleryCategoryKey,
} from "@/components/gallery/gallery-categories";
import { GallerySection } from "@/components/gallery/GallerySection";
import { LiveCoverArchive } from "@/components/gallery/LiveCoverArchive";
import { BackLink } from "@/components/layout/BackLink";
import { DISPLAY_H1_CLASS, META_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { FanArtItem, GalleryItem } from "@/types/vtuber";

type GalleryTabsProps = {
  initialTab: GalleryCategoryKey;
  gallery: GalleryItem[];
  fanArt: FanArtItem[];
};

const PANEL_CLASS = "pt-8 sm:pt-10";

/** /gallery hub: switch categories in-page; URL mirrors ?tab= without navigation. */
export function GalleryTabs({ initialTab, gallery, fanArt }: GalleryTabsProps) {
  const [tab, setTab] = useState<GalleryCategoryKey>(initialTab);

  const selectTab = (next: GalleryCategoryKey) => {
    if (next === tab) return;
    setTab(next);
    const url =
      next === DEFAULT_GALLERY_CATEGORY ? "/gallery" : `/gallery?tab=${next}`;
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <>
      <div className="bg-[#12080c] px-5 pt-28 text-[#fff5f7] sm:px-10 sm:pt-32 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <BackLink href="/#gallery" className="mb-8">
            กลับหน้าแรก
          </BackLink>
          <ScrollReveal>
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-[#e85a7a]" aria-hidden />
              <p className={META_CLASS}>Mild-R Fanclub</p>
            </div>
            <h1 className={cn("mt-3", DISPLAY_H1_CLASS)}>Gallery</h1>
          </ScrollReveal>

          <div
            role="tablist"
            aria-label="หมวด Gallery"
            className="mt-8 flex flex-wrap gap-2"
          >
            {GALLERY_CATEGORIES.map((category) => {
              const selected = category.key === tab;
              return (
                <button
                  key={category.key}
                  id={`gallery-tab-${category.key}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`gallery-panel-${category.key}`}
                  onClick={() => selectTab(category.key)}
                  className={cn(
                    GALLERY_PILL_CLASS,
                    selected ? GALLERY_PILL_ACTIVE_CLASS : GALLERY_PILL_IDLE_CLASS
                  )}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        id={`gallery-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`gallery-tab-${tab}`}
      >
        {tab === "archive" ? (
          <GallerySection
            key="archive"
            id="visual-archive"
            eyebrow="Archive"
            icon={Images}
            title="Visual archive"
            description="คลังภาพของ Mild-R"
            headingSize="h2"
            showTopFade={false}
            items={gallery}
            variant="archive"
            mode="full"
            className={PANEL_CLASS}
          />
        ) : null}
        {tab === "live" ? (
          <LiveCoverArchive
            key="live"
            showDivider={false}
            className={PANEL_CLASS}
          />
        ) : null}
        {tab === "fanart" ? (
          <GallerySection
            key="fanart"
            id="fan-art"
            eyebrow="Gallery"
            icon={Palette}
            title="Fan art"
            description="แฟนอาร์ต Mild-R จากฮันนี่"
            headingSize="h2"
            showTopFade={false}
            items={fanArt}
            variant="fan-art"
            mode="full"
            className={cn(PANEL_CLASS, "bg-[#12080c]")}
          />
        ) : null}
      </div>
    </>
  );
}
