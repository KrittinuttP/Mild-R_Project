"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Images, Palette, Radio, Upload, type LucideIcon } from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { RChip } from "@/components/common/RChip";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { artistCredit, isFanArtItem, sortGalleryItems } from "@/components/gallery/gallery-utils";
import { LiveCoverLightbox } from "@/components/gallery/LiveCoverLightbox";
import { ImageLightbox, type ImageLightboxItem } from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { useLiveCovers } from "@/hooks/useLiveCovers";
import { FANART_LIMITS } from "@/lib/fanart-upload";
import type { LiveCoverItem } from "@/lib/live-streams";
import { R_CTA_OUTLINE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { FanArtItem, GalleryItem, VtuberProfile } from "@/types/vtuber";

type GalleryProps = {
  data: VtuberProfile;
  /** Approved fan art from the upload form (lib/fanart-submissions-store). */
  fanArt: FanArtItem[];
};

/** Tiles on the home preview: 4 columns × 2 from tablet up, a 3-column bento of 6 on phones. */
const WIDE_COUNT = 8;
const PHONE_COUNT = 6;
/** Live covers: 4 + "more" from tablet up, 3 + "more" on phones. */
const COVER_COUNT = 4;

/**
 * Board (GWX1-d) tile shapes, column by column. Every column adds up to the same
 * height (3:2 + 3:4 = 1:1 + 1:1), so the four columns end level.
 */
const COLUMN_SHAPES: Array<[string, string]> = [
  ["aspect-[3/2]", "aspect-[3/4]"],
  ["aspect-[3/4]", "aspect-[3/2]"],
  ["aspect-square", "aspect-square"],
  ["aspect-[3/4]", "aspect-[3/2]"],
];

type Shape = "wide" | "tall" | "square";
const shapeOfClass = (cls: string): Shape => (cls.includes("3/2") ? "wide" : cls.includes("3/4") ? "tall" : "square");
function shapeOfItem(item: GalleryItem): Shape {
  if (!item.width || !item.height) return item.size === "tall" ? "tall" : item.size === "wide" || item.size === "lg" ? "wide" : "square";
  const ratio = item.width / item.height;
  return ratio >= 1.15 ? "wide" : ratio <= 0.87 ? "tall" : "square";
}

/** Put each of the first 8 pictures in a slot of a similar shape (so crops stay gentle). */
function fillSlots<T extends GalleryItem>(items: T[]): T[][] {
  const pool = items.slice(0, WIDE_COUNT);
  return COLUMN_SHAPES.map((shapes) =>
    shapes
      .map((cls) => {
        if (pool.length === 0) return null;
        const want = shapeOfClass(cls);
        const i = Math.max(0, pool.findIndex((item) => shapeOfItem(item) === want));
        return pool.splice(i, 1)[0];
      })
      .filter((item): item is T => Boolean(item))
  );
}

/* ── small pieces ─────────────────────────────────────────────────── */

function BlockHeading({ icon: Icon, title, count }: { icon: LucideIcon; title: string; count?: string }) {
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="inline-flex items-center gap-[9px] font-[family-name:var(--font-display)] text-lg text-r-text md:text-[1.1875rem]">
        <Icon aria-hidden className="size-[18px] translate-y-[2px] text-r-pri" />
        {title}
      </span>
      {count ? <span className="text-[0.8125rem] text-r-text-2">· {count}</span> : null}
    </h3>
  );
}

/** "อีก 32 รูป · ดูทั้งหมด ›" over the last tile (or on its own tile). */
function MoreOverlay({
  href,
  label,
  icon,
  children,
}: {
  href: string;
  label: string;
  /** Shown above the label (never behind it). */
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
    >
      {children}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-r-bg/60 ring-[1.5px] ring-r-pri/45 ring-inset transition-colors group-hover:bg-r-bg/45">
        {icon ? <span className="mb-1.5 text-r-pri/70 transition-colors group-hover:text-r-pri">{icon}</span> : null}
        <span className="font-[family-name:var(--font-display)] text-base leading-tight text-r-text">{label}</span>
        <span className="inline-flex items-center gap-0.5 text-[0.71875rem] text-r-text-2">
          ดูทั้งหมด <ChevronRight aria-hidden className="size-3" />
        </span>
      </span>
    </Link>
  );
}

function Tile<T extends GalleryItem>({
  item,
  className,
  onOpen,
  footer,
}: {
  item: T;
  className?: string;
  onOpen: () => void;
  footer?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`ดูรูป ${item.caption ?? item.alt}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
        className
      )}
    >
      <ProtectedImage
        src={item.thumb ?? item.src}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {footer}
    </button>
  );
}

/** Artist tag along the bottom of a fan-art tile. */
function ArtistTag({ item }: { item: FanArtItem }) {
  return (
    <span className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-full bg-r-bg/80 px-2 py-[5px] ring-1 ring-r-text-2/15 ring-inset">
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full bg-r-pri/30 text-[0.5625rem] text-r-text">
        {item.artist.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 truncate text-[0.6875rem] text-r-text/90">{item.artist.handle ?? item.artist.name}</span>
    </span>
  );
}

/* ── picture boards (Moments · fan art) ──────────────────────────── */

function PictureBoard<T extends GalleryItem>({
  items: rawItems,
  viewAllHref,
  moreLabel,
  moreIcon,
  counterLabel,
  renderFooter,
}: {
  items: T[];
  viewAllHref: string;
  /** Last tile, same look as the live covers row: icon + "…ทั้งหมด" + "ดูทั้งหมด ›". */
  moreLabel: string;
  moreIcon: LucideIcon;
  counterLabel: string;
  renderFooter?: (item: T) => ReactNode;
}) {
  const items = useMemo(() => sortGalleryItems(rawItems), [rawItems]);
  const columns = useMemo(() => fillSlots(items), [items]);
  const wideShown = columns.flat();
  const phoneShown = items.slice(0, PHONE_COUNT);
  const [lightbox, setLightbox] = useState<{ list: T[]; index: number } | null>(null);

  const lightboxItems = useMemo<ImageLightboxItem[]>(
    () =>
      (lightbox?.list ?? []).map((item) => ({
        id: item.id,
        src: item.src,
        alt: item.alt,
        caption: item.caption ?? item.alt,
        description: artistCredit(item) || undefined,
      })),
    [lightbox]
  );

  const wideMore = items.length - WIDE_COUNT;
  const phoneMore = items.length - PHONE_COUNT;
  const MoreIcon = moreIcon;
  const moreIconNode = <MoreIcon aria-hidden className="size-5" />;
  const footer = (item: T) => renderFooter?.(item);

  return (
    <>
      {/* tablet + desktop · 4 columns, 2 per column */}
      <div className="hidden grid-cols-4 items-start gap-3 md:grid">
        {columns.map((column, c) => (
          <div key={c} className="flex flex-col gap-3">
            {column.map((item, r) => {
              const shape = COLUMN_SHAPES[c][r];
              const last = c === columns.length - 1 && r === column.length - 1;
              const index = wideShown.indexOf(item);
              return last && wideMore > 0 ? (
                <MoreOverlay key={item.id} href={viewAllHref} label={moreLabel} icon={moreIconNode}>
                  <span className={cn("relative block", shape)}>
                    <ProtectedImage src={item.thumb ?? item.src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  </span>
                </MoreOverlay>
              ) : (
                <Tile
                  key={item.id}
                  item={item}
                  className={shape}
                  onOpen={() => setLightbox({ list: wideShown, index })}
                  footer={footer(item)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* phones · bento: big 2×2 + 2 on the right, then a row of 3 */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {phoneShown.map((item, i) => {
          const last = i === phoneShown.length - 1;
          const cls = i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square";
          return last && phoneMore > 0 ? (
            <div key={item.id} className={cls}>
              <MoreOverlay href={viewAllHref} label={moreLabel} icon={moreIconNode}>
                <span className="relative block aspect-square">
                  <ProtectedImage src={item.thumb ?? item.src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                </span>
              </MoreOverlay>
            </div>
          ) : (
            <Tile
              key={item.id}
              item={item}
              className={cls}
              onOpen={() => setLightbox({ list: phoneShown, index: i })}
              footer={i === 0 ? footer(item) : null}
            />
          );
        })}
      </div>

      <ImageLightbox
        items={lightboxItems}
        activeIndex={lightbox?.index ?? null}
        onActiveIndexChange={(index) => setLightbox((prev) => (index === null || !prev ? null : { ...prev, index }))}
        useProtectedImage
        counterLabel={counterLabel}
      />
    </>
  );
}

/* ── fan-art upload banner ───────────────────────────────────────── */

function FanArtSubmit() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-[linear-gradient(120deg,color-mix(in_srgb,var(--r-pri)_16%,transparent),color-mix(in_srgb,var(--r-text-2)_5%,transparent))] p-4 ring-[1.5px] ring-r-pri/32 ring-inset sm:gap-4 sm:px-[18px]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-r-pri/18 text-r-pri">
        <Upload aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.96875rem] text-r-text">ส่งแฟนอาร์ตถึงมายด์</p>
        <p className="mt-[3px] text-[0.78125rem] text-r-text-3">
          ครั้งละไม่เกิน {FANART_LIMITS.maxFiles} รูป · ใส่เครดิตได้ · อนุมัติแล้วขึ้นที่นี่
        </p>
      </div>
      <Link
        href="/fanart/upload"
        className="inline-flex h-10 shrink-0 items-center rounded-full bg-r-pri px-[18px] text-sm text-r-on-pri transition-colors hover:bg-r-pri-hover active:bg-r-pri-active focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-r-acc"
      >
        ส่งเลย
      </Link>
    </div>
  );
}

/* ── live covers ─────────────────────────────────────────────────── */

/** "21 Oct" (dates stay in English). */
function shortDate(ymd: string | null) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function CoverChips({ item, ownChannelLabel }: { item: LiveCoverItem; ownChannelLabel: string }) {
  return (
    <>
      <RChip className="max-w-full truncate">{item.isOwnChannel ? ownChannelLabel : item.channelLabel}</RChip>
      {item.isMember ? <RChip tone="pri">MEMBER</RChip> : null}
      {item.date ? <span className="text-xs text-r-text-3">{shortDate(item.date)}</span> : null}
    </>
  );
}

const COVER_FRAME = "relative block aspect-video overflow-hidden rounded-xl ring-1 ring-r-text-2/15";

function LiveCovers({ ownChannelLabel }: { ownChannelLabel: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const { covers, status, retry } = useLiveCovers(near, { kind: "latest", limit: COVER_COUNT + 1 });
  const [active, setActive] = useState<number | null>(null);
  const shownCovers = covers.slice(0, COVER_COUNT);
  const phoneBackdrop = covers[COVER_COUNT - 1] ?? null;
  const wideBackdrop = covers[COVER_COUNT] ?? null;

  // Load only when the block is about to scroll into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);


  return (
    <div ref={rootRef}>
      {status === "error" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-r-text-3">โหลดปกไลฟ์ไม่สำเร็จ</p>
          <button type="button" onClick={retry} className={cn(R_CTA_OUTLINE_CLASS, "h-10")}>
            ลองใหม่
          </button>
        </div>
      ) : status === "ready" && covers.length === 0 ? (
        <p className="text-sm text-r-text-3">ยังไม่มีปกไลฟ์</p>
      ) : (
        <ul className="grid grid-cols-2 items-start gap-2 md:grid-cols-5 md:gap-3.5">
          {status !== "ready"
            ? Array.from({ length: COVER_COUNT }, (_, i) => (
                <li key={i} className={cn(i === COVER_COUNT - 1 && "max-md:hidden")}>
                  <span className="block aspect-video animate-pulse rounded-xl bg-white/[0.05]" />
                </li>
              ))
            : shownCovers.map((cover, i) => (
                // phones show 3 covers + the "all covers" tile (2 × 2)
                <li key={cover.videoId} className={cn("min-w-0", i === COVER_COUNT - 1 && "max-md:hidden")}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`ดูปกไลฟ์ ${cover.title}`}
                    className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
                  >
                    <span className={cn(COVER_FRAME, "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--r-pri)_18%,var(--r-bg)),color-mix(in_srgb,var(--r-pri)_34%,var(--r-bg)))]")}>
                      <ProtectedImage
                        src={cover.thumbUrl}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="mt-2.5 hidden md:block">
                      <span className="line-clamp-2 text-[0.84375rem] leading-[1.45] text-r-text/90">{cover.title}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <CoverChips item={cover} ownChannelLabel={ownChannelLabel} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
          <li>
            <MoreOverlay href="/gallery/live" label="ปกไลฟ์ทั้งหมด" icon={<Radio aria-hidden className="size-5" />}>
              <span className={cn(COVER_FRAME, "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--r-pri)_10%,var(--r-bg)),color-mix(in_srgb,var(--r-pri)_20%,var(--r-bg)))]")}>
                {/* Backdrop = the next cover not shown in the row (4th on phones, 5th from tablet up),
                    softly blurred so its own title art does not fight the label. */}
                {phoneBackdrop ? (
                  <ProtectedImage src={phoneBackdrop.thumbUrl} alt="" loading="lazy" className="absolute inset-0 size-full scale-110 object-cover blur-[3px] md:hidden" />
                ) : null}
                {wideBackdrop ? (
                  <ProtectedImage src={wideBackdrop.thumbUrl} alt="" loading="lazy" className="absolute inset-0 hidden size-full scale-110 object-cover blur-[3px] md:block" />
                ) : null}
              </span>
            </MoreOverlay>
          </li>
        </ul>
      )}

      {/* Same viewer as /gallery/live: HD + every cover version + YouTube link. */}
      <LiveCoverLightbox covers={shownCovers} activeIndex={active} onActiveIndexChange={setActive} />
    </div>
  );
}

/* ── section ─────────────────────────────────────────────────────── */

const BLOCK = "py-[26px] [&+&]:border-t [&+&]:border-r-text-2/15";

/** Home · แกลเลอรี (project R · GWX1-d / GA7): Moments · fan art · live covers. */
export function Gallery({ data, fanArt }: GalleryProps) {
  const ownChannelLabel = data.basic.name.toUpperCase();
  const fanArtFirst = (item: FanArtItem) => (isFanArtItem(item) ? <ArtistTag item={item} /> : null);

  return (
    <Section id="gallery">
      <ScrollReveal>
        <SectionHeader
          eyebrow="Gallery"
          title="แกลเลอรี"
          description={<span className="text-r-text-3">ช่วงเวลาของมายด์ · แฟนอาร์ตจากฮันนี่ · ปกไลฟ์</span>}
        />
      </ScrollReveal>

      <div className="mt-5">
        <ScrollReveal className={BLOCK}>
          <BlockHeading icon={Images} title="ช่วงเวลาของมายด์" count={`${data.gallery.length} รูป`} />
          <div className="mt-4">
            <PictureBoard
              items={data.gallery}
              viewAllHref="/gallery/archive"
              moreLabel="รูปทั้งหมด"
              moreIcon={Images}
              counterLabel="Moments"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal className={BLOCK}>
          <span id="fan-art" aria-hidden className="block scroll-mt-28" />
          <BlockHeading icon={Palette} title="แฟนอาร์ต" count="จากฮันนี่" />
          <div className="mt-4">
            <FanArtSubmit />
            {fanArt.length > 0 ? (
              <div className="mt-3.5">
                <PictureBoard
                  items={fanArt}
                  viewAllHref="/gallery/fanart"
                  moreLabel="แฟนอาร์ตทั้งหมด"
                  moreIcon={Palette}
                  counterLabel="Fan art"
                  renderFooter={fanArtFirst}
                />
              </div>
            ) : (
              <p className="mt-3.5 text-sm text-r-text-3">ยังไม่มีแฟนอาร์ต</p>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal className={BLOCK}>
          <BlockHeading icon={Radio} title="ปกไลฟ์" count="ทุกไลฟ์" />
          <div className="mt-4">
            <LiveCovers ownChannelLabel={ownChannelLabel} />
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}
