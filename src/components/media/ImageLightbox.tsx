"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

registerGsapPlugins();

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
  /** Replaces the item description under the title. */
  subtitle?: ReactNode;
  /** Right side of the header, e.g. a download link. */
  headerAside?: ReactNode;
  /** Between the image and the footer, e.g. version thumbnails. */
  belowImage?: ReactNode;
  /** Left side of the footer, e.g. an external link. */
  footerStart?: ReactNode;
  /** Appended to the counter, e.g. "Moments". */
  counterLabel?: ReactNode;
  prevLabel?: string;
  nextLabel?: string;
};

const PRELOAD_TIMEOUT_MS = 1500;

const preloadCache = new Map<string, Promise<void>>();

function preloadImage(src: string, noReferrer: boolean): Promise<void> {
  const key = `${noReferrer ? "nr" : "r"}|${src}`;
  const cached = preloadCache.get(key);
  if (cached) return cached;
  const img = new Image();
  if (noReferrer) img.referrerPolicy = "no-referrer";
  img.src = src;
  const ready = img.decode().catch(() => undefined);
  preloadCache.set(key, ready);
  return ready;
}

function waitForImage(src: string, noReferrer: boolean): Promise<void> {
  return Promise.race([
    preloadImage(src, noReferrer),
    new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
  ]);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const SIZE =
  "flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-2 overflow-hidden p-2 sm:h-[calc(100dvh-2rem)] sm:w-[min(96vw,1400px)] sm:max-w-[min(96vw,1400px)] sm:gap-3 sm:p-4";

const TONE = {
  "mild-r": {
    content: "rounded-2xl border-[#f3b8c4]/20 bg-[#140a0d] text-[#fff5f7]",
    overlay: "bg-black/70 supports-backdrop-filter:backdrop-blur-sm",
    close: "text-[#f3b8c4] hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]",
    title:
      "font-[family-name:var(--font-display)] text-lg leading-snug text-[#fff5f7] sm:text-xl",
    description: "text-[#f3b8c4]/70",
    stage: "rounded-md bg-[#0c0508]",
    ambient: "opacity-95 saturate-200",
    vignette:
      "bg-[#140a0d]/10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(20,10,13,0.6)_100%)]",
    nav: "rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 text-[#fff5f7] hover:scale-105 hover:bg-[#e85a7a]/90 hover:text-white",
    counter: "text-[#f3b8c4]/55",
    separator: "text-[#f3b8c4]/30",
  },
  cafe: {
    content: "rounded-none border-[#9a7b5a]/30 bg-[#0a0c0e] text-[#f4ebe3]",
    overlay: "bg-black/70 supports-backdrop-filter:backdrop-blur-sm",
    close: "text-[#9a7b5a] hover:bg-[#a84d5f]/20 hover:text-[#f4ebe3]",
    title:
      "font-[family-name:var(--font-cafe-serif)] text-lg leading-snug text-[#f4ebe3] sm:text-xl",
    description: "text-[0.65rem] tracking-[0.2em] text-[#9a7b5a] uppercase",
    stage: "rounded-none bg-[#060708]",
    ambient: "opacity-60 saturate-125",
    vignette:
      "bg-[#0a0c0e]/30 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(10,12,14,0.85)_100%)]",
    nav: "rounded-none border border-[#9a7b5a]/35 bg-[#0a0c0e]/80 text-[#f4ebe3] hover:bg-[#a84d5f]/90 hover:text-[#f4ebe3]",
    counter: "text-[#9a7b5a]/80",
    separator: "text-[#9a7b5a]/40",
  },
} as const;

/** Shared image lightbox — same open/close/keyboard UX across the site. */
export function ImageLightbox({
  items,
  activeIndex,
  onActiveIndexChange,
  tone = "mild-r",
  useProtectedImage = false,
  subtitle,
  headerAside,
  belowImage,
  footerStart,
  counterLabel,
  prevLabel = "รูปก่อนหน้า",
  nextLabel = "รูปถัดไป",
}: ImageLightboxProps) {
  const styles = TONE[tone];
  const noReferrer = !useProtectedImage;
  const stageRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const pendingIndexRef = useRef<number | null>(null);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);

  const open = activeIndex !== null;
  const activeItem = activeIndex !== null ? (items[activeIndex] ?? null) : null;
  const outgoingItem =
    outgoingIndex !== null && outgoingIndex !== activeIndex
      ? (items[outgoingIndex] ?? null)
      : null;
  const layers = [
    ...(outgoingItem ? [{ item: outgoingItem, role: "outgoing" as const }] : []),
    ...(activeItem ? [{ item: activeItem, role: "active" as const }] : []),
  ];
  const description = subtitle ?? activeItem?.description;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage || activeIndex === null) return;

      const incoming = stage.querySelector<HTMLElement>(
        '[data-lightbox-layer="active"]'
      );
      const outgoing = stage.querySelector<HTMLElement>(
        '[data-lightbox-layer="outgoing"]'
      );
      timelineRef.current?.kill();
      if (!incoming) return;

      const incomingPhoto = incoming.querySelector("[data-lightbox-photo]");
      if (prefersReducedMotion()) {
        gsap.set(incoming, { autoAlpha: 1 });
        gsap.set(incomingPhoto, { scale: 1, filter: "blur(0px)" });
        return;
      }

      const timeline = gsap.timeline({
        onComplete: () => setOutgoingIndex(null),
      });

      if (outgoing) {
        timeline
          .to(
            outgoing,
            { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" },
            0
          )
          .to(
            outgoing.querySelector("[data-lightbox-photo]"),
            {
              scale: 1.03,
              filter: "blur(12px)",
              duration: 0.5,
              ease: "power2.in",
            },
            0
          )
          .fromTo(
            incoming,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.5, ease: "power2.out" },
            0
          )
          .fromTo(
            incomingPhoto,
            { scale: 1.04, filter: "blur(14px)" },
            {
              scale: 1,
              filter: "blur(0px)",
              duration: 0.6,
              ease: "power3.out",
            },
            0.05
          );
      } else {
        timeline
          .fromTo(
            incoming,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.4, ease: "power2.out" },
            0
          )
          .fromTo(
            incomingPhoto,
            { scale: 1.03, filter: "blur(10px)" },
            {
              scale: 1,
              filter: "blur(0px)",
              duration: 0.55,
              ease: "power3.out",
            },
            0
          );
      }

      timelineRef.current = timeline;
    },
    { dependencies: [activeIndex] }
  );

  useEffect(() => {
    if (activeIndex === null || items.length < 2) return;
    void preloadImage(items[(activeIndex + 1) % items.length].src, noReferrer);
    void preloadImage(
      items[(activeIndex - 1 + items.length) % items.length].src,
      noReferrer
    );
  }, [activeIndex, items, noReferrer]);

  const close = () => {
    timelineRef.current?.kill();
    pendingIndexRef.current = null;
    setOutgoingIndex(null);
    onActiveIndexChange(null);
  };

  const step = (direction: 1 | -1) => {
    const from = pendingIndexRef.current ?? activeIndexRef.current;
    if (from === null || items.length < 2) return;

    const target = (from + direction + items.length) % items.length;
    pendingIndexRef.current = target;

    void waitForImage(items[target].src, noReferrer).then(() => {
      const shown = activeIndexRef.current;
      if (pendingIndexRef.current !== target || shown === null) return;
      pendingIndexRef.current = null;
      setOutgoingIndex(prefersReducedMotion() ? null : shown);
      onActiveIndexChange(target);
    });
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  });

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open]);

  const renderImage = (
    item: ImageLightboxItem,
    className: string,
    extra: { alt: string; photo?: boolean }
  ) =>
    useProtectedImage ? (
      <ProtectedImage
        data-lightbox-photo={extra.photo ? "" : undefined}
        aria-hidden={extra.alt ? undefined : true}
        src={item.src}
        alt={extra.alt}
        decoding="async"
        className={className}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-lightbox-photo={extra.photo ? "" : undefined}
        aria-hidden={extra.alt ? undefined : true}
        src={item.src}
        alt={extra.alt}
        decoding="async"
        referrerPolicy="no-referrer"
        className={className}
      />
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        className={cn(SIZE, styles.content)}
        overlayClassName={styles.overlay}
        closeButtonClassName={styles.close}
        showCloseButton
      >
        {activeItem ? (
          <>
            <DialogHeader className="shrink-0 flex-row items-start justify-between gap-3 px-1 pt-1 pr-10 sm:px-2 sm:pr-12">
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle className={cn(styles.title, "line-clamp-2")}>
                  {activeItem.caption ?? activeItem.alt}
                </DialogTitle>
                {description ? (
                  <DialogDescription
                    render={<div />}
                    className={cn(
                      "flex flex-wrap items-center gap-2",
                      styles.description
                    )}
                  >
                    {description}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">
                    ดูรูปขนาดใหญ่
                  </DialogDescription>
                )}
              </div>
              {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
            </DialogHeader>

            <div
              ref={stageRef}
              className={cn(
                "relative min-h-0 flex-1 overflow-hidden",
                styles.stage
              )}
            >
              {layers.map(({ item, role }) => (
                <div
                  key={`${item.id}|${item.src}`}
                  data-lightbox-layer={role}
                  aria-hidden={role === "outgoing" ? true : undefined}
                  className={cn(
                    "absolute inset-0 overflow-hidden",
                    role === "active" ? "z-[1]" : "pointer-events-none z-0"
                  )}
                >
                  {renderImage(
                    item,
                    cn(
                      "pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover blur-3xl",
                      styles.ambient
                    ),
                    { alt: "" }
                  )}
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-0",
                      styles.vignette
                    )}
                  />
                  {renderImage(
                    item,
                    "relative h-full w-full object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)] will-change-transform",
                    { alt: role === "active" ? item.alt : "", photo: true }
                  )}
                </div>
              ))}

              {items.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label={prevLabel}
                    onClick={() => step(-1)}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "absolute top-1/2 left-1 z-10 size-10 -translate-y-1/2 backdrop-blur-sm transition sm:left-2",
                      styles.nav
                    )}
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={nextLabel}
                    onClick={() => step(1)}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "absolute top-1/2 right-1 z-10 size-10 -translate-y-1/2 backdrop-blur-sm transition sm:right-2",
                      styles.nav
                    )}
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              ) : null}
            </div>

            {belowImage ? (
              <div className="shrink-0 px-1 sm:px-2">{belowImage}</div>
            ) : null}

            {footerStart || items.length > 1 || counterLabel ? (
              <div
                className={cn(
                  "flex shrink-0 flex-wrap items-center gap-2 px-1 pt-1 sm:px-2",
                  footerStart ? "justify-between" : "justify-center"
                )}
              >
                {footerStart}
                <p
                  className={cn(
                    "text-center text-xs tracking-wide",
                    styles.counter
                  )}
                >
                  {items.length > 1 ? (
                    <>
                      {(activeIndex ?? 0) + 1} / {items.length}
                    </>
                  ) : null}
                  {items.length > 1 && counterLabel ? (
                    <span className={cn("mx-2", styles.separator)}>·</span>
                  ) : null}
                  {counterLabel}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
