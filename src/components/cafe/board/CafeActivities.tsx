import { useState } from "react";
import Link from "next/link";

import {
  BoardSection,
  CorkBoard,
  EmptyFrame,
  LABEL,
  Paper,
  SealedZone,
  SectionHead,
  SERIF,
  Stamp,
  THAI,
} from "@/components/cafe/board/pieces";
import { GOLD_BUTTON } from "@/components/cafe/board/brass";
import type { ImageLightboxItem } from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { isCafeMission, isStandInCafeImage } from "@/lib/cafe-board";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

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
  const empty = !src || failed || !onOpen;
  const tag = (
    <span
      className={cn(
        LABEL,
        "absolute left-2 bg-cafe-cream px-2 pt-[3px] pb-px text-[10px] text-cafe-gold-deep sm:text-[10px]",
        // On an empty slot the "Evidence pending" note sits low; keep the tag clear of it.
        empty ? "top-2" : "bottom-2"
      )}
    >
      {label}
    </span>
  );

  if (empty) {
    return (
      <div className="relative">
        <EmptyFrame pending className="aspect-[4/3] w-full" />
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
      {schedule && showSchedule ? (
        <SectionHead
          eyebrow={schedule.eyebrow}
          title={schedule.title}
          titleLocal={schedule.titleLocal}
          stamp={schedule.stamp ?? `${schedule.items.length} Entries`}
        />
      ) : null}

      {schedule && !showSchedule ? <SealedZone /> : null}

      {schedule && showSchedule ? (
        <ol className="relative mt-12">
          <span
            data-motion="tl-line"
            className="absolute top-0 bottom-0 left-3 w-[2.4px] -translate-x-1/2 bg-cafe-gold shadow-[0_0_8px_rgba(201,161,74,0.8)] min-[900px]:left-1/2"
            aria-hidden
          />
          {schedule.items.map((item, index) => {
            const onLeft = index % 2 === 0;
            return (
              <li
                key={`${index}-${item.time}-${item.title}`}
                data-motion="tl-item"
                data-side={onLeft ? "left" : "right"}
                className="relative py-3"
              >
                <span
                  data-tl-node
                  className="absolute top-8 left-3 size-4 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#f6e4a8,#c9a14a_55%,#7a5c1c)] shadow-[0_0_12px_rgba(201,161,74,0.8)] min-[900px]:left-1/2"
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
                <Paper
                  tilt={onLeft ? -1 : 1}
                  className={cn(
                    "px-4 py-4",
                    item.highlight && "border-l-[3px] border-cafe-gold"
                  )}
                >
                  {item.highlight ? (
                    <span
                      data-tl-seal
                      className={cn(
                        LABEL,
                        "absolute top-3 right-3 rotate-[4deg] border-[1.5px] border-cafe-wax px-1.5 pt-[3px] pb-px text-[9px] text-cafe-wax sm:text-[9px]"
                      )}
                    >
                      Key event
                    </span>
                  ) : null}
                  <p className="flex items-baseline gap-3">
                    <span className={cn(SERIF, "text-[28px] leading-none font-bold")}>{item.time}</span>
                    <span className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
                      Entry {String(index + 1).padStart(2, "0")}
                    </span>
                  </p>
                  <h3 className={cn(SERIF, "mt-2.5 text-base font-bold")}>{item.title}</h3>
                  {item.titleLocal ? (
                    <p className={cn(THAI, "mt-1 text-lg font-semibold text-cafe-forest")}>
                      {item.titleLocal}
                    </p>
                  ) : null}
                  {item.detail ? (
                    <p className="mt-2 text-sm leading-relaxed text-cafe-ink-soft">{item.detail}</p>
                  ) : null}
                </Paper>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {missions.length > 0 && !showMissions ? <SealedZone /> : null}

      {missions.length > 0 && showMissions ? (
        <CorkBoard className="mt-14 px-4 pt-6 pb-9 sm:px-7 sm:pt-7 sm:pb-11">
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
            <div>
              <p className={cn(LABEL, "flex items-center gap-2.5")}>
                <span className="size-1.5 rotate-45 bg-cafe-gold" aria-hidden />
                Field assignments
              </p>
              <h3
                data-motion="lens"
                className={cn(THAI, "mt-2 text-2xl leading-snug font-bold text-cafe-cream sm:text-3xl")}
              >
                ภารกิจที่ร่วมได้ในงาน
              </h3>
            </div>
            <Stamp tone="wall" className="-rotate-2" motion="stamp">
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
                      data-motion="thread"
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
                        stroke="#c9a14a"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        style={{ filter: "drop-shadow(0 0 3px rgba(201,161,74,.85))" }}
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
                      <p className={cn(THAI, "mt-3 text-xl leading-snug font-bold text-cafe-forest")}>
                        {item.nameLocal}
                      </p>
                    ) : null}
                    <h4 className={cn(LABEL, "mt-1 text-[10px] text-cafe-ink-muted sm:text-[10px]")}>
                      {item.name}
                    </h4>
                    {item.detail ? (
                      <p className="mt-2 text-sm leading-relaxed text-cafe-ink-soft">{item.detail}</p>
                    ) : null}
                    {item.link ? (
                      <Link
                        href={item.link.href}
                        className={cn(GOLD_BUTTON, "mt-3 min-h-11 px-3 text-center text-sm")}
                      >
                        {item.link.label}
                      </Link>
                    ) : null}
                  </Paper>
                </li>
              );
            })}
          </ul>
        </CorkBoard>
      ) : null}
    </BoardSection>
  );
}
