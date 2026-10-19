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
import { SERIF } from "@/components/cafe/board/pieces";
import { useBoardMotion } from "@/components/cafe/board/useBoardMotion";
import {
  ImageLightbox,
  type ImageLightboxItem,
} from "@/components/media/ImageLightbox";
import { useNow } from "@/hooks/useNow";
import type { CafeCaseFileCover } from "@/lib/cafe-case-file";
import {
  defaultCafeVisibility,
  preorderIsListed,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

type CafePromoProps = {
  cafe: CafePage;
  visibility?: CafeSectionVisibilityMap;
  /** Only passed while the case file is visible. */
  caseCover?: CafeCaseFileCover | null;
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
  if (now !== null && !preorderIsListed(preorder, now)) return null;

  const text = `PRE-ORDER ◆ เปิดจองเสบียงล่วงหน้า ◆ ประมาณ ${preorder.label} ◆ เซต A · เซต B · เซต C ◆`;
  const line = `${text} ${text}`;

  return (
    <div className="relative mt-16 overflow-x-clip">
      <a
        href="#sets"
        aria-label={text}
        data-motion="hero-tape"
        data-hero-intro
        className="-mx-6 block origin-center -rotate-[1.2deg] border-y-2 border-cafe-gold-soft bg-cafe-gold py-3 text-cafe-ink shadow-[0_0_0_4px_var(--color-cafe-ground),0_0_0_5px_rgba(201,161,74,0.5)] hover:[&_.animate-cafe-tape]:[animation-play-state:paused]"
      >
        <span
          className={cn(
            SERIF,
            "animate-cafe-tape flex w-max gap-8 text-sm font-bold tracking-[0.18em] uppercase"
          )}
        >
          <span>{line}</span>
          <span aria-hidden>{line}</span>
        </span>
      </a>
    </div>
  );
}

export function CafePromo({ cafe, visibility, caseCover }: CafePromoProps) {
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
      className="relative overflow-x-clip pb-8 font-[family-name:var(--font-cafe-thai)] text-cafe-text"
      style={{
        // GB01 ground: bottle green, lifted to the glow behind the hero.
        backgroundColor: "var(--color-cafe-ground)",
        backgroundImage:
          "radial-gradient(ellipse 120% 900px at 50% 380px, var(--color-cafe-glow) 0%, var(--color-cafe-ground) 72%)",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Soft gold light over the banner: flickers on with the opening timeline, then drifts. */}
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
              "radial-gradient(circle, rgba(227,199,126,0.1) 0, rgba(227,199,126,0.035) 40%, transparent 66%)",
          }}
        />
      </div>
      <CafeOverview
        cafe={cafe}
        showDispatch={show.dispatch}
        onOpenVenue={() => open(venuePlate, 0, "Venue")}
      />
      <PreorderTape cafe={cafe} />
      <CafeMenuSection
        cafe={cafe}
        show={show.signatureMenu}
        showDispatch={show.dispatch}
      />
      <CafeVenueBlock
        cafe={cafe}
        show={show.venueMenu}
        onOpen={open}
      />
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
      <CafeStoryBlock cover={caseCover ?? null} showCaseFile={show.caseFile} />
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
