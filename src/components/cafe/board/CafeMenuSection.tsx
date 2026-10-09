import Link from "next/link";

import { CafeTopSecret } from "@/components/cafe/CafeTopSecret";
import {
  BoardSection,
  EmptyFrame,
  HAND,
  LABEL,
  Paper,
  SectionHead,
  TYPE,
} from "@/components/cafe/board/pieces";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isStandInCafeImage, visiblePrice } from "@/lib/cafe-board";
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
        "flex flex-col",
        highlight &&
          "shadow-[0_0_0_4px_#0a0c0e,0_0_0_7px_#f2c230,0_14px_26px_rgba(0,0,0,0.45)]"
      )}
    >
      <header
        className={cn(
          TYPE,
          "flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold tracking-[0.14em]",
          highlight ? "bg-[#1a1410] text-[#f2c230]" : "bg-[#7a1f2a] text-[#f4ebe3]"
        )}
      >
        <span>{item.name}</span>
        {price ? <span>{price}</span> : null}
      </header>
      {menu.length > 0 || gifts.length > 0 || highlight ? (
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {menu.length > 0 ? (
          <div>
            <p className={cn(TYPE, "text-[0.65rem] tracking-[0.14em] text-[#5c4636] uppercase")}>
              ในเซตมี
            </p>
            <ul className="mt-1 space-y-1 text-sm text-[#3d3024]">
              {menu.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {gifts.length > 0 ? (
          <div>
            <p className={cn(TYPE, "text-[0.65rem] tracking-[0.14em] text-[#5c4636] uppercase")}>
              ของแถม · Giveaway
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {gifts.map((line, index) => {
                const lastHighlight = highlight && index === gifts.length - 1;
                return (
                  <li
                    key={line}
                    className={cn(
                      "bg-[#b9e6e1] px-2 py-1 text-sm text-[#0f4f55] [clip-path:polygon(0_0,calc(100%-8px)_0,100%_50%,calc(100%-8px)_100%,0_100%)]",
                      lastHighlight && "bg-[#f2c230] text-[#1a1410]"
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
          <p className={cn(HAND, "mt-auto text-lg text-[#7a1f2a]")}>ได้มากที่สุด</p>
        ) : null}
      </div>
      ) : null}
    </Paper>
  );
}

type CafeMenuSectionProps = {
  cafe: CafePage;
  show: boolean;
};

export function CafeMenuSection({ cafe, show }: CafeMenuSectionProps) {
  const menu = cafe.signatureMenu;
  const sets = cafe.promoSets;
  const preorder = cafe.preorder;
  const eventDay = cafe.dispatch.schedule.label;
  const priceReady = visiblePrice(preorder?.promo);

  return (
    <BoardSection id="menu" className="mt-24">
      {show ? (
        <div>
          <SectionHead
            eyebrow={menu.eyebrow}
            title={menu.title}
            titleLocal={menu.titleLocal}
            stamp={menu.stamp}
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {menu.items.map((item, index) => {
              const letter = LETTERS[index] ?? String(index + 1);
              const price = visiblePrice(item.priceLabel);
              const standIn = isStandInCafeImage(item.image, item.imageAlt);
              return (
                // Sway lives on the wrapper: the bag itself is tweened by GSAP,
                // and the two must not share one element's transform.
                <div
                  key={item.id}
                  className="animate-cafe-sway origin-top hover:[animation-play-state:paused]"
                  style={{ animationDelay: `${index * -1.6}s` }}
                >
                <Paper
                  pin={`ex-${item.id}`}
                  tilt={index === 1 ? -2 : 2}
                  motion="swing"
                  className="rounded-b-2xl"
                >
                  <header
                    className={cn(
                      TYPE,
                      "flex items-center justify-between bg-[#7a1f2a] px-3 py-2 text-xs font-bold tracking-[0.14em] text-[#f4ebe3]"
                    )}
                  >
                    <span>EVIDENCE</span>
                    <span>EX. {letter}</span>
                  </header>
                  {standIn ? (
                    <EmptyFrame letter={letter} className="aspect-[4/3]" />
                  ) : (
                    <ProtectedImage
                      src={item.image}
                      alt={item.imageAlt ?? item.name}
                      wrapClassName="block aspect-[4/3] w-full overflow-hidden"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  )}
                  <div className="px-4 py-4">
                    <h3 className={cn(TYPE, "text-lg font-bold")}>{item.name}</h3>
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
                    {price ? (
                      <p className={cn(TYPE, "mt-3 text-xs tracking-[0.14em] uppercase")}>
                        PRICE: {price}
                      </p>
                    ) : null}
                  </div>
                </Paper>
                </div>
              );
            })}
          </div>

          {sets ? (
            <div id="sets" className="mt-16 scroll-mt-24">
              {sets.eyebrow ? <p className={LABEL}>{sets.eyebrow}</p> : null}
              <h3 className="mt-1 font-[family-name:var(--font-cafe-serif)] text-3xl text-[#f4ebe3]">
                {sets.title}
              </h3>
              {sets.note ? (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#d8d0c4]">
                  {sets.note}
                </p>
              ) : null}
              <div className="mt-8 grid items-start gap-5 min-[900px]:grid-cols-[1fr_1fr_1.35fr]">
                {sets.items.map((item) => (
                  <SetCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {preorder ? (
            <div
              data-motion="rise"
              className="mt-12 grid overflow-hidden bg-[#f4ebe3] text-[#1a1410] shadow-[0_14px_26px_rgba(0,0,0,0.45)] md:grid-cols-[11rem_minmax(0,1fr)]"
            >
              <div className="flex items-center justify-center border-b border-dashed border-[#1a1410]/40 bg-[#f2c230] px-4 py-6 md:border-r md:border-b-0">
                <p className={cn(TYPE, "text-2xl font-bold tracking-[0.14em]")}>
                  PRE-ORDER
                </p>
              </div>
              <div className="px-5 py-5 sm:px-6">
                <p className="font-[family-name:var(--font-cafe-serif)] text-[2.1rem] leading-none">
                  {preorder.label}
                </p>
                {preorder.tentative ? (
                  <p className={cn(HAND, "mt-2 text-lg text-[#7a1f2a]")}>
                    กำหนดการโดยประมาณ — รอประกาศยืนยัน
                  </p>
                ) : null}
                {preorder.detail ? (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#3d3024]">
                    {preorder.detail}
                  </p>
                ) : null}
                {priceReady ? (
                  <p className="mt-3 inline-block bg-[#f2c230] px-2 py-1 text-sm font-semibold">
                    {priceReady}
                  </p>
                ) : null}
                {preorder.url ? (
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-[#1a1410]/15 pt-4">
                    <div className={cn(TYPE, "space-y-1 text-xs tracking-[0.08em] uppercase")}>
                      <p>วันเปิดจอง · {preorder.label}</p>
                      {eventDay ? <p>วันรับของหน้างาน · {eventDay}</p> : null}
                    </div>
                    <Link
                      href={preorder.url}
                      target={preorder.url.startsWith("http") ? "_blank" : undefined}
                      rel={preorder.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="inline-flex min-h-11 items-center bg-[#f2c230] px-4 text-sm font-semibold text-[#1a1410] transition hover:-translate-y-0.5"
                    >
                      จองล่วงหน้า
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div id="sets">
          <CafeTopSecret titleLocal="แฟ้มรายการเสบียงนักสืบ · ยังไม่เปิดเผย" />
        </div>
      )}
    </BoardSection>
  );
}
