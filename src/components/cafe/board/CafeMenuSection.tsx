"use client";

import Link from "next/link";
import { Tabs } from "@base-ui/react/tabs";

import {
  BoardSection,
  Classified,
  EmptyFrame,
  LABEL,
  Paper,
  SealedZone,
  SectionHead,
  SERIF,
  THAI,
} from "@/components/cafe/board/pieces";
import { GOLD_BUTTON } from "@/components/cafe/board/brass";
import { PreorderCountdown } from "@/components/cafe/board/PreorderCountdown";
import { useNow } from "@/hooks/useNow";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isStandInCafeImage, setLetter, visiblePrice } from "@/lib/cafe-board";
import { preorderIsListed } from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage, CafePromoSetItem } from "@/types/vtuber";

type GiftRow = { name: string; qty?: number };

function giftRows(item: CafePromoSetItem): GiftRow[] {
  const gifts = (item.gifts ?? []).filter((gift) => gift.name.trim());
  if (gifts.length > 0) return gifts;
  return (item.giveaways ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

/** One list box inside a set card: menu (cream) or giveaways (gold). */
function SetListBox({
  title,
  rows,
  tone,
  hidden = false,
}: {
  title: string;
  rows: GiftRow[];
  tone: "menu" | "gift";
  /** Giveaways not announced yet: the server sent filler, drawn as black bars. */
  hidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-cafe-gold-deep/30 px-3 pt-2.5 pb-3",
        tone === "gift" ? "bg-cafe-gold/15" : "bg-cafe-ink/5"
      )}
    >
      <p className="flex items-baseline justify-between gap-2 border-b border-cafe-gold-deep/30 pb-1.5">
        <span className={cn(THAI, "text-sm font-bold text-cafe-forest")}>{title}</span>
        <span className="text-xs text-cafe-ink-muted">{rows.length} รายการ</span>
      </p>
      <ul>
        {rows.map((row, index) => (
          <li
            key={`${index}-${row.name}`}
            className="flex items-baseline justify-between gap-2 border-b border-dotted border-cafe-ink/20 py-1.5"
          >
            <span className={cn(tone === "menu" ? SERIF : THAI, "text-sm leading-snug text-cafe-ink")}>
              <Classified hidden={hidden}>{row.name}</Classified>
            </span>
            {row.qty && !hidden ? (
              <span className={cn(SERIF, "shrink-0 text-sm font-bold")}>×{row.qty}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

type SetCta = { href: string; external: boolean } | null;

function SetCard({
  item,
  index,
  cta,
  giftsHidden,
  flat = false,
}: {
  item: CafePromoSetItem;
  index: number;
  cta: SetCta;
  giftsHidden: boolean;
  /** Inside the mobile tabs: no tilt, no pin, no scroll motion. */
  flat?: boolean;
}) {
  const price = visiblePrice(item.priceLabel);
  const menu = (item.menu ?? []).map((line) => line.trim()).filter(Boolean);
  const gifts = giftRows(item);
  const highlight = Boolean(item.highlight);
  const letter = setLetter(item.name, index);
  const standIn = !item.image || isStandInCafeImage(item.image, item.imageAlt);

  return (
    <Paper
      tilt={flat ? 0 : highlight ? -1 : 1.5}
      pin={flat ? undefined : "set"}
      motion={flat ? undefined : "swing"}
      className={cn(
        "flex h-full flex-col",
        highlight &&
          !flat &&
          "shadow-[0_0_0_4px_var(--color-cafe-ground),0_0_0_7px_var(--color-cafe-gold),0_14px_26px_rgba(0,0,0,0.45)]"
      )}
    >
      {flat ? null : (
        <header
          className={cn(
            SERIF,
            "flex items-center justify-between gap-3 px-4 pt-3 pb-2.5 text-sm font-bold tracking-[0.16em] uppercase",
            highlight ? "bg-cafe-ink text-cafe-gold" : "bg-cafe-forest text-cafe-cream"
          )}
        >
          <span>{item.name}</span>
          {price ? <span>{price}</span> : null}
        </header>
      )}
      {highlight ? (
        <span
          className={cn(
            THAI,
            "absolute right-3 z-[2] rotate-3 bg-cafe-wax px-2 py-1 text-xs font-semibold text-cafe-cream shadow-[0_4px_8px_rgba(0,0,0,0.35)]",
            flat ? "top-5" : "top-14"
          )}
        >
          ของแถมเยอะสุด
        </span>
      ) : null}
      <div className="px-3 pt-3">
        {standIn ? (
          <EmptyFrame pending className="aspect-[5/4] w-full" />
        ) : (
          <ProtectedImage
            src={item.image}
            alt={item.imageAlt ?? item.name}
            wrapClassName="block aspect-[5/4] w-full overflow-hidden"
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pt-3 pb-4">
        {menu.length > 0 ? (
          <SetListBox title="เมนูในเซต" rows={menu.map((name) => ({ name }))} tone="menu" />
        ) : null}
        {gifts.length > 0 ? <SetListBox title="ของแถม" rows={gifts} tone="gift" hidden={giftsHidden} /> : null}
      </div>
      {cta ? (
        <div className="border-t border-dashed border-cafe-ink/30 bg-cafe-ink/[0.07] px-3 pt-3 pb-3.5">
          <Link
            href={cta.href}
            target={cta.external ? "_blank" : undefined}
            rel={cta.external ? "noopener noreferrer" : undefined}
            className={cn(GOLD_BUTTON, "min-h-11 text-sm")}
          >
            จองเซต {letter}
          </Link>
        </div>
      ) : null}
    </Paper>
  );
}

/** Mobile: one set at a time. Each tab carries its price, so prices compare without switching. */
function SetTabs({
  items,
  cta,
  giftsHidden,
}: {
  items: CafePromoSetItem[];
  cta: SetCta;
  giftsHidden: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Tabs.Root defaultValue={items[0].id} className="mt-8 min-[900px]:hidden">
      <Tabs.List
        aria-label="เลือกเซต"
        className="flex border border-cafe-gold/50 bg-cafe-void/60"
      >
        {items.map((item, index) => (
          <Tabs.Tab
            key={item.id}
            value={item.id}
            className="min-h-14 flex-1 px-1 py-1.5 text-cafe-text transition data-[active]:bg-cafe-forest data-[active]:text-cafe-cream data-[active]:shadow-[inset_0_-3px_0_var(--color-cafe-gold)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cafe-cream"
          >
            <span className={cn(LABEL, "block text-[11px] sm:text-[11px]")}>
              {item.name || `Set ${setLetter(item.name, index)}`}
            </span>
            {visiblePrice(item.priceLabel) ? (
              <span className={cn(SERIF, "mt-0.5 block text-base font-bold")}>
                {visiblePrice(item.priceLabel)}
              </span>
            ) : null}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {items.map((item, index) => (
        <Tabs.Panel key={item.id} value={item.id} className="mt-4">
          <SetCard item={item} index={index} cta={cta} giftsHidden={giftsHidden} flat />
        </Tabs.Panel>
      ))}
      <p className="mt-3 text-center text-xs text-cafe-muted">แตะแท็บด้านบนเพื่อดูเซตอื่น</p>
    </Tabs.Root>
  );
}

const CLOSE_DAY = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
});
const CLOSE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const THAI_WEEKDAY: Record<string, string> = {
  Sun: "อา.",
  Mon: "จ.",
  Tue: "อ.",
  Wed: "พ.",
  Thu: "พฤ.",
  Fri: "ศ.",
  Sat: "ส.",
};
const DAY_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  year: "numeric",
});

/** "อา. 6 ธ.ค. 2026" (Bangkok, Gregorian year) for Thai sentences; labels use "06 DEC 2026". */
function thaiDay(iso?: string) {
  const at = iso ? Date.parse(iso) : Number.NaN;
  if (!Number.isFinite(at)) return null;
  const parts = DAY_PARTS.formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${THAI_WEEKDAY[part("weekday")] ?? ""} ${CLOSE_DAY.format(at)} ${part("year")}`.trim();
}

/** "ปิดรับจอง 30 พ.ย. 23:59 น." from `endsAt` (Bangkok time); the headline keeps dates only. */
function closingLine(endsAt?: string) {
  const ends = endsAt ? Date.parse(endsAt) : Number.NaN;
  if (!Number.isFinite(ends)) return null;
  return `ปิดรับจอง ${CLOSE_DAY.format(ends)} ${CLOSE_TIME.format(ends)} น.`;
}

type CafeMenuSectionProps = {
  cafe: CafePage;
  show: boolean;
  /** The pick-up day is the dispatch date, which has its own toggle. */
  showDispatch: boolean;
  /** Giveaways follow the goods (dossier) toggle, revealed after the menu. */
  showGifts: boolean;
};

export function CafeMenuSection({ cafe, show, showDispatch, showGifts }: CafeMenuSectionProps) {
  const menu = cafe.signatureMenu;
  const sets = cafe.promoSets;
  const preorder = cafe.preorder;
  const eventDay = thaiDay(cafe.dispatch.schedule.startsAt) ?? cafe.dispatch.schedule.label;
  const priceReady = visiblePrice(preorder?.promo);
  const hidden = !show;
  const now = useNow(1000, Boolean(preorder?.endsAt));
  const preorderOpen = Boolean(preorder) && (now === null || preorderIsListed(preorder, now));
  const setCta: SetCta = !preorder || !preorderOpen
    ? null
    : preorder.url
      ? { href: preorder.url, external: preorder.url.startsWith("http") }
      : { href: "#preorder", external: false };
  const hasDossier =
    showGifts && (cafe.goods?.items ?? []).some((item) => item.kind === "giveaway");

  return (
    <BoardSection id="menu" className="mt-24">
        <div>
          {hidden ? null : (
            <SectionHead
              eyebrow={menu.eyebrow}
              title={menu.title}
              titleLocal={menu.titleLocal}
              stamp={menu.stamp}
            />
          )}

          {hidden ? (
            <SealedZone id="sets" />
          ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {menu.items.map((item, index) => {
              const letter = String.fromCharCode(65 + index);
              const price = visiblePrice(item.priceLabel);
              const standIn = isStandInCafeImage(item.image, item.imageAlt);
              return (
                <Paper
                  key={item.id}
                  pin={`ex-${item.id}`}
                  plate
                  tilt={index === 1 ? -1.2 : 1.2}
                  motion="swing"
                  className="px-2.5 pt-2.5 pb-4"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-cafe-gold-deep/35 px-1 pt-1.5 pb-2">
                    <span className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
                      Exhibit {letter}
                    </span>
                    <span className={cn(LABEL, "text-[10px] text-cafe-ink-muted sm:text-[10px]")}>
                      Evidence ledger
                    </span>
                  </header>
                  {standIn ? (
                    <EmptyFrame pending className="mt-2.5 aspect-[4/3] w-full" />
                  ) : (
                    <ProtectedImage
                      src={item.image}
                      alt={item.imageAlt ?? item.name}
                      wrapClassName="mt-2.5 block aspect-[4/3] w-full overflow-hidden"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  )}
                  <div className="px-1.5 pt-3.5">
                    <h3 className={cn(SERIF, "text-lg leading-snug font-bold")}>{item.name}</h3>
                    {item.nameLocal ? (
                      <p className={cn(THAI, "mt-1 text-[17px] font-semibold text-cafe-forest")}>
                        {item.nameLocal}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-cafe-ink-soft">
                        {item.description}
                      </p>
                    ) : null}
                    {price ? (
                      <p className="mt-3 flex items-baseline justify-between border-t border-dashed border-cafe-ink/30 pt-2.5">
                        <span className={cn(LABEL, "text-[10px] text-cafe-ink-muted sm:text-[10px]")}>
                          Price
                        </span>
                        <span className={cn(SERIF, "text-xl font-bold")}>{price}</span>
                      </p>
                    ) : null}
                  </div>
                </Paper>
              );
            })}
          </div>
          )}

          {!hidden && sets ? (
            <div id="sets" className="mt-20 scroll-mt-24">
              <SectionHead
                eyebrow={sets.eyebrow}
                title={sets.title}
                titleLocal={sets.titleLocal}
                stamp={sets.stamp}
              />
              {sets.note || hasDossier ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cafe-text">
                  {sets.note}
                  {sets.note && hasDossier ? " · " : null}
                  {hasDossier ? (
                    <a href="#goods" className="font-semibold text-cafe-gold-soft underline underline-offset-4">
                      ดูรูปของแถมทั้งหมดใน แฟ้มรวบรวมเบาะแส ↓
                    </a>
                  ) : null}
                </p>
              ) : null}
              <div className="mt-8 hidden items-stretch gap-5 min-[900px]:grid min-[900px]:grid-cols-3">
                {sets.items.map((item, index) => (
                  <SetCard
                    key={item.id}
                    item={item}
                    index={index}
                    cta={setCta}
                    giftsHidden={!showGifts}
                  />
                ))}
              </div>
              <SetTabs items={sets.items} cta={setCta} giftsHidden={!showGifts} />
            </div>
          ) : null}

          {preorder && preorderOpen ? (
            <div
              id="preorder"
              data-motion="rise"
              className="relative mt-12 grid scroll-mt-24 overflow-hidden bg-cafe-cream text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)] md:grid-cols-[15rem_minmax(0,1fr)]"
            >
              <div className="flex items-center justify-center border-b border-dashed border-cafe-ink/40 bg-cafe-gold px-4 py-6 md:border-r md:border-b-0">
                <p className={cn(SERIF, "text-2xl font-bold tracking-[0.16em] whitespace-nowrap")}>
                  PRE-ORDER
                </p>
              </div>
              <div className="px-5 py-5 sm:px-6">
                <p className={cn(SERIF, "text-[1.7rem] leading-tight font-bold min-[400px]:text-[2.1rem]")}>
                  {preorder.label}
                </p>
                {preorder.endsAt ? (
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={cn(THAI, "text-sm font-semibold text-cafe-forest")}>
                      ปิดจองในอีก
                    </span>
                    <PreorderCountdown endsAt={preorder.endsAt} />
                  </p>
                ) : null}
                {closingLine(preorder.endsAt) ? (
                  <p className={cn(THAI, "mt-1.5 text-sm font-semibold text-cafe-ink-soft")}>
                    {closingLine(preorder.endsAt)}
                  </p>
                ) : null}
                {preorder.tentative ? (
                  <p className={cn(THAI, "mt-2 text-base font-semibold text-cafe-forest")}>
                    กำหนดการโดยประมาณ — รอประกาศยืนยัน
                  </p>
                ) : null}
                {preorder.detail ? (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cafe-ink-soft">
                    {preorder.detail}
                  </p>
                ) : null}
                {priceReady ? (
                  <p className="mt-3 inline-block bg-cafe-gold px-2 py-1 text-sm font-semibold">
                    {priceReady}
                  </p>
                ) : null}
                {preorder.url ? (
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-cafe-ink/15 pt-4">
                    <div className={cn(THAI, "space-y-1 text-sm text-cafe-ink-soft")}>
                      {eventDay ? (
                        <p>
                          วันรับของหน้างาน ·{" "}
                          <Classified hidden={!showDispatch}>{eventDay}</Classified>
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={preorder.url}
                      target={preorder.url.startsWith("http") ? "_blank" : undefined}
                      rel={preorder.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className={cn(GOLD_BUTTON, "inline-flex min-h-11 w-auto px-5 text-sm")}
                    >
                      จองล่วงหน้า
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
    </BoardSection>
  );
}
