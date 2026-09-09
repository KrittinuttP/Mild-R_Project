"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ImageLightboxItem = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  description?: string;
};

export type ImageLightboxTone = "mild-r" | "cafe";

type ImageLightboxProps = {
  items: ImageLightboxItem[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
  /** Visual preset. Default Mild-R site pink. */
  tone?: ImageLightboxTone;
  /** Use ProtectedImage (gallery/cafe). Off by default for external URLs (e.g. X CDN). */
  useProtectedImage?: boolean;
};

const TONE = {
  "mild-r": {
    content:
      "max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-4xl overflow-hidden rounded-3xl border border-[#f3b8c4]/20 bg-[#140a0d] p-3 text-[#fff5f7] shadow-[0_24px_60px_rgba(0,0,0,0.7)] sm:max-w-4xl sm:p-4",
    overlay: "bg-black/70 supports-backdrop-filter:backdrop-blur-sm",
    close:
      "text-[#f3b8c4] hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]",
    title: "font-[family-name:var(--font-display)] text-lg text-[#fff5f7] sm:text-xl",
    description: "text-[#f3b8c4]/70",
    nav: "absolute top-1/2 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 text-[#fff5f7] backdrop-blur-sm transition hover:scale-105 hover:bg-[#e85a7a]/90 hover:text-white",
    counter: "text-[#f3b8c4]/70",
  },
  cafe: {
    content:
      "max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-4xl overflow-hidden rounded-none border-[#9a7b5a]/30 bg-[#0a0c0e] p-3 text-[#f4ebe3] sm:max-w-4xl sm:p-4",
    overlay: undefined,
    close: undefined,
    title:
      "font-[family-name:var(--font-cafe-serif)] text-lg text-[#f4ebe3] sm:text-xl",
    description: "text-[0.65rem] tracking-[0.2em] text-[#9a7b5a] uppercase",
    nav: "absolute top-1/2 size-10 -translate-y-1/2 rounded-none border border-[#9a7b5a]/35 bg-[#0a0c0e]/80 text-[#f4ebe3] backdrop-blur-sm transition hover:bg-[#a84d5f]/90 hover:text-[#f4ebe3]",
    counter: "text-[#9a7b5a]/80",
  },
} as const;

/** Shared image lightbox — same open/close/keyboard UX across the site. */
export function ImageLightbox({
  items,
  activeIndex,
  onActiveIndexChange,
  tone = "mild-r",
  useProtectedImage = false,
}: ImageLightboxProps) {
  const styles = TONE[tone];
  const activeItem =
    activeIndex !== null ? (items[activeIndex] ?? null) : null;

  const goPrev = () => {
    if (items.length < 2 || activeIndex === null) return;
    onActiveIndexChange((activeIndex - 1 + items.length) % items.length);
  };

  const goNext = () => {
    if (items.length < 2 || activeIndex === null) return;
    onActiveIndexChange((activeIndex + 1) % items.length);
  };

  useEffect(() => {
    if (activeIndex === null || items.length < 2) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onActiveIndexChange((activeIndex - 1 + items.length) % items.length);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onActiveIndexChange((activeIndex + 1) % items.length);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, items.length, onActiveIndexChange]);

  return (
    <Dialog
      open={activeIndex !== null}
      onOpenChange={(open) => {
        if (!open) onActiveIndexChange(null);
      }}
    >
      <DialogContent
        className={styles.content}
        overlayClassName={styles.overlay}
        closeButtonClassName={styles.close}
        showCloseButton
      >
        {activeItem ? (
          <>
            <DialogHeader className="px-1 pt-1 pr-10 sm:px-2">
              <DialogTitle className={styles.title}>
                {activeItem.caption ?? activeItem.alt}
              </DialogTitle>
              {activeItem.description ? (
                <DialogDescription className={styles.description}>
                  {activeItem.description}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  ดูรูปขนาดใหญ่
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="relative mt-1 flex items-center justify-center overflow-hidden">
              {useProtectedImage ? (
                <ProtectedImage
                  src={activeItem.src}
                  alt={activeItem.alt}
                  className="max-h-[68dvh] w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeItem.src}
                  alt={activeItem.alt}
                  className="max-h-[68dvh] w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}

              {items.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="รูปก่อนหน้า"
                    onClick={goPrev}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      styles.nav,
                      "left-1 sm:left-2"
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
                      styles.nav,
                      "right-1 sm:right-2"
                    )}
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              ) : null}
            </div>

            {items.length > 1 ? (
              <p
                className={cn(
                  "px-1 pt-1 text-center text-xs tracking-wide sm:px-2",
                  styles.counter
                )}
              >
                {(activeIndex ?? 0) + 1} / {items.length}
              </p>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
