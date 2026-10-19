"use client";

import Link from "next/link";
import { useState } from "react";

import { CafeVenueBook } from "@/components/cafe/board/CafeVenueBook";
import {
  BoardSection,
  EmptyFrame,
  LABEL,
  Paper,
  SealedZone,
  SectionHead,
  SERIF,
  THAI,
} from "@/components/cafe/board/pieces";
import { GOLD_BUTTON } from "@/components/cafe/board/brass";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isStandInCafeImage, setLetter, visiblePrice } from "@/lib/cafe-board";
import { cn } from "@/lib/utils";
import type { CafeGoodsItem, CafePage } from "@/types/vtuber";
import type { ImageLightboxItem } from "@/components/media/ImageLightbox";
import type { CafeCaseFileCover } from "@/lib/cafe-case-file";

type OpenPlate = (items: ImageLightboxItem[], index: number, group: string) => void;

type SetMark = { setId: string; letter: string; qty?: number };

/** goodsId → the sets that give it away, from the provision sets (single source of truth). */
function giveawayMarks(cafe: CafePage) {
  const marks = new Map<string, SetMark[]>();
  (cafe.promoSets?.items ?? []).forEach((set, index) => {
    const letter = setLetter(set.name, index);
    (set.gifts ?? []).forEach((gift) => {
      if (!gift.goodsId) return;
      const list = marks.get(gift.goodsId) ?? [];
      list.push({ setId: set.id, letter, qty: gift.qty });
      marks.set(gift.goodsId, list);
    });
  });
  return marks;
}

function DossierCard({
  item,
  marks,
  showKind,
  onZoom,
  tilt,
}: {
  item: CafeGoodsItem;
  marks: SetMark[];
  showKind: boolean;
  onZoom: (() => void) | null;
  tilt: number;
}) {
  const sale = item.kind !== "giveaway";
  const price = sale ? visiblePrice(item.priceLabel) : "";
  const standIn = isStandInCafeImage(item.image, item.imageAlt);
  const frame = standIn ? (
    <EmptyFrame pending className="aspect-square w-full" />
  ) : (
    <ProtectedImage
      src={item.image}
      alt={item.imageAlt ?? item.name}
      wrapClassName="block aspect-square w-full overflow-hidden"
      className="h-full w-full object-cover"
    />
  );

  return (
    <Paper tilt={tilt} motion="drop" className="flex h-full flex-col p-2 pb-3">
      <div className="relative">
        {onZoom ? (
          <button
            type="button"
            className="block w-full cursor-zoom-in"
            aria-label={`ดูรูป: ${item.imageAlt ?? item.name}`}
            onClick={onZoom}
          >
            {frame}
          </button>
        ) : (
          frame
        )}
        {showKind ? (
          <span
            className={cn(
              LABEL,
              "absolute top-2 left-2 px-2 py-0.5 text-[9px] sm:text-[9px]",
              sale ? "bg-cafe-forest text-cafe-cream" : "bg-cafe-gold text-cafe-ink"
            )}
          >
            {sale ? "For sale" : "Giveaway"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-2.5">
        <p className={cn(LABEL, "text-[9.5px] text-cafe-gold-deep sm:text-[9.5px]")}>{item.name}</p>
        <h3 className={cn(THAI, "mt-1 text-[15px] leading-snug font-bold sm:text-base")}>
          {item.nameLocal ?? item.name}
        </h3>
        {item.description ? (
          <p className="mt-1.5 hidden text-[13px] leading-relaxed text-cafe-ink-soft sm:block">
            {item.description}
          </p>
        ) : null}
        {price || marks.length > 0 ? (
          <div className="mt-auto space-y-1.5 pt-2.5">
            <div className="border-t border-dashed border-cafe-ink/30 pt-2.5">
              {price ? (
                <p className="flex items-baseline justify-between">
                  <span className={cn(LABEL, "text-[9.5px] text-cafe-ink-muted sm:text-[9.5px]")}>Price</span>
                  <span className={cn(SERIF, "text-lg font-bold")}>{price}</span>
                </p>
              ) : null}
              {marks.length > 0 ? (
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-cafe-ink-muted">ได้ในเซต</span>
                  {marks.map((mark) => (
                    <span
                      key={mark.setId}
                      className="bg-cafe-forest px-1.5 py-0.5 text-[11.5px] font-semibold text-cafe-cream"
                    >
                      {mark.letter}
                      {mark.qty ? ` ×${mark.qty}` : ""}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Paper>
  );
}

export function CafeGoodsBlock({
  cafe,
  show,
  onOpen,
}: {
  cafe: CafePage;
  show: boolean;
  onOpen: OpenPlate;
}) {
  const [filter, setFilter] = useState("all");
  const goods = cafe.goods;
  if (!goods) return null;

  // Sale items stay off until they are announced (the server drops them too).
  const saleListed = Boolean(goods.saleListed);
  const items = goods.items.filter((item) => saleListed || item.kind === "giveaway");
  const marks = giveawayMarks(cafe);
  const sets = (cafe.promoSets?.items ?? []).map((set, index) => ({
    id: set.id,
    label: `เซต ${setLetter(set.name, index)}`,
    count: items.filter((item) => marks.get(item.id)?.some((mark) => mark.setId === set.id)).length,
  }));
  const saleCount = items.filter((item) => item.kind !== "giveaway").length;
  const filters = [
    { id: "all", label: "ทั้งหมด", count: items.length },
    ...sets.filter((set) => set.count > 0),
    ...(saleListed && saleCount > 0 ? [{ id: "sale", label: "ของขาย", count: saleCount }] : []),
  ];
  const current = filters.some((entry) => entry.id === filter) ? filter : "all";
  const visible = items.filter((item) => {
    if (current === "all") return true;
    if (current === "sale") return item.kind !== "giveaway";
    return marks.get(item.id)?.some((mark) => mark.setId === current) ?? false;
  });
  const plates: ImageLightboxItem[] = visible
    .filter((item) => item.image && !isStandInCafeImage(item.image, item.imageAlt))
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
          <>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cafe-text">
              {saleListed
                ? "ของที่ระลึกทั้งหมดของคดีนี้ — ทั้งของขาย และของแถมจากชุดเสบียง"
                : "ของแถมจากชุดเสบียงทั้งหมด · เลือกเซตเพื่อดูว่าได้อะไรบ้าง"}
            </p>
            {filters.length > 1 ? (
              <div role="group" aria-label="กรองของที่ระลึก" className="mt-6 flex flex-wrap gap-2">
                {filters.map((entry) => {
                  const on = entry.id === current;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(entry.id)}
                      className={cn(
                        "min-h-10 border px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-cream",
                        on
                          ? "border-cafe-gold bg-cafe-gold text-cafe-ink"
                          : "border-cafe-gold/50 text-cafe-text hover:border-cafe-gold"
                      )}
                    >
                      {entry.label} <span className="font-normal opacity-70">{entry.count}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div
              className={cn(
                "mt-6 grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4",
                items.length === 5 && "xl:grid-cols-5"
              )}
            >
              {visible.map((item, index) => {
                const plateIndex = plates.findIndex((plate) => plate.id === item.id);
                return (
                  <DossierCard
                    key={item.id}
                    item={item}
                    marks={marks.get(item.id) ?? []}
                    showKind={saleListed}
                    tilt={index % 2 === 0 ? -0.6 : 0.6}
                    onZoom={plateIndex < 0 ? null : () => onOpen(plates, plateIndex, goods.title)}
                  />
                );
              })}
            </div>
          </>
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
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cafe-text">{venue.note}</p>
        ) : null}
        {show ? (
          <CafeVenueBook
            items={venue.items}
            onZoom={(index) => onOpen(plates, index, venue.title)}
          />
        ) : null}
      </div>
    </BoardSection>
  );
}

/** Full-width banner into the webtoon: cover art faded behind, copy and button centred. */
export function CafeStoryBlock({
  cover,
  showCaseFile,
}: {
  cover: CafeCaseFileCover | null;
  showCaseFile: boolean;
}) {
  return (
    <BoardSection id="story" className="mt-24">
      <h2 className="sr-only">Story · แฟ้มคดี</h2>
      {showCaseFile ? (
        <Link
          href="/cafe/event"
          data-motion="rise"
          className="group relative flex min-h-[250px] items-center justify-center overflow-hidden border border-cafe-gold/45 bg-cafe-ink text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cafe-cream sm:min-h-[280px]"
        >
          {cover ? (
            <ProtectedImage
              src={cover.image}
              alt=""
              aria-hidden
              wrapClassName="pointer-events-none absolute inset-0 block"
              className="size-full object-cover opacity-40 grayscale-[.3] transition duration-500 group-hover:scale-[1.03] group-hover:opacity-50"
            />
          ) : null}
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_50%,rgba(10,31,26,0.55),rgba(10,31,26,0.92))]"
          />
          <span aria-hidden className="absolute inset-2.5 border border-cafe-gold/25" />
          <div className="relative px-5 py-7">
            <p className={LABEL}>Opening Act</p>
            <p data-motion="lens" className={cn(THAI, "mt-2 text-3xl font-bold text-cafe-cream sm:text-4xl")}>
              แฟ้มคดี
            </p>
            <p className={cn(THAI, "mt-1.5 text-base text-cafe-gold-soft sm:text-lg")}>
              อ่านเรื่องเปิดคดีแบบเว็บตูน ก่อนลงพื้นที่จริง
            </p>
            <span className={cn(GOLD_BUTTON, "mx-auto mt-5 inline-flex min-h-11 w-auto px-5 text-sm")}>
              อ่านแฟ้มคดี →
            </span>
          </div>
        </Link>
      ) : (
        <SealedZone className="mt-0" />
      )}
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
