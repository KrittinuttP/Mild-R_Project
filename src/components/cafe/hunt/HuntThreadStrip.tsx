import { CorkBoard, HAND, Pin, TYPE } from "@/components/cafe/board/pieces";
import type { CafeHuntItem } from "@/lib/cafe-hunt";
import type { HuntStamp } from "@/lib/cafe-hunt-storage";
import { cn } from "@/lib/utils";

const CARD_TILTS = [-4, 1.3, 2.7, -1.7, 1.3];
const STAMP_TURNS = [-12, 8, -6, -5, 10];
const NOTE_TILTS = [-0.6, 0.6, -0.4, 0.5, -0.5];

/** Small pushpin holding a card on the thread. */
function ThreadPin() {
  return (
    <span
      className="absolute top-0 size-3 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd0db,#e85a7a_55%,#a8323f)]"
      aria-hidden
    />
  );
}

type HuntThreadStripProps = {
  items: CafeHuntItem[];
  stamps: Record<string, HuntStamp>;
};

/**
 * Every piece as a small card on a red thread across the cork board, then a
 * note card with the clue for each piece still missing.
 */
export function HuntThreadStrip({ items, stamps }: HuntThreadStripProps) {
  const total = items.length;
  const missing = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !stamps[item.id]);
  const found = total - missing.length;

  return (
    <>
      <CorkBoard className="mt-[30px] px-2.5 pt-3.5 pb-[18px]">
        <div className="relative">
          <svg
            viewBox="0 0 330 20"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0 h-5 w-full overflow-visible"
            aria-hidden
          >
            <path
              d="M8 6 Q 90 16 166 6 T 322 6"
              className="fill-none stroke-[#e85a7a] stroke-[2.2]"
            />
          </svg>
          <ul
            aria-label={`ตราประทับ เก็บแล้ว ${found} จาก ${total} ชิ้น`}
            className="relative flex justify-between"
          >
            {items.map((item, index) => {
              const stamp = stamps[item.id];
              const label = String(index + 1).padStart(2, "0");
              return (
                <li key={item.id} className="relative flex flex-col items-center pt-3.5">
                  <ThreadPin />
                  <div
                    className="bg-[#f4ebe3] p-[5px] shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
                    style={{ transform: `rotate(${CARD_TILTS[index % CARD_TILTS.length]}deg)` }}
                  >
                    {stamp ? (
                      <span
                        className={cn(
                          TYPE,
                          "flex size-[46px] flex-col items-center justify-center rounded-full border-[3px] border-[#a8323f] font-bold text-[#a8323f] shadow-[inset_0_0_0_3px_#f4ebe3,inset_0_0_0_4px_#a8323f]"
                        )}
                        style={{ transform: `rotate(${STAMP_TURNS[index % STAMP_TURNS.length]}deg)` }}
                        aria-hidden
                      >
                        <span className="text-[8px] leading-none tracking-[0.1em]">FOUND</span>
                        <span className="mt-0.5 text-[15px] leading-none">{label}</span>
                      </span>
                    ) : (
                      <span
                        className={cn(
                          TYPE,
                          "flex size-[46px] items-center justify-center rounded-full border-2 border-dashed border-[#5c4636] text-[13px] font-bold text-[#8a7560]"
                        )}
                        aria-hidden
                      >
                        {label}
                      </span>
                    )}
                  </div>
                  <span className="sr-only">
                    หลักฐานชิ้นที่ {index + 1}: {stamp ? "เก็บแล้ว" : "ยังไม่พบ"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <p
          className={cn(TYPE, "mt-3.5 text-center text-xs tracking-[0.14em] text-[#f4ebe3]")}
          aria-hidden
        >
          FOUND {found} · MISSING {missing.length}
        </p>
      </CorkBoard>

      {missing.length > 0 ? (
        <section aria-labelledby="hunt-missing-title" className="mt-[22px]">
          <h2
            id="hunt-missing-title"
            className={cn(HAND, "text-xl text-[#f4ebe3]")}
          >
            ยังต้องตามหาอีก {missing.length} ชิ้น
          </h2>
          <ul className="mt-3 flex flex-col gap-3.5">
            {missing.map(({ item, index }, order) => (
              <li
                key={item.id}
                className="relative flex items-center gap-3.5 bg-[#f4ebe3] p-3.5 text-[#1a1410] shadow-[0_10px_20px_rgba(0,0,0,0.45)]"
                style={{ transform: `rotate(${NOTE_TILTS[order % NOTE_TILTS.length]}deg)` }}
              >
                <Pin />
                <span
                  className={cn(
                    TYPE,
                    "flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#5c4636] text-base font-bold text-[#8a7560]"
                  )}
                  aria-hidden
                >
                  ?
                </span>
                <div className="min-w-0">
                  <p className={cn(TYPE, "text-xs tracking-[0.14em] text-[#5c4636]")}>
                    EX. {String(index + 1).padStart(2, "0")} · ยังไม่พบ
                  </p>
                  <p className={cn(HAND, "mt-1 text-[17px] leading-[1.4] break-words text-[#7a1f2a]")}>
                    {item.hint ? `คำใบ้: ${item.hint}` : "สแกน QR ของจุดนี้เพื่อเก็บ"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
