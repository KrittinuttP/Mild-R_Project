"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  artistCredit,
  GALLERY_EAGER_COUNT,
  GALLERY_PREVIEW_COUNT,
  isFanArtItem,
  masonrySlots,
  prefersReducedMotion,
  SIZE_CLASS,
  SIZE_CLASS_FROM_SM,
  sortGalleryItems,
  type GalleryBoardMode,
  type GalleryVariant,
} from "@/components/gallery/gallery-utils";
import {
  ImageLightbox,
  type ImageLightboxItem,
} from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { gsap, registerGsapPlugins, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { CTA_OUTLINE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/types/vtuber";

registerGsapPlugins();

type GalleryBoardProps = {
  items: GalleryItem[];
  variant: GalleryVariant;
  mode: GalleryBoardMode;
  viewAllHref?: string;
  previewCount?: number;
  className?: string;
};

export function GalleryBoard({
  items: rawItems,
  variant,
  mode,
  viewAllHref,
  previewCount = GALLERY_PREVIEW_COUNT,
  className,
}: GalleryBoardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => sortGalleryItems(rawItems), [rawItems]);
  const lightboxItems = useMemo<ImageLightboxItem[]>(
    () =>
      items.map((item) => {
        const credit = artistCredit(item);
        const extra =
          item.credit && isFanArtItem(item) ? ` · ${item.credit}` : "";
        return {
          id: item.id,
          src: item.src,
          alt: item.alt,
          caption: item.caption ?? item.alt,
          description: `${credit}${extra}` || undefined,
        };
      }),
    [items]
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const resetKey = `${variant}|${mode}`;
  const [appliedResetKey, setAppliedResetKey] = useState(resetKey);
  if (appliedResetKey !== resetKey) {
    setAppliedResetKey(resetKey);
    setActiveIndex(null);
  }

  const visibleItems = useMemo(
    () => (mode === "preview" ? items.slice(0, previewCount) : items),
    [items, mode, previewCount]
  );
  const masonry = variant === "archive";
  const slots = useMemo(
    () => (masonry ? masonrySlots(visibleItems) : []),
    [masonry, visibleItems]
  );
  const showViewAll = mode === "preview" && Boolean(viewAllHref) && items.length > 0;
  const showArtist = variant === "fan-art";

  useGSAP(
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>(
        "[data-gallery-item]:not([data-revealed])",
        rootRef.current
      );
      if (tiles.length === 0) return;
      tiles.forEach((tile) => tile.setAttribute("data-revealed", "true"));

      if (prefersReducedMotion()) {
        gsap.set(tiles, { autoAlpha: 1 });
        return;
      }

      const fanArt = variant === "fan-art";
      const stagger = fanArt ? 0.07 : 0.06;
      gsap.set(tiles, { autoAlpha: 0, y: fanArt ? 36 : 28, scale: 0.97 });

      const reveal = (entered: Element[]) => {
        const batch = entered as HTMLElement[];
        // Captions are optional; skip empty target lists so GSAP doesn't warn.
        const fromTo = (selector: string, from: gsap.TweenVars, to: gsap.TweenVars) => {
          const targets = batch
            .map((tile) => tile.querySelector<HTMLElement>(selector))
            .filter((el): el is HTMLElement => el !== null);
          if (targets.length > 0) gsap.fromTo(targets, from, to);
        };

        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger,
        });
        fromTo(
          "[data-gallery-media]",
          { scale: fanArt ? 1.08 : 1.06 },
          { scale: 1, duration: 0.95, ease: "power2.out", stagger }
        );
        fromTo(
          "[data-gallery-caption]",
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, delay: 0.18, ease: "power2.out", stagger }
        );
        fromTo(
          "[data-gallery-shine]",
          { xPercent: -130, opacity: 0 },
          {
            xPercent: 130,
            opacity: 0.3,
            duration: 1.05,
            delay: 0.12,
            ease: "power1.inOut",
            stagger,
          }
        );
      };

      // One trigger per batch of tiles entering together, instead of four per tile.
      // end "max" keeps tiles above the viewport active, so a jump (End key) still reveals them.
      ScrollTrigger.batch(tiles, {
        start: "top 92%",
        end: "max",
        once: true,
        onEnter: reveal,
      });

      // Context revert (unmount, Strict Mode re-run) clears the styles; let the next run re-animate.
      return () => tiles.forEach((tile) => tile.removeAttribute("data-revealed"));
    },
    { scope: rootRef, dependencies: [visibleItems, variant, mode] }
  );

  if (items.length === 0) {
    return (
      <p className="mt-10 text-sm text-[#f3b8c4]/70">
        ยังไม่มีผลงานในหมวดนี้
      </p>
    );
  }

  return (
    <div ref={rootRef} className={className}>
      <ul
        className={cn(
          "mt-8 grid grid-cols-2 gap-2 sm:mt-10 sm:grid-cols-4 sm:gap-3 lg:gap-4",
          masonry
            ? // Mobile row unit = 1/MASONRY_UNITS of a column: (100vw − px-5 padding − gap-x-2) / 2 / 20.
              "auto-rows-[var(--masonry-unit)] gap-y-0 [--masonry-unit:calc((100vw-3rem)/40)] sm:auto-rows-[9rem] md:auto-rows-[10rem]"
            : "auto-rows-[8.5rem] sm:auto-rows-[10rem] md:auto-rows-[11rem]"
        )}
      >
        {visibleItems.map((item, index) => {
          const size = item.size ?? "md";
          const slot = slots[index];
          const eager = mode === "full" && index < GALLERY_EAGER_COUNT;
          return (
            <li
              key={`${variant}-${item.id}`}
              data-gallery-item
              className={cn(
                "min-h-0 will-change-transform",
                slot
                  ? cn(
                      "max-sm:[grid-column:var(--masonry-col)] max-sm:[grid-row:var(--masonry-row)] max-sm:pb-[var(--masonry-unit)]",
                      SIZE_CLASS_FROM_SM[size]
                    )
                  : SIZE_CLASS[size]
              )}
              style={
                slot
                  ? ({
                      "--masonry-col": slot.column,
                      "--masonry-row": `${slot.row} / span ${slot.span}`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "group relative h-full w-full overflow-hidden bg-[#1a0c12] text-left outline-none transition duration-500 ease-out focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60",
                  variant === "archive" &&
                    "hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(232,90,122,0.35)]",
                  variant === "fan-art" &&
                    "hover:-translate-y-1 hover:shadow-[0_16px_44px_-12px_rgba(232,90,122,0.45)] hover:ring-1 hover:ring-[#e85a7a]/25"
                )}
              >
                <span
                  data-gallery-media
                  className="absolute inset-0 block overflow-hidden"
                >
                  <ProtectedImage
                    src={item.thumb ?? item.src}
                    alt={item.alt}
                    loading={eager ? "eager" : "lazy"}
                    fetchPriority={eager ? "high" : "auto"}
                    decoding="async"
                    className={cn(
                      "h-full w-full object-cover transition duration-700 ease-out",
                      variant === "archive"
                        ? "group-hover:scale-[1.05]"
                        : "group-hover:scale-[1.07]"
                    )}
                  />
                </span>

                <span
                  data-gallery-shine
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition duration-500 group-hover:translate-x-[280%] group-hover:opacity-40"
                />

                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10080c]/90 via-[#10080c]/15 to-transparent transition duration-500",
                    item.caption ? "opacity-90 group-hover:opacity-100" : "opacity-0 group-hover:opacity-50"
                  )}
                />

                {item.caption ? (
                  <span
                    data-gallery-caption
                    className="absolute inset-x-0 bottom-0 flex translate-y-1 flex-col gap-0.5 p-3 transition duration-500 ease-out group-hover:translate-y-0 sm:p-4"
                  >
                    <span className="flex items-end justify-between gap-2">
                      <span className="font-[family-name:var(--font-display)] text-sm leading-tight text-[#fff5f7] sm:text-base">
                        {item.caption}
                      </span>
                      <span className="shrink-0 text-[0.6rem] tracking-[0.18em] text-[#f3b8c4]/70 uppercase transition group-hover:text-[#e85a7a] sm:text-[0.65rem]">
                        View
                      </span>
                    </span>
                    {showArtist && isFanArtItem(item) ? (
                      <span className="text-[0.65rem] tracking-wide text-[#f3b8c4]/65 sm:text-xs">
                        by {item.artist.name}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {showViewAll && viewAllHref ? (
        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href={viewAllHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              CTA_OUTLINE_CLASS,
              "px-6"
            )}
          >
            View all
            <span className="ml-2 text-[#f3b8c4]/70">({items.length})</span>
            <ArrowUpRight className="size-4 opacity-80" />
          </Link>
        </div>
      ) : null}

      <ImageLightbox
        items={
          mode === "preview"
            ? lightboxItems.slice(0, visibleItems.length)
            : lightboxItems
        }
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        useProtectedImage
        counterLabel={variant === "fan-art" ? "Fan art" : "Moments"}
      />
    </div>
  );
}
