import Link from "next/link";

import { CafeTopSecret } from "@/components/cafe/CafeTopSecret";
import {
  BoardSection,
  EmptyFrame,
  HAND,
  LABEL,
  Paper,
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
import cafeEvent from "@/data/mild-r/cafe-event.json";

const GOODS_MARKS = ["Item 01 · Key Clue", "Item 02 · Clue"];
const POLAROID_TILT = [-2.4, 2, -1.4, 2.6, -2, 1.6];

type OpenPlate = (items: ImageLightboxItem[], index: number, group: string) => void;

const cover = (
  cafeEvent as { panels: { image?: string; imageAlt?: string }[] }
).panels.find((panel) => panel.image);

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
      {show ? (
        <div>
          <SectionHead
            eyebrow={goods.eyebrow}
            title={goods.title}
            titleLocal={goods.titleLocal}
            stamp={goods.stamp}
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {goods.items.map((item, index) => {
              const standIn = isStandInCafeImage(item.image, item.imageAlt);
              const plateIndex = plates.findIndex((plate) => plate.id === item.id);
              const frame = standIn ? (
                <EmptyFrame className="h-full min-h-48 w-full" />
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
                  <div className="grid sm:grid-cols-[13rem_minmax(0,1fr)]">
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
                      <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636] uppercase")}>
                        {GOODS_MARKS[index] ?? `Item ${String(index + 1).padStart(2, "0")}`}
                      </p>
                      <h3 className={cn(TYPE, "mt-2 text-lg font-bold")}>{item.name}</h3>
                      {item.nameLocal ? (
                        <p className={cn(HAND, "mt-1 text-xl text-[#7a1f2a]")}>
                          {item.nameLocal}
                        </p>
                      ) : null}
                      {item.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-[#3d3024]">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Paper>
              );
            })}
          </div>
        </div>
      ) : (
        <CafeTopSecret titleLocal="แฟ้มรวบรวมเบาะแส · ยังไม่เปิดเผย" />
      )}
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
      {show ? (
        <div>
          <SectionHead
            eyebrow={venue.eyebrow}
            title={venue.title}
            titleLocal={venue.titleLocal}
            stamp={venue.stamp}
          />
          {venue.note ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d8d0c4]">
              {venue.note}
            </p>
          ) : null}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {venue.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-motion="drop"
                aria-label={`ดูรูป: ${item.imageAlt ?? item.caption ?? item.id}`}
                onClick={() => onOpen(plates, index, venue.title)}
                className={cn(
                  "cursor-zoom-in bg-[#f4ebe3] p-2 pb-3 text-left text-[#1a1410] shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
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
                  <span className={cn(HAND, "block text-center text-sm text-[#7a1f2a]")}>
                    {item.captionLocal}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <CafeTopSecret titleLocal="เมนูร้าน · ยังไม่เปิดเผย" />
      )}
    </BoardSection>
  );
}

export function CafeStoryBlock({
  cafe,
  showGallery,
  onOpen,
}: {
  cafe: CafePage;
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
      <div
        data-motion="rise"
        className="grid items-center gap-6 border border-[rgba(154,123,90,0.4)] bg-[#14100c] p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-6"
      >
        {cover?.image ? (
          <ProtectedImage
            src={cover.image}
            alt={cover.imageAlt ?? "ปกแฟ้มคดี"}
            wrapClassName="mx-auto block w-36 -rotate-2 overflow-hidden shadow-[0_14px_26px_rgba(0,0,0,0.45)]"
            className="aspect-[3/4] w-full object-cover"
          />
        ) : null}
        <div>
          <p className={LABEL}>Opening Act</p>
          <p className="mt-1 font-[family-name:var(--font-cafe-serif)] text-3xl text-[#f4ebe3]">
            แฟ้มคดี
          </p>
          <p className={cn(HAND, "mt-1 text-[22px] text-[#f3b8c4]")}>อ่านแบบเว็บตูน</p>
          <Link
            href="/cafe/event"
            className="mt-4 inline-flex min-h-11 items-center bg-[#e85a7a] px-4 text-sm font-semibold text-[#1a1410] transition hover:-translate-y-0.5"
          >
            อ่านแฟ้มคดี
          </Link>
        </div>
      </div>

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
                "cursor-zoom-in bg-[#f4ebe3] p-2 pb-3 text-left text-[#1a1410] shadow-[0_14px_26px_rgba(0,0,0,0.45)]",
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
      {show ? (
        <div data-motion="rise" className="text-center">
          <SectionHead
            align="center"
            eyebrow={closing.eyebrow}
            title={closing.title}
            titleLocal={closing.titleLocal}
          />
          {paragraph ? (
            <p className="mt-6 text-base leading-relaxed text-[#d8d0c4]">
              {paragraph}
            </p>
          ) : null}
          {follow?.url ? (
            <Link
              href={follow.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center bg-[#1a1410] px-4 text-sm text-[#f4ebe3] transition hover:-translate-y-0.5"
            >
              {follow.label}
            </Link>
          ) : null}
          {closing.disclaimer ? (
            <p className="mt-6 text-xs leading-relaxed text-[#c4b8a8]">
              {closing.disclaimer}
            </p>
          ) : null}
        </div>
      ) : (
        <CafeTopSecret titleLocal="สรุปฉบับนี้ · ยังไม่เปิดเผย" />
      )}
    </BoardSection>
  );
}
