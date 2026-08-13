"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
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
import type { CafeOtherMenu, CafeOtherMenuItem } from "@/types/vtuber";

registerGsapPlugins();

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";
const MD_QUERY = "(min-width: 768px)";
const COVER_INDEX = -1;

type CafeVenueMenuBookProps = {
  menu: CafeOtherMenu;
  venueLabel?: string;
  venueImage?: string;
  venueImageAlt?: string;
  onZoom?: (index: number) => void;
};

function plateLabel(index: number) {
  return String(index + 1).padStart(2, "0");
}

function prettyVenueName(label: string) {
  return label.replace(/\s+[xX]\s+/g, " × ");
}

function snapToStep(index: number, step: number) {
  if (index <= COVER_INDEX) return COVER_INDEX;
  if (step < 2) return index;
  return index - (index % step);
}

function useMdUp() {
  const [md, setMd] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const sync = () => setMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return md;
}

function MenuPlate({
  item,
  index,
  onZoom,
  className,
}: {
  item: CafeOtherMenuItem;
  index: number;
  onZoom?: (index: number) => void;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "relative flex min-h-0 flex-1 flex-col border border-[#9a7b5a]/30 bg-[#1a1410] p-2 sm:p-2.5",
        className
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[0.58rem] tracking-[0.2em] text-[#c46a7a] uppercase">
          Plate {plateLabel(index)}
        </span>
        {onZoom ? (
          <button
            type="button"
            onClick={() => onZoom(index)}
            aria-label={`ขยาย ${item.caption ?? item.imageAlt ?? `แผ่น ${index + 1}`}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-xs" }),
              "rounded-none text-[#c4b8a8] hover:bg-[#a84d5f]/20 hover:text-[#f4ebe3]"
            )}
          >
            <ZoomIn className="size-3.5" />
          </button>
        ) : null}
      </div>
      <ProtectedImage
        src={item.image}
        alt={item.imageAlt ?? item.caption ?? `เมนูร้าน แผ่น ${index + 1}`}
        wrapClassName="block min-h-0 flex-1"
        className="h-full max-h-[52dvh] w-full object-contain md:max-h-[56dvh]"
      />
      <figcaption className="mt-2 min-h-[2.4rem] text-center">
        <p className={cn(SERIF, "text-sm text-[#f4ebe3] sm:text-base")}>
          {item.caption ?? `Plate ${plateLabel(index)}`}
        </p>
        {item.captionLocal ? (
          <p className={cn(DISPLAY, "text-[0.7rem] text-[#c4b8a8] sm:text-xs")}>
            {item.captionLocal}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}

function BookSpine() {
  return (
    <div className="relative z-10 w-3 shrink-0 self-stretch md:w-4" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-gradient-to-b from-[#5c4636] via-[#c4a882] to-[#5c4636] opacity-90" />
      <div className="pointer-events-none absolute inset-y-0 -left-10 w-10 bg-gradient-to-r from-transparent to-black/40" />
      <div className="pointer-events-none absolute inset-y-0 -right-10 w-10 bg-gradient-to-l from-transparent to-black/40" />
    </div>
  );
}

function BlankPlate() {
  return (
    <div className="flex h-full min-h-[52dvh] flex-1 flex-col items-center justify-center border border-dashed border-[#9a7b5a]/30 bg-[#14100c] md:min-h-[56dvh]">
      <p className="text-[0.65rem] tracking-[0.22em] text-[#9a7b5a] uppercase">
        Classified
      </p>
    </div>
  );
}

function MenuCover({
  label,
  image,
  imageAlt,
  stamp,
  onOpen,
}: {
  label: string;
  image?: string;
  imageAlt?: string;
  stamp?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex h-full min-h-[58dvh] w-full flex-col items-center justify-center overflow-hidden border border-[#9a7b5a]/35 bg-[#14100c] text-left md:min-h-[64dvh]"
    >
      {image ? (
        <ProtectedImage
          src={image}
          alt={imageAlt ?? label}
          wrapClassName="pointer-events-none absolute inset-0 block"
          className="size-full object-cover opacity-40"
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0c0e]/40 via-[#0a0c0e]/55 to-[#0a0c0e]/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-[repeating-linear-gradient(180deg,#9a7b5a_0_10px,transparent_10px_18px)] opacity-50 sm:w-4"
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 mx-6 max-w-sm rotate-[-3.5deg] border-[3px] border-[#a84d5f]/55 bg-[#f4ebe3] px-5 py-4 shadow-[6px_10px_0_rgba(0,0,0,0.28)] sm:px-7 sm:py-5"
        )}
      >
        <p className="text-[0.58rem] tracking-[0.22em] text-[#a84d5f] uppercase">
          {stamp ?? "EXHIBIT B"} · Venue Menu
        </p>
        <p
          className={cn(
            SERIF,
            "mt-2 text-xl font-semibold leading-tight text-[#1a1410] sm:text-3xl"
          )}
        >
          {prettyVenueName(label)}
        </p>
        <p className={cn(DISPLAY, "mt-2 text-sm text-[#6b5340]")}>
          แตะหรือพลิกเพื่อเปิดแฟ้ม
        </p>
      </div>
    </button>
  );
}

export function CafeVenueMenuBook({
  menu,
  venueLabel = "SOCIEFEE × CHOUXSTORY",
  venueImage,
  venueImageAlt,
  onZoom,
}: CafeVenueMenuBookProps) {
  const items = menu.items;
  const spread = useMdUp();
  const step = spread ? 2 : 1;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(COVER_INDEX);
  const pagesRef = useRef<HTMLDivElement>(null);
  const leftLeafRef = useRef<HTMLDivElement>(null);
  const rightLeafRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const turningRef = useRef(false);
  const indexRef = useRef(COVER_INDEX);
  const stepRef = useRef(step);

  const onCover = index <= COVER_INDEX;
  const maxIndex = Math.max(0, items.length - 1);
  const leftPage = onCover ? undefined : items[index];
  const rightPage = !onCover && spread ? items[index + 1] : undefined;
  const lastStart = snapToStep(maxIndex, step);
  const spreadCount = Math.ceil(items.length / Math.max(1, step));
  const dotCount = 1 + spreadCount;
  const activeDot = onCover ? 0 : 1 + Math.floor(index / step);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    stepRef.current = step;
    setIndex((current) => snapToStep(current, step));
  }, [step]);

  useGSAP(
    () => {
      const cover = coverRef.current;
      if (!cover) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduce) return;
      gsap.from(cover, {
        autoAlpha: 0,
        y: 18,
        rotateX: 6,
        duration: 0.7,
        ease: "power3.out",
      });
    },
    { scope: coverRef }
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const el = pagesRef.current;
      if (!el) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduce) {
        gsap.set(el, { rotateY: 0, autoAlpha: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 14, rotateX: 5 },
        {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          duration: 0.62,
          ease: "power2.out",
        }
      );
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  const goTo = useCallback(
    (target: number) => {
      const current = indexRef.current;
      const stepNow = stepRef.current;
      const next = snapToStep(
        Math.min(maxIndex, Math.max(COVER_INDEX, target)),
        stepNow
      );
      if (next === current || turningRef.current) return;
      const dir = (next > current ? 1 : -1) as 1 | -1;
      const spreadNow = stepNow === 2;
      const coverMove = current <= COVER_INDEX || next <= COVER_INDEX;
      const el = coverMove
        ? pagesRef.current
        : spreadNow
          ? dir === 1
            ? rightLeafRef.current
            : leftLeafRef.current
          : pagesRef.current;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (!el || reduce) {
        setIndex(next);
        return;
      }

      turningRef.current = true;
      const closeOrigin =
        coverMove || !spreadNow
          ? dir === 1
            ? "0% 50%"
            : "100% 50%"
          : dir === 1
            ? "0% 50%"
            : "100% 50%";
      const openOrigin =
        coverMove || !spreadNow
          ? dir === 1
            ? "100% 50%"
            : "0% 50%"
          : closeOrigin;

      gsap
        .timeline({
          onComplete: () => {
            turningRef.current = false;
          },
        })
        .to(el, {
          rotateY: dir * 90,
          duration: 0.52,
          ease: "power2.in",
          transformOrigin: closeOrigin,
        })
        .add(() => setIndex(next))
        .set(el, {
          rotateY: dir * -84,
          transformOrigin: openOrigin,
        })
        .to(el, {
          rotateY: 0,
          duration: 0.64,
          ease: "power2.out",
        });
    },
    [maxIndex]
  );

  const turn = useCallback(
    (dir: 1 | -1) => {
      const current = indexRef.current;
      if (current <= COVER_INDEX && dir === 1) {
        goTo(0);
        return;
      }
      if (current === 0 && dir === -1) {
        goTo(COVER_INDEX);
        return;
      }
      goTo(current + dir * stepRef.current);
    },
    [goTo]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        turn(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        turn(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, turn]);

  function openDossier() {
    turningRef.current = false;
    setIndex(COVER_INDEX);
    setOpen(true);
  }

  return (
    <div id="venue-menu" className="mt-12 sm:mt-16">
      <ScrollReveal variant="editorial">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-[0.65rem] tracking-[0.28em] text-[#9a7b5a] uppercase sm:text-[0.68rem]">
            Evidence Ledger · House Menu
          </p>
          {menu.stamp ? (
            <span className="border border-[#a84d5f]/40 px-2 py-0.5 text-[0.58rem] tracking-[0.2em] text-[#c46a7a] uppercase">
              {menu.stamp}
            </span>
          ) : null}
        </div>
        <h3
          className={cn(
            SERIF,
            "mt-3 text-[1.5rem] font-semibold text-[#f4ebe3] sm:text-3xl"
          )}
        >
          {menu.title}
          {menu.titleLocal ? (
            <span
              className={cn(
                DISPLAY,
                "mt-1.5 block text-base font-medium text-[#c4b8a8] sm:text-lg"
              )}
            >
              {menu.titleLocal}
            </span>
          ) : null}
        </h3>
      </ScrollReveal>

      <ScrollReveal variant="float" delay={0.08}>
        <div
          ref={coverRef}
          className="relative mt-6 overflow-hidden border border-[#9a7b5a]/30 bg-[#14100c] sm:mt-8"
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-[repeating-linear-gradient(180deg,#9a7b5a_0_10px,transparent_10px_18px)] opacity-40 sm:w-4"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full border border-[#a84d5f]/35 opacity-50 sm:size-36"
            aria-hidden
          />
          <div className="relative grid gap-6 px-5 py-8 pl-8 sm:grid-cols-[1fr_auto] sm:items-end sm:px-10 sm:py-10 sm:pl-12">
            <div>
              <p className="text-[0.62rem] tracking-[0.22em] text-[#c46a7a] uppercase">
                Case folder · {items.length} plates
              </p>
              <p
                className={cn(
                  SERIF,
                  "mt-3 max-w-xl text-base leading-relaxed text-[#d8d0c4] sm:text-lg"
                )}
              >
                {menu.note ??
                  "เปิดแฟ้มเมนูร้าน — พลิกแผ่นหลักฐานเหมือนเปิดเมนูในเคส"}
              </p>
            </div>
            <button
              type="button"
              onClick={openDossier}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-none border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a]"
              )}
            >
              <BookOpen className="size-4" />
              เปิดแฟ้มเมนู
            </button>
          </div>
        </div>
      </ScrollReveal>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[96dvh] w-[min(100%,calc(100vw-0.75rem))] max-w-5xl overflow-hidden rounded-none border-[#9a7b5a]/30 bg-[#0a0c0e] p-3 text-[#f4ebe3] md:max-w-6xl md:p-5 lg:max-w-7xl"
          showCloseButton
        >
          <DialogHeader className="pr-10">
            <DialogTitle className={cn(SERIF, "text-lg sm:text-xl")}>
              {menu.title}
              {menu.titleLocal ? ` · ${menu.titleLocal}` : ""}
            </DialogTitle>
            <DialogDescription className="text-[0.65rem] tracking-[0.2em] text-[#9a7b5a] uppercase">
              {menu.stamp ?? "EXHIBIT B"}
              <span className="md:hidden"> · พลิกทีละหน้าเหมือนเปิดหนังสือ</span>
              <span className="hidden md:inline">
                {" "}
                · เปิดแฟ้มหน้าคู่ · พลิกรอบสันหนังสือ
              </span>
            </DialogDescription>
          </DialogHeader>

          <div
            className="mt-1 flex items-stretch gap-0"
            style={{ perspective: "1800px" }}
            onTouchStart={(event) => {
              touchX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchX.current == null) return;
              const dx =
                (event.changedTouches[0]?.clientX ?? touchX.current) -
                touchX.current;
              touchX.current = null;
              if (dx > 48) turn(-1);
              if (dx < -48) turn(1);
            }}
          >
            <div
              ref={pagesRef}
              className="min-h-[58dvh] min-w-0 flex-1 will-change-transform md:min-h-[64dvh]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {onCover ? (
                <MenuCover
                  label={venueLabel}
                  image={venueImage}
                  imageAlt={venueImageAlt}
                  stamp={menu.stamp}
                  onOpen={() => turn(1)}
                />
              ) : spread ? (
                <div className="flex h-full min-h-[64dvh] w-full items-stretch overflow-hidden bg-[#100c0a] shadow-[inset_0_0_90px_rgba(0,0,0,0.35)]">
                  <div
                    ref={leftLeafRef}
                    className="flex min-h-0 min-w-0 flex-1 will-change-transform"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {leftPage ? (
                      <MenuPlate
                        item={leftPage}
                        index={index}
                        onZoom={onZoom}
                        className="h-full w-full border-r-0"
                      />
                    ) : null}
                  </div>
                  <BookSpine />
                  <div
                    ref={rightLeafRef}
                    className="flex min-h-0 min-w-0 flex-1 will-change-transform"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {rightPage ? (
                      <MenuPlate
                        item={rightPage}
                        index={index + 1}
                        onZoom={onZoom}
                        className="h-full w-full border-l-0"
                      />
                    ) : (
                      <BlankPlate />
                    )}
                  </div>
                </div>
              ) : leftPage ? (
                <div className="flex h-full min-h-[58dvh] w-full items-stretch overflow-hidden bg-[#100c0a] shadow-[inset_0_0_70px_rgba(0,0,0,0.3)]">
                  <div
                    className="w-2 shrink-0 bg-[repeating-linear-gradient(180deg,#9a7b5a_0_10px,transparent_10px_18px)] opacity-50"
                    aria-hidden
                  />
                  <MenuPlate
                    item={leftPage}
                    index={index}
                    onZoom={onZoom}
                    className="h-full min-w-0 flex-1 border-l-0"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label={onCover ? "หน้าปก" : spread ? "คู่หน้าก่อน" : "แผ่นก่อนหน้า"}
              onClick={() => turn(-1)}
              disabled={onCover}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-none border border-[#9a7b5a]/35 text-[#f4ebe3] disabled:opacity-30"
              )}
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <p className="text-[0.65rem] tracking-[0.18em] text-[#9a7b5a] uppercase">
                {onCover
                  ? "Cover · ปกเมนู"
                  : spread
                    ? `${plateLabel(index)}–${plateLabel(Math.min(index + 1, maxIndex))} / ${plateLabel(maxIndex)}`
                    : `${plateLabel(index)} / ${plateLabel(maxIndex)}`}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {Array.from({ length: dotCount }, (_, i) => {
                  const target = i === 0 ? COVER_INDEX : (i - 1) * step;
                  return (
                    <button
                      key={i === 0 ? "cover" : (items[target]?.id ?? `spread-${i}`)}
                      type="button"
                      aria-label={i === 0 ? "ไปหน้าปก" : spread ? `ไปคู่หน้า ${i}` : `ไปแผ่น ${i}`}
                      onClick={() => goTo(target)}
                      className={cn(
                        "rounded-full transition",
                        i === 0 ? "size-2.5" : "size-2",
                        i === activeDot ? "bg-[#c46a7a]" : "bg-[#9a7b5a]/35"
                      )}
                    />
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              aria-label={onCover ? "เปิดแฟ้ม" : spread ? "คู่หน้าถัดไป" : "แผ่นถัดไป"}
              onClick={() => turn(1)}
              disabled={!onCover && index >= lastStart}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-none border border-[#9a7b5a]/35 text-[#f4ebe3] disabled:opacity-30"
              )}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
