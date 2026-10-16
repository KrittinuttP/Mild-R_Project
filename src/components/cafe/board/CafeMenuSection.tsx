"use client";

import Link from "next/link";

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
import { useNow } from "@/hooks/useNow";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isStandInCafeImage, visiblePrice } from "@/lib/cafe-board";
import { preorderIsListed } from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage, CafePromoSetItem } from "@/types/vtuber";

const LETTERS = ["A", "B", "C"] as const;

function SetCard({ item }: { item: CafePromoSetItem }) {
  const price = visiblePrice(item.priceLabel);
  const menu = (item.menu ?? []).map((line) => line.trim()).filter(Boolean);
  const gifts = (item.giveaways ?? []).map((line) => line.trim()).filter(Boolean);
  const highlight = Boolean(item.highlight);

  return (
    <Paper
      tilt={highlight ? -1 : 1.5}
      pin="set"
      motion="swing"
      className={cn(
        "flex h-full flex-col",
        highlight &&
          "shadow-[0_0_0_4px_var(--color-cafe-ground),0_0_0_7px_var(--color-cafe-gold),0_14px_26px_rgba(0,0,0,0.45)]"
      )}
    >
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
      {menu.length > 0 || gifts.length > 0 || highlight ? (
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {menu.length > 0 ? (
          <div>
            <p className={cn(THAI, "text-xs font-semibold text-cafe-ink-muted")}>ในเซตมี</p>
            <ul className="mt-1 space-y-1 text-sm text-cafe-ink-soft">
              {menu.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {gifts.length > 0 ? (
          <div>
            <p className={cn(THAI, "text-xs font-semibold text-cafe-ink-muted")}>ของแถม · Giveaway</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {gifts.map((line, index) => {
                const lastHighlight = highlight && index === gifts.length - 1;
                return (
                  <li
                    key={`${index}-${line}`}
                    className={cn(
                      "bg-cafe-gold-pale px-2 py-1 text-sm text-cafe-ink [clip-path:polygon(0_0,calc(100%-8px)_0,100%_50%,calc(100%-8px)_100%,0_100%)]",
                      lastHighlight && "bg-cafe-gold text-cafe-ink"
                    )}
                  >
                    {line}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {highlight ? (
          <p className={cn(THAI, "mt-auto text-base font-semibold text-cafe-forest")}>ได้มากที่สุด</p>
        ) : null}
      </div>
      ) : null}
    </Paper>
  );
}

type CafeMenuSectionProps = {
  cafe: CafePage;
  show: boolean;
  /** The pick-up day is the dispatch date, which has its own toggle. */
  showDispatch: boolean;
};

export function CafeMenuSection({ cafe, show, showDispatch }: CafeMenuSectionProps) {
  const menu = cafe.signatureMenu;
  const sets = cafe.promoSets;
  const preorder = cafe.preorder;
  const eventDay = cafe.dispatch.schedule.label;
  const priceReady = visiblePrice(preorder?.promo);
  const hidden = !show;
  const now = useNow(1000, Boolean(preorder?.endsAt));
  const preorderOpen = Boolean(preorder) && (now === null || preorderIsListed(preorder, now));

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
              const letter = LETTERS[index] ?? String(index + 1);
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
            <div id="sets" className="mt-16 scroll-mt-24">
              {sets.eyebrow ? <p className={LABEL}>{sets.eyebrow}</p> : null}
              <h3 data-motion="lens" className={cn(SERIF, "mt-1 text-3xl font-bold text-cafe-cream")}>
                {sets.title}
              </h3>
              {sets.note ? (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-cafe-text">
                  {sets.note}
                </p>
              ) : null}
              <div className="mt-8 grid items-stretch gap-5 min-[900px]:grid-cols-3">
                {sets.items.map((item) => (
                  <SetCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {preorder && preorderOpen ? (
            <div
              data-motion="rise"
              className="relative mt-12 grid overflow-hidden bg-cafe-cream text-cafe-ink shadow-[0_14px_26px_rgba(0,0,0,0.45)] md:grid-cols-[11rem_minmax(0,1fr)]"
            >
              <div className="flex items-center justify-center border-b border-dashed border-cafe-ink/40 bg-cafe-gold px-4 py-6 md:border-r md:border-b-0">
                <p className={cn(SERIF, "text-2xl font-bold tracking-[0.16em]")}>
                  PRE-ORDER
                </p>
              </div>
              <div className="px-5 py-5 sm:px-6">
                <p className={cn(SERIF, "text-[2.1rem] leading-tight font-bold")}>
                  {preorder.label}
                </p>
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
                      <p>วันเปิดจอง · {preorder.label}</p>
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
