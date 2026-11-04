import { WaxSeal } from "@/components/cafe/board/brass";
import { BoardSection, LABEL, SERIF, THAI } from "@/components/cafe/board/pieces";
import { cn } from "@/lib/utils";

/** Manila of the sealed folders. */
const MANILA = "bg-[linear-gradient(180deg,#ecdcab,#e6d3a0)]";
const TAB = "absolute top-0 flex h-6 items-center rounded-t-[5px] bg-[#e6d3a0] px-3.5 shadow-[0_-2px_3px_rgba(0,0,0,0.18)]";

/** Redaction bar: the folder name is blacked out. */
function Bar({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block h-3 bg-cafe-ink", className)} />;
}

/* Tab positions and bar widths of the four folders under the top one. */
const FOLDERS = [
  { tab: "left-6 max-sm:left-3.5", a: "w-[150px] max-sm:w-[90px]", b: "w-[90px] max-sm:w-[54px]" },
  { tab: "left-[200px] max-sm:left-[120px]", a: "w-[210px] max-sm:w-[126px]", b: "w-[60px] max-sm:w-9" },
  { tab: "left-[120px] max-sm:left-[60px]", a: "w-[120px] max-sm:w-[72px]", b: "w-[140px] max-sm:w-[84px]" },
  { tab: "left-[300px] max-sm:left-[170px]", a: "w-[180px] max-sm:w-[108px]", b: "w-[80px] max-sm:w-12" },
];

/**
 * Every content section still switched off in /cafe/settings, as one stack of
 * sealed folders. Says nothing about what is inside — no names, no count.
 * Sits just above the closing note, whatever is sealed.
 */
export function CafeSealedFiles() {
  return (
    <BoardSection id="sealed" className="mt-24">
      <div>
        <h2
          data-motion="lens"
          className={cn(SERIF, "text-[1.85rem] leading-[1.12] font-bold text-cafe-cream sm:text-[2.75rem]")}
        >
          Sealed Files
        </h2>
        <p className={cn(THAI, "mt-1.5 text-base leading-snug text-cafe-gold-soft sm:mt-2 sm:text-[19px]")}>
          แฟ้มที่ยังปิดผนึก
        </p>
        <div className="mt-3.5 h-px bg-cafe-gold/35 sm:mt-[18px]" />
      </div>

      <div data-motion="rise" className="mx-auto mt-7 max-w-[760px] sm:mt-9" aria-hidden>
        {FOLDERS.map((folder, index) => (
          <div key={index} className={cn("relative pt-[22px]", index > 0 && "-mt-3.5")} style={{ zIndex: index + 1 }}>
            <span className={cn(TAB, folder.tab)}>
              <Bar className="h-2 w-[46px] opacity-55 sm:w-[60px]" />
            </span>
            <div
              className={cn(
                MANILA,
                "flex h-[46px] items-center gap-3 rounded-[0_4px_4px_4px] px-4 shadow-[0_-1px_0_rgba(122,92,28,0.25),0_8px_14px_rgba(0,0,0,0.3)] sm:h-[54px] sm:px-6"
              )}
            >
              <Bar className={cn(folder.a, "opacity-80")} />
              <Bar className={cn(folder.b, "opacity-45")} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-[9] mx-auto -mt-3.5 max-w-[760px] pt-6">
        <span className={cn(TAB, "left-[110px] h-[26px] sm:left-[380px]")}>
          <span className={cn(LABEL, "text-[10.5px] text-cafe-wax sm:text-[10.5px]")}>Classified</span>
        </span>
        <div
          className={cn(
            MANILA,
            "flex flex-col items-center rounded px-5 pt-7 pb-[30px] text-center shadow-[0_-1px_0_rgba(122,92,28,0.25),0_18px_30px_rgba(0,0,0,0.45)] sm:px-10 sm:pt-10 sm:pb-11"
          )}
        >
          <WaxSeal top="" label="SEALED" turn={-8} className="size-[76px] sm:size-[92px] [&_text]:[font-size:13px] [&_text]:[letter-spacing:1px]" />
          <p className={cn(THAI, "mt-[18px] text-[19px] font-bold text-cafe-ink sm:mt-[22px] sm:text-[22px]")}>
            แฟ้มเหล่านี้ยังไม่ถึงเวลาเปิด
          </p>
          <p className={cn(THAI, "mt-2 text-sm leading-relaxed text-cafe-ink-soft sm:text-[15px]")}>
            อดใจรออีกนิดนะ เร็ว ๆ นี้ได้รู้กัน
          </p>
        </div>
      </div>
    </BoardSection>
  );
}
