"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

import {
  artistCredit,
  GALLERY_LOAD_MORE_STEP,
  GALLERY_PREVIEW_COUNT,
  initialVisibleCount,
  isFanArtItem,
  prefersReducedMotion,
  SIZE_CLASS,
  sortGalleryItems,
  type GalleryBoardMode,
  type GalleryVariant,
} from "@/components/gallery/gallery-utils";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
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
  const lightboxImageRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => sortGalleryItems(rawItems), [rawItems]);

  const startCount = useMemo(
    () => initialVisibleCount(items, mode, previewCount),
    [items, mode, previewCount]
  );

  const [visibleCount, setVisibleCount] = useState(startCount);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const navDirectionRef = useRef<1 | -1>(1);

  useEffect(() => {
    setVisibleCount(startCount);
    setActiveIndex(null);
  }, [startCount, variant, mode]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = mode === "full" && visibleCount < items.length;
  const showViewAll = mode === "preview" && Boolean(viewAllHref) && items.length > 0;
  const activeItem =
    activeIndex !== null ? visibleItems[activeIndex] ?? null : null;
  const showArtist = variant === "fan-art";

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tiles = gsap.utils.toArray<HTMLElement>(
        "[data-gallery-item]:not([data-revealed])",
        rootRef.current
      );

      tiles.forEach((tile, index) => {
        tile.setAttribute("data-revealed", "true");
        const media = tile.querySelector<HTMLElement>("[data-gallery-media]");
        const caption = tile.querySelector<HTMLElement>(
          "[data-gallery-caption]"
        );
        const shine = tile.querySelector<HTMLElement>("[data-gallery-shine]");

        if (reduced) {
          gsap.set([tile, media, caption].filter(Boolean), { autoAlpha: 1 });
          return;
        }

        const fromY = variant === "fan-art" ? 36 : 28;
        const stagger = variant === "fan-art" ? 0.07 : 0.06;

        gsap.fromTo(
          tile,
          { autoAlpha: 0, y: fromY, scale: 0.97 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.75,
            delay: (index % 4) * stagger,
            ease: "power3.out",
            scrollTrigger: {
              trigger: tile,
              start: "top 92%",
              toggleActions: "play none none none",
            },
          }
        );

        if (media) {
          gsap.fromTo(
            media,
            { scale: variant === "fan-art" ? 1.08 : 1.06 },
            {
              scale: 1,
              duration: 0.95,
              delay: (index % 4) * stagger,
              ease: "power2.out",
              scrollTrigger: {
                trigger: tile,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (caption) {
          gsap.fromTo(
            caption,
            { y: 14, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              delay: 0.18 + (index % 4) * stagger,
              ease: "power2.out",
              scrollTrigger: {
                trigger: tile,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (shine) {
          gsap.fromTo(
            shine,
            { xPercent: -130, opacity: 0 },
            {
              xPercent: 130,
              opacity: 0.3,
              duration: 1.05,
              delay: 0.12 + (index % 4) * stagger,
              ease: "power1.inOut",
              scrollTrigger: {
                trigger: tile,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });
    },
    { scope: rootRef, dependencies: [visibleCount, variant, mode] }
  );

  useGSAP(
    () => {
      const imageWrap = lightboxImageRef.current;
      if (!imageWrap || activeIndex === null) return;
      if (prefersReducedMotion()) return;

      gsap.fromTo(
        imageWrap,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    },
    { dependencies: [activeIndex, activeItem?.id] }
  );

  useEffect(() => {
    if (activeIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => {
          if (current === null) return current;
          return (current + 1) % visibleItems.length;
        });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => {
          if (current === null) return current;
          return (current - 1 + visibleItems.length) % visibleItems.length;
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, visibleItems.length]);

  const goPrev = () => {
    navDirectionRef.current = -1;
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current - 1 + visibleItems.length) % visibleItems.length;
    });
  };

  const goNext = () => {
    navDirectionRef.current = 1;
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + 1) % visibleItems.length;
    });
  };

  if (items.length === 0) {
    return (
      <p className="mt-10 text-sm text-[#f3b8c4]/70">
        ยังไม่มีผลงานในหมวดนี้ — เพิ่มได้ในไฟล์ JSON
      </p>
    );
  }

  return (
    <div ref={rootRef} className={className}>
      <ul
        className={cn(
          "mt-8 grid grid-cols-2 gap-2 sm:mt-10 sm:grid-cols-4 sm:gap-3 lg:gap-4",
          variant === "archive"
            ? "auto-rows-[7.5rem] sm:auto-rows-[9rem] md:auto-rows-[10rem]"
            : "auto-rows-[8.5rem] sm:auto-rows-[10rem] md:auto-rows-[11rem]"
        )}
      >
        {visibleItems.map((item, index) => {
          const size = item.size ?? "md";
          return (
            <li
              key={`${variant}-${item.id}`}
              data-gallery-item
              className={cn("min-h-0 will-change-transform", SIZE_CLASS[size])}
            >
              <button
                type="button"
                onClick={() => {
                  navDirectionRef.current = 1;
                  setActiveIndex(index);
                }}
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
                    src={item.src}
                    alt={item.alt}
                    loading={
                      mode === "preview" || item.loadOnDemand
                        ? "lazy"
                        : "eager"
                    }
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

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10080c]/90 via-[#10080c]/15 to-transparent opacity-90 transition duration-500 group-hover:opacity-100" />

                <span
                  data-gallery-caption
                  className="absolute inset-x-0 bottom-0 flex translate-y-1 flex-col gap-0.5 p-3 transition duration-500 ease-out group-hover:translate-y-0 sm:p-4"
                >
                  <span className="flex items-end justify-between gap-2">
                    <span className="font-[family-name:var(--font-display)] text-sm leading-tight text-[#fff5f7] sm:text-base">
                      {item.caption ?? item.alt}
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
              "border-[#f3b8c4]/30 bg-transparent px-6 text-[#fff5f7] transition hover:border-[#e85a7a]/50 hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]"
            )}
          >
            View all
            <span className="ml-2 text-[#f3b8c4]/70">({items.length})</span>
            <ArrowUpRight className="size-4 opacity-80" />
          </Link>
        </div>
      ) : null}

      {hasMore ? (
        <div className="mt-10 flex justify-center sm:mt-12">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + GALLERY_LOAD_MORE_STEP, items.length)
              )
            }
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-[#f3b8c4]/30 bg-transparent px-6 text-[#fff5f7] transition hover:border-[#e85a7a]/50 hover:bg-[#e85a7a]/15 hover:text-[#fff5f7] motion-safe:hover:scale-[1.03]"
            )}
          >
            โหลดเพิ่ม
            <span className="ml-2 text-[#f3b8c4]/70">
              ({items.length - visibleCount})
            </span>
          </button>
        </div>
      ) : null}

      <Dialog
        open={activeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null);
        }}
      >
        <DialogContent
          className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-4xl overflow-hidden border-[#f3b8c4]/20 bg-[#140a0d] p-3 text-[#fff5f7] sm:max-w-4xl sm:p-4"
          showCloseButton
        >
          {activeItem ? (
            <>
              <DialogHeader className="px-1 pt-1 pr-10 sm:px-2">
                <DialogTitle className="font-[family-name:var(--font-display)] text-lg text-[#fff5f7] sm:text-xl">
                  {activeItem.caption ?? activeItem.alt}
                </DialogTitle>
                <DialogDescription className="text-[#f3b8c4]/70">
                  {artistCredit(activeItem)}
                  {activeItem.credit && isFanArtItem(activeItem)
                    ? ` · ${activeItem.credit}`
                    : null}
                </DialogDescription>
              </DialogHeader>

              <div className="relative mt-1 flex items-center justify-center overflow-hidden">
                <div ref={lightboxImageRef} className="w-full">
                  <ProtectedImage
                    src={activeItem.src}
                    alt={activeItem.alt}
                    className="max-h-[68dvh] w-full object-contain"
                  />
                </div>

                {visibleItems.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="รูปก่อนหน้า"
                      onClick={goPrev}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "absolute top-1/2 left-1 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 text-[#fff5f7] backdrop-blur-sm transition hover:scale-105 hover:bg-[#e85a7a]/90 hover:text-white sm:left-2"
                      )}
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="รูปถัดไป"
                      onClick={goNext}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "absolute top-1/2 right-1 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 text-[#fff5f7] backdrop-blur-sm transition hover:scale-105 hover:bg-[#e85a7a]/90 hover:text-white sm:right-2"
                      )}
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                ) : null}
              </div>

              <p className="px-1 pt-1 text-center text-xs tracking-wide text-[#f3b8c4]/55 sm:px-2">
                {(activeIndex ?? 0) + 1} / {visibleItems.length}
                <span className="mx-2 text-[#f3b8c4]/30">·</span>
                {variant === "fan-art" ? "Fan art" : "Archive"}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
