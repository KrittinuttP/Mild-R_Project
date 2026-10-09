import { CafeTopSecret } from "@/components/cafe/CafeTopSecret";
import {
  BoardSection,
  HAND,
  Paper,
  SectionHead,
  SERIF,
  TYPE,
} from "@/components/cafe/board/pieces";
import { isCafeMission } from "@/lib/cafe-board";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

const NOTE_TONE = ["paper", "pink", "paper", "mint", "paper", "pink"] as const;

type CafeActivitiesProps = {
  cafe: CafePage;
  showSchedule: boolean;
  showMissions: boolean;
};

export function CafeActivities({
  cafe,
  showSchedule,
  showMissions,
}: CafeActivitiesProps) {
  const schedule = cafe.daySchedule;
  const missions = (cafe.operations?.groups ?? [])
    .flatMap((group) => group.items)
    .filter(isCafeMission);

  if (!schedule && missions.length === 0) return null;

  return (
    <BoardSection id="activities" className="mt-24" width="1080">
      {schedule ? (
        <SectionHead
          align="center"
          eyebrow={schedule.eyebrow}
          title={schedule.title}
          titleLocal={schedule.titleLocal}
        />
      ) : null}

      {showSchedule && schedule ? (
        <ol className="relative mt-12">
          <span
            data-motion="tl-line"
            className="absolute top-0 bottom-0 left-3 w-[2.4px] -translate-x-1/2 bg-[#e85a7a] shadow-[0_0_8px_rgba(232,90,122,0.8)] min-[900px]:left-1/2"
            aria-hidden
          />
          {schedule.items.map((item, index) => {
            const tone = NOTE_TONE[index % NOTE_TONE.length];
            const onLeft = index % 2 === 0;
            return (
              <li
                key={`${item.time}-${item.title}`}
                data-motion="tl-item"
                data-side={onLeft ? "left" : "right"}
                className="relative py-3"
              >
                <span
                  data-tl-node
                  className="absolute top-8 left-3 size-4 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd0db,#e85a7a_55%,#a8323f)] shadow-[0_0_12px_rgba(232,90,122,0.8)] min-[900px]:left-1/2"
                  aria-hidden
                />
                <div
                  data-tl-note
                  className={cn(
                    "pl-10 min-[900px]:w-[calc(50%-2.5rem)] min-[900px]:pl-0",
                    onLeft
                      ? "min-[900px]:mr-auto min-[900px]:pr-6"
                      : "min-[900px]:ml-auto min-[900px]:pl-6"
                  )}
                >
                <Paper tilt={onLeft ? -1.5 : 1.5} tone={tone} className="px-4 py-4">
                  <p className={cn(SERIF, "text-[30px] leading-none")}>{item.time}</p>
                  <p className={cn(TYPE, "mt-2 text-xs tracking-[0.14em] uppercase")}>
                    Entry {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className={cn(TYPE, "mt-2 text-base font-bold")}>{item.title}</h3>
                  {item.titleLocal ? (
                    <p className={cn(HAND, "mt-1 text-xl")}>{item.titleLocal}</p>
                  ) : null}
                  {item.detail ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#3d3024]">
                      {item.detail}
                    </p>
                  ) : null}
                </Paper>
                </div>
              </li>
            );
          })}
        </ol>
      ) : schedule ? (
        <div className="mt-10">
          <CafeTopSecret titleLocal="บันทึกลำดับเหตุการณ์ · ยังไม่เปิดเผย" />
        </div>
      ) : null}

      {showMissions && missions.length > 0 ? (
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {missions.map((item) => (
            <Paper
              key={item.id}
              pin={item.id}
              tilt={-0.4}
              motion="drop"
              className="px-4 py-5"
            >
              {item.caption ? (
                <p
                  className={cn(
                    TYPE,
                    "mb-2 text-[0.65rem] tracking-[0.14em] text-[#5c4636] uppercase"
                  )}
                >
                  {item.caption}
                </p>
              ) : null}
              <h3 className={cn(TYPE, "text-base font-bold")}>{item.name}</h3>
              {item.nameLocal ? (
                <p className={cn(HAND, "mt-1 text-lg text-[#7a1f2a]")}>{item.nameLocal}</p>
              ) : null}
              {item.detail ? (
                <p className="mt-2 text-sm leading-relaxed text-[#3d3024]">{item.detail}</p>
              ) : null}
            </Paper>
          ))}
        </div>
      ) : missions.length > 0 ? (
        <div className="mt-10">
          <CafeTopSecret titleLocal="ภารกิจในงาน · ยังไม่เปิดเผย" />
        </div>
      ) : null}
    </BoardSection>
  );
}
