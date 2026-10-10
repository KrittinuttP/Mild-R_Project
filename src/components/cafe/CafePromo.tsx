"use client";

import { useRef, useState } from "react";

import { CafeActivities } from "@/components/cafe/board/CafeActivities";
import {
  CafeClosingBlock,
  CafeGoodsBlock,
  CafeStoryBlock,
  CafeVenueBlock,
} from "@/components/cafe/board/CafeLower";
import { CafeMenuSection } from "@/components/cafe/board/CafeMenuSection";
import { CafeOverview } from "@/components/cafe/board/CafeOverview";
import { TYPE } from "@/components/cafe/board/pieces";
import { useBoardMotion } from "@/components/cafe/board/useBoardMotion";
import {
  ImageLightbox,
  type ImageLightboxItem,
} from "@/components/media/ImageLightbox";
import { useNow } from "@/hooks/useNow";
import {
  defaultCafeVisibility,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

type CafePromoProps = {
  cafe: CafePage;
  visibility?: CafeSectionVisibilityMap;
};

type LightboxState = {
  items: ImageLightboxItem[];
  index: number;
  group?: string;
};

function PreorderTape({ cafe }: { cafe: CafePage }) {
  const preorder = cafe.preorder;
  const now = useNow(1000, Boolean(preorder?.endsAt));
  if (!preorder?.label) return null;

  const ends = Date.parse(preorder.endsAt ?? "");
  const open =
    !Number.isFinite(ends) || now === null || now < ends;
  if (!open) return null;

  const text = `PRE-ORDER /// เปิดจองเสบียงล่วงหน้า /// ประมาณ ${preorder.label} /// เซต A · เซต B · เซต C ///`;
  const line = `${text} ${text}`;

  return (
    <div className="relative mt-16 overflow-x-clip">
      <a
        href="#sets"
        aria-label={text}
        data-motion="hero-tape"
        data-hero-intro
        className="-mx-6 block origin-center -rotate-[1.2deg] border-y-[6px] border-[#1a1410] bg-[#f2c230] py-3 text-[#1a1410] hover:[&_.animate-cafe-tape]:[animation-play-state:paused]"
      >
        <span
          className={cn(
            TYPE,
            "animate-cafe-tape flex w-max gap-8 text-sm font-bold tracking-[0.14em] uppercase"
          )}
        >
          <span>{line}</span>
          <span aria-hidden>{line}</span>
        </span>
      </a>
    </div>
  );
}

export function CafePromo({ cafe, visibility }: CafePromoProps) {
  const show = visibility ?? defaultCafeVisibility();
  const rootRef = useRef<HTMLDivElement>(null);
  useBoardMotion(rootRef);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const location = cafe.dispatch.location;
  const venuePlate: ImageLightboxItem[] = location.image
    ? [
        {
          id: "location",
          src: location.image,
          alt: location.imageAlt ?? location.label,
          caption: `Venue · ${location.label}`,
        },
      ]
    : [];

  const open = (items: ImageLightboxItem[], index: number, group?: string) => {
    setLightbox({ items, index, group });
  };

  return (
    <div
      ref={rootRef}
      data-hero-root
      className="relative overflow-x-clip pb-8 font-[family-name:var(--font-cafe-thai)] text-[#d8d0c4]"
      style={{
        backgroundColor: "#0a0c0e",
        backgroundImage:
          "linear-gradient(rgba(244,235,227,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(244,235,227,0.022) 1px, transparent 1px)",
        backgroundSize: "44px 44px, 44px 44px",
      }}
    >
      {/* Desk lamp: flickers on with the opening timeline, then drifts. */}
      <div
        className="pointer-events-none absolute top-[-300px] left-1/2 size-[1300px] -translate-x-1/2"
        aria-hidden
      >
        <div
          data-motion="lamp"
          data-hero-intro
          className="animate-cafe-lamp size-full rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,206,140,0.2) 0, rgba(255,206,140,0.07) 40%, transparent 66%)",
          }}
        />
      </div>
      <CafeOverview
        cafe={cafe}
        showDispatch={show.dispatch}
        onOpenVenue={() => open(venuePlate, 0, "Venue")}
      />
      <PreorderTape cafe={cafe} />
      {cafe.mockNotice ? (
        <p
          role="note"
          className={cn(
            TYPE,
            "relative mx-auto mt-12 w-fit max-w-[calc(100%-2.5rem)] border-2 border-dashed border-[#f2c230] px-4 py-2 text-center text-xs leading-relaxed font-bold text-[#f2c230]"
          )}
        >
          {cafe.mockNotice}
        </p>
      ) : null}
      <CafeMenuSection cafe={cafe} show={show.signatureMenu} />
      <CafeActivities
        cafe={cafe}
        showSchedule={show.daySchedule}
        showMissions={show.operations}
        onOpen={open}
      />
      <CafeGoodsBlock
        cafe={cafe}
        show={show.goods}
        onOpen={open}
      />
      <CafeVenueBlock
        cafe={cafe}
        show={show.venueMenu}
        onOpen={open}
      />
      <CafeStoryBlock
        cafe={cafe}
        showGallery={show.operations}
        onOpen={open}
      />
      <CafeClosingBlock cafe={cafe} show={show.closing} />
      <ImageLightbox
        tone="cafe"
        useProtectedImage
        items={lightbox?.items ?? []}
        activeIndex={lightbox?.index ?? null}
        subtitle={lightbox?.group}
        counterLabel={lightbox?.group}
        onActiveIndexChange={(index) => {
          if (index === null || !lightbox) {
            setLightbox(null);
            return;
          }
          setLightbox({ ...lightbox, index });
        }}
      />
    </div>
  );
}
