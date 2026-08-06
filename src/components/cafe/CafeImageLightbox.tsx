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

export type CafeLightboxItem = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  group?: string;
};

type CafeImageLightboxProps = {
  items: CafeLightboxItem[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
};

export function CafeImageLightbox({
  items,
  activeIndex,
  onActiveIndexChange,
}: CafeImageLightboxProps) {
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
        className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-4xl overflow-hidden rounded-none border-[#9a7b5a]/30 bg-[#0a0c0e] p-3 text-[#f4ebe3] sm:max-w-4xl sm:p-4"
        showCloseButton
      >
        {activeItem ? (
          <>
            <DialogHeader className="px-1 pt-1 pr-10 sm:px-2">
              <DialogTitle
                className={cn(
                  "font-[family-name:var(--font-cafe-serif)] text-lg text-[#f4ebe3] sm:text-xl"
                )}
              >
                {activeItem.caption ?? activeItem.alt}
              </DialogTitle>
              {activeItem.group ? (
                <DialogDescription className="text-[0.65rem] tracking-[0.2em] text-[#9a7b5a] uppercase">
                  {activeItem.group}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  Cafe plate preview
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="relative mt-1 flex items-center justify-center overflow-hidden">
              <ProtectedImage
                src={activeItem.src}
                alt={activeItem.alt}
                className="max-h-[68dvh] w-full object-contain"
              />

              {items.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="รูปก่อนหน้า"
                    onClick={goPrev}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "absolute top-1/2 left-1 size-10 -translate-y-1/2 rounded-none border border-[#9a7b5a]/35 bg-[#0a0c0e]/80 text-[#f4ebe3] backdrop-blur-sm transition hover:bg-[#a84d5f]/90 hover:text-[#f4ebe3] sm:left-2"
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
                      "absolute top-1/2 right-1 size-10 -translate-y-1/2 rounded-none border border-[#9a7b5a]/35 bg-[#0a0c0e]/80 text-[#f4ebe3] backdrop-blur-sm transition hover:bg-[#a84d5f]/90 hover:text-[#f4ebe3] sm:right-2"
                    )}
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              ) : null}
            </div>

            <p className="px-1 pt-1 text-center text-xs tracking-wide text-[#9a7b5a]/80 sm:px-2">
              {(activeIndex ?? 0) + 1} / {items.length}
              {activeItem.group ? (
                <>
                  <span className="mx-2 text-[#9a7b5a]/40">·</span>
                  {activeItem.group}
                </>
              ) : null}
            </p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
