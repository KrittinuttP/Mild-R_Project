import Link from "next/link";

import {
  BoardSection,
  EmptyFrame,
  HAND,
  LABEL,
  Paper,
  SealedZone,
  SectionHead,
  TILT,
  TYPE,
  tiltStyle,
} from "@/components/cafe/board/pieces";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isCafeMission, isStandInCafeImage } from "@/lib/cafe-board";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";
import type { ImageLightboxItem } from "@/components/media/ImageLightbox";
import type { CafeCaseFileCover } from "@/lib/cafe-case-file";

const GOODS_MARKS = ["Item 01 · Key Clue", "Item 02 · Clue"];
const POLAROID_TILT = [-2.4, 2, -1.4, 2.6, -2, 1.6];

type OpenPlate = (items: ImageLightboxItem[], index: number, group: string) => void;

export function CafeGoodsBlock({
  cafe,
  show,
  onOpen,
}: {
  cafe: CafePage;
  show: boolean;
  onOpen: OpenPlate;
}) {
  const goods = cafe.goods;
  if (!goods) return null;
  const plates: ImageLightboxItem[] = goods.items
    .filter((item) => !isStandInCafeImage(item.image, item.imageAlt) && item.image)
    .map((item) => ({
      id: item.id,
      src: item.image as string,
      alt: item.imageAlt ?? item.name,
      caption: item.nameLocal ? `${item.name} · ${item.nameLocal}` : item.name,
    }));

  return (
    <BoardSection id="goods" className="mt-24">
        <div>
          {show ? (
            <SectionHead
              eyebrow={goods.eyebrow}
              title={goods.title}
              titleLocal={goods.titleLocal}
              stamp={goods.stamp}
            />
          ) : (
            <SealedZone />
          )}
          {show ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {goods.items.map((item, index) => {
              const standIn = isStandInCafeImage(item.image, item.imageAlt);
              const plateIndex = plates.findIndex((plate) => plate.id === item.id);
              const portrait = item.id === "acrylic-stand";
              const frame = standIn ? (
                <EmptyFrame className="h-full min-h-48 w-full" />
              ) : portrait ? (
                <ProtectedImage
                  src={item.image}
                  alt={item.imageAlt ?? item.name}
                  wrapClassName="flex h-[320px] w-full items-center justify-center bg-cafe-cream sm:h-[380px] sm:w-[7.5rem]"
                  className="h-full w-auto max-w-full object-contain"
                />
              ) : (
                <ProtectedImage
                  src={item.image}
                  alt={item.imageAlt ?? item.name}
                  wrapClassName="block h-full min-h-48 w-full overflow-hidden"
                  className="h-full min-h-48 w-full object-cover grayscale-[.45] transition duration-300 hover:grayscale-0"
                />
              );
              return (
                <Paper
                  key={item.id}
                  tilt={index % 2 === 0 ? -1 : 1}
                  pin={`goods-${item.id}`}
                  motion="drop"
                >
                  <div
                    className={cn(
                      "grid",
                      portrait
                        ? "sm:grid-cols-[7.5rem_minmax(0,1fr)]"
                        : "sm:grid-cols-[13rem_minmax(0,1fr)]"
                    )}
                  >
                    {standIn || plateIndex < 0 ? (
                      frame
                    ) : (
                      <button
                        type="button"
                        className="cursor-zoom-in text-left"
                        aria-label={`ดูรูป: ${item.imageAlt ?? item.name}`}
                        onClick={() => onOpen(plates, plateIndex, goods.title)}
                      >
                        {frame}
                      </button>
                    )}
                    <div className="px-4 py-4">
                      <p className={cn(TYPE, "text-xs tracking-[0.14em] text-cafe-ink-muted uppercase")}>
                        {GOODS_MARKS[index] ?? `Item ${String(index + 1).padStart(2, "0")}`}
                      </p>
                      <h3 className={cn(TYPE, "mt-2 text-lg font-bold")}>{item.name}</h3>
                      {item.nameLocal ? (
                        <p className={cn(HAND, "mt-1 text-xl text-cafe-forest")}>{item.nameLocal}</p>
                      ) : null}
                      {item.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-cafe-ink-soft">{item.description}</p>
                      ) : null}
                    </div>
                  </div>
                </Paper>
              );
            })}
          </div>
          ) : null}
        </div>
    </BoardSection>
  );
}

export function CafeVenueBlock({
  cafe,
  show,
  onOpen,
}: {
  cafe: CafePage;
  show: boolean;
  onOpen: OpenPlate;
}) {
  const venue = cafe.venueMenu;
  if (!venue) return null;
  const plates: ImageLightboxItem[] = venue.items.map((item, index) => ({
    id: item.id,
    src: item.image,
    alt: item.imageAlt ?? item.caption ?? `เมนูร้าน ${index + 1}`,
    caption: item.captionLocal
      ? `${item.caption ?? ""} · ${item.captionLocal}`.replace(/^ · /, "")
      : item.caption,
  }));

  return (
    <BoardSection id="venue-menu" className="mt-24">
        <div>
          {show ? (
            <SectionHead
              eyebrow={venue.eyebrow}
              title={venue.title}
              titleLocal={venue.titleLocal}
              stamp={venue.stamp}
            />
          ) : (
            <SealedZone />
          )}
          {venue.note && show ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cafe-text">
              {venue.note}
            </p>
          ) : null}
          {show ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {venue.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-motion="drop"
                aria-label={`ดูรูป: ${item.imageAlt ?? item.caption ?? item.id}`}
                onClick={() => onOpen(plates, index, venue.title)}
                className={cn(
                  "cursor-zoom-in bg-cafe-cream p-2 pb-3 text-left text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
                  TILT,
                  "hover:[transform:rotate(0deg)_scale(1.08)]"
                )}
                style={tiltStyle(POLAROID_TILT[index % POLAROID_TILT.length])}
              >
                <ProtectedImage
                  src={item.image}
                  alt={item.imageAlt ?? item.caption ?? ""}
                  wrapClassName="block aspect-[5/7] w-full overflow-hidden"
                  className="aspect-[5/7] h-full w-full object-cover grayscale-[.45] transition duration-300 hover:grayscale-0"
                />
                {item.caption ? (
                  <span className={cn(TYPE, "mt-2 block text-center text-[0.65rem] tracking-[0.08em] uppercase")}>
                    {item.caption}
                  </span>
                ) : null}
                {item.captionLocal ? (
                  <span className={cn(HAND, "block text-center text-sm text-cafe-forest")}>
                    {item.captionLocal}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          ) : null}
        </div>
    </BoardSection>
  );
}

export function CafeStoryBlock({
  cafe,
  cover,
  showCaseFile,
  showGallery,
  onOpen,
}: {
  cafe: CafePage;
  cover: CafeCaseFileCover | null;
  showCaseFile: boolean;
  showGallery: boolean;
  onOpen: OpenPlate;
}) {
  const plates: ImageLightboxItem[] = (cafe.operations?.groups ?? [])
    .flatMap((group) => group.items)
    // Mission photos are shown on the mission board (`CafeActivities`), not twice.
    .filter((item) => !isCafeMission(item))
    .filter((item) => item.image && !isStandInCafeImage(item.image, item.imageAlt))
    .map((item) => ({
      id: item.id,
      src: item.image as string,
      alt: item.imageAlt ?? item.caption ?? item.name,
      caption: item.caption,
    }));

  return (
    <BoardSection id="story" className="mt-24">
      <h2 className="sr-only">Story · Gallery</h2>
      {showCaseFile ? (
      <div
        data-motion="rise"
        className="grid items-center gap-6 border border-[rgba(201,161,74,0.4)] bg-cafe-void p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-6"
      >
        {cover ? (
          <ProtectedImage
            src={cover.image}
            alt={cover.imageAlt ?? "ปกแฟ้มคดี"}
            wrapClassName="mx-auto block w-36 -rotate-2 overflow-hidden shadow-[0_14px_26px_rgba(0,0,0,0.45)]"
            className="aspect-[3/4] w-full object-cover"
          />
        ) : null}
        <div>
          <p className={LABEL}>Opening Act</p>
          <p className="mt-1 font-[family-name:var(--font-cafe-serif)] text-3xl text-cafe-cream">
            แฟ้มคดี
          </p>
          <p className={cn(HAND, "mt-1 text-[22px] text-cafe-gold-soft")}>อ่านแบบเว็บตูน</p>
          <Link
            href="/cafe/event"
            className="mt-4 inline-flex min-h-11 items-center bg-cafe-gold px-4 text-sm font-semibold text-cafe-ink transition hover:-translate-y-0.5"
          >
            อ่านแฟ้มคดี
          </Link>
        </div>
      </div>
      ) : (
        <SealedZone className="mt-0" />
      )}

      {showGallery && plates.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {plates.map((plate, index) => (
            <button
              key={plate.id}
              type="button"
              data-motion="drop"
              aria-label={`ดูรูป: ${plate.alt}`}
              onClick={() => onOpen(plates, index, "Gallery")}
              className={cn(
                "cursor-zoom-in bg-cafe-cream p-2 pb-3 text-left text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
                TILT,
                "hover:[transform:rotate(0deg)_scale(1.08)]"
              )}
              style={tiltStyle(POLAROID_TILT[index % POLAROID_TILT.length])}
            >
              <ProtectedImage
                src={plate.src}
                alt={plate.alt}
                wrapClassName="block aspect-[5/7] w-full overflow-hidden"
                className="aspect-[5/7] h-full w-full object-cover grayscale-[.45] transition duration-300 hover:grayscale-0"
              />
              {plate.caption ? (
                <span className={cn(TYPE, "mt-2 block text-center text-[0.65rem] tracking-[0.08em] uppercase")}>
                  {plate.caption}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </BoardSection>
  );
}

export function CafeClosingBlock({
  cafe,
  show,
}: {
  cafe: CafePage;
  show: boolean;
}) {
  const closing = cafe.closing;
  const follow = closing.ctas?.[0];
  const paragraph = closing.body[0];

  return (
    <BoardSection className="mt-24 mb-24" width="820">
        <div data-motion="rise" className="text-center">
          {show ? (
            <SectionHead
              align="center"
              eyebrow={closing.eyebrow}
              title={closing.title}
              titleLocal={closing.titleLocal}
            />
          ) : (
            <SealedZone />
          )}
          {show && paragraph ? (
            <p className="mt-6 text-base leading-relaxed text-cafe-text">{paragraph}</p>
          ) : null}
          {show && follow?.url ? (
            <Link
              href={follow.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center bg-cafe-ink px-4 text-sm text-cafe-cream transition hover:-translate-y-0.5"
            >
              {follow.label}
            </Link>
          ) : null}
          {show && closing.disclaimer ? (
            <p className="mt-6 text-xs leading-relaxed text-cafe-muted">{closing.disclaimer}</p>
          ) : null}
        </div>
    </BoardSection>
  );
}
