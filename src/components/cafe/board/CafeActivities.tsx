import { useState } from "react";

import { CafeTopSecret } from "@/components/cafe/CafeTopSecret";
import {
  BoardSection,
  CorkBoard,
  EmptyFrame,
  HAND,
  Paper,
  SectionHead,
  SERIF,
  Stamp,
  TYPE,
} from "@/components/cafe/board/pieces";
import type { ImageLightboxItem } from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isCafeMission, isStandInCafeImage } from "@/lib/cafe-board";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

const NOTE_TONE = ["paper", "pink", "paper", "mint", "paper", "pink"] as const;
const MISSION_TILT = [-2, 1.5, -1, 2] as const;

/** The thread and the high/low stagger assume one row; `lg:grid-cols-4` holds four. */
const MISSIONS_PER_ROW = 4;

type OpenPlate = (items: ImageLightboxItem[], index: number, group: string) => void;

type CafeActivitiesProps = {
  cafe: CafePage;
  showSchedule: boolean;
  showMissions: boolean;
  onOpen: OpenPlate;
};

/** Polaroid photo of a mission; falls back to an empty frame when there is no usable file. */
function MissionPhoto({
  src,
  alt,
  label,
  onOpen,
}: {
  src?: string;
  alt: string;
  label: string;
  onOpen?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const tag = (
    <span
      className={cn(
        TYPE,
        "absolute bottom-2 left-2 bg-[#f4ebe3] px-2 pt-[3px] pb-px text-xs font-bold tracking-[0.14em] text-[#a8323f] uppercase"
      )}
    >
      {label}
    </span>
  );

  if (!src || failed || !onOpen) {
    return (
      <div className="relative">
        <EmptyFrame className="aspect-[4/3] w-full" />
        {tag}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`ดูรูป: ${alt}`}
      className="group/photo relative block w-full cursor-zoom-in"
    >
      <ProtectedImage
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        wrapClassName="block aspect-[4/3] w-full overflow-hidden"
        className="aspect-[4/3] h-full w-full object-cover grayscale-[.45] transition duration-300 group-hover/photo:grayscale-0"
      />
      {tag}
    </button>
  );
}

export function CafeActivities({
  cafe,
  showSchedule,
  showMissions,
  onOpen,
}: CafeActivitiesProps) {
  const schedule = cafe.daySchedule;
  const missions = (cafe.operations?.groups ?? [])
    .flatMap((group) => group.items)
    .filter(isCafeMission);
  // Missions with a real photo, in board order — the lightbox pages through these.
  const plates: ImageLightboxItem[] = missions
    .filter((item) => item.image && !isStandInCafeImage(item.image, item.imageAlt))
    .map((item) => ({
      id: item.id,
      src: item.image as string,
      alt: item.imageAlt ?? item.nameLocal ?? item.name,
      caption: item.caption,
    }));
  const strung = missions.length <= MISSIONS_PER_ROW;

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
        <CorkBoard className="mt-14 px-4 pt-6 pb-9 sm:px-7 sm:pt-7 sm:pb-11">
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5">
            <h3
              className={cn(
                HAND,
                "-rotate-[1.5deg] bg-[#f4ebe3] px-3.5 pt-2 pb-1.5 text-[26px] leading-snug font-normal text-[#7a1f2a] shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
              )}
            >
              ภารกิจที่ร่วมได้ในงาน
            </h3>
            <Stamp className="rotate-3 bg-[#f4ebe3]/90 text-[13px]">
              {missions.length} Missions Open
            </Stamp>
          </div>

          <ul className="mt-10 grid items-start gap-x-[22px] gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {missions.map((item, index) => {
              const label = `Mission ${String(index + 1).padStart(2, "0")}`;
              const alt = item.imageAlt ?? item.nameLocal ?? item.name;
              const plateIndex = plates.findIndex((plate) => plate.id === item.id);
              // Every second card hangs lower, so the thread zigzags pin to pin.
              const low = strung && index % 2 === 1;
              const threadOn = strung && index < missions.length - 1;
              return (
                <li key={item.id} className={cn("relative", low && "lg:mt-9")}>
                  {threadOn ? (
                    <svg
                      viewBox="0 0 100 36"
                      preserveAspectRatio="none"
                      className={cn(
                        "pointer-events-none absolute left-1/2 z-[2] hidden h-9 w-[calc(100%+22px)] overflow-visible lg:block",
                        low ? "-top-9" : "top-0"
                      )}
                      aria-hidden
                    >
                      <path
                        d={low ? "M0 36 L100 0" : "M0 0 L100 36"}
                        vectorEffect="non-scaling-stroke"
                        fill="none"
                        stroke="#e85a7a"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        style={{ filter: "drop-shadow(0 0 3px rgba(232,90,122,.85))" }}
                      />
                    </svg>
                  ) : null}
                  <Paper
                    pin={item.id}
                    tilt={MISSION_TILT[index % MISSION_TILT.length]}
                    motion="drop"
                    className="p-3 pb-[18px]"
                  >
                    <MissionPhoto
                      src={plateIndex >= 0 ? item.image : undefined}
                      alt={alt}
                      label={label}
                      onOpen={
                        plateIndex >= 0
                          ? () => onOpen(plates, plateIndex, "Missions")
                          : undefined
                      }
                    />
                    {item.nameLocal ? (
                      <p className={cn(HAND, "mt-3 text-[23px] leading-tight text-[#7a1f2a]")}>
                        {item.nameLocal}
                      </p>
                    ) : null}
                    <h4 className={cn(TYPE, "mt-0.5 text-sm font-bold")}>{item.name}</h4>
                    {item.detail ? (
                      <p className="mt-2 text-sm leading-relaxed text-[#3d3024]">{item.detail}</p>
                    ) : null}
                  </Paper>
                </li>
              );
            })}
          </ul>
        </CorkBoard>
      ) : missions.length > 0 ? (
        <div className="mt-10">
          <CafeTopSecret titleLocal="ภารกิจในงาน · ยังไม่เปิดเผย" />
        </div>
      ) : null}
    </BoardSection>
  );
}
