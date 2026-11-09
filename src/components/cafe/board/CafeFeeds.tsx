"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Play } from "lucide-react";

import { KeyholePlate, WaxSeal } from "@/components/cafe/board/brass";
import { BoardSection, LABEL, SERIF, THAI, TILT, tiltStyle } from "@/components/cafe/board/pieces";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import {
  CAFE_X_HANDLE,
  CAFE_X_URL,
  CAFE_YOUTUBE_NAME,
  CAFE_YOUTUBE_URL,
  feedDate,
  feedDayMonth,
  sortNotices,
  sortTapes,
  tapeDuration,
  type CafeNotice,
  type CafeTape,
} from "@/lib/cafe-feeds";
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/** Cards before "ดูประกาศทั้งหมด": the latest big + 4 small (one full block, no gaps). */
const NOTICES_FIRST = 5;

const PAPER_SHADOW = "shadow-[0_14px_26px_rgba(0,0,0,0.45)]";
const LINE_LINK =
  "underline decoration-current/45 underline-offset-4 transition hover:decoration-current";
const WALL_BUTTON = cn(
  THAI,
  "inline-flex min-h-11 items-center justify-center gap-2 border border-cafe-gold/60 px-5 text-sm font-semibold text-cafe-cream transition hover:border-cafe-gold hover:bg-cafe-gold/10"
);
const NOTICE_TILTS = [0.8, -0.6, 0.5, -0.8, 0.6, -0.5];

/** Section head of the new layout: title + Thai line on the wall, a thin gold rule, no eyebrow. */
function FeedHead({ title, local, right }: { title: string; local: string; right?: ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2
            data-motion="lens"
            className={cn(SERIF, "text-[1.85rem] leading-[1.12] font-bold text-cafe-cream sm:text-[2.75rem]")}
          >
            {title}
          </h2>
          <p className={cn(THAI, "mt-1.5 text-base leading-snug text-cafe-gold-soft sm:mt-2 sm:text-[19px]")}>
            {local}
          </p>
        </div>
        {right ? <div className="hidden items-center gap-4 sm:flex">{right}</div> : null}
      </div>
      <div className="mt-3.5 h-px bg-cafe-gold/35 sm:mt-[18px]" />
    </div>
  );
}

/* ───────────────────────────── Dispatch Log ───────────────────────────── */

/** The whole picture, never cropped (post art carries text): contained over a blurred copy of itself. */
function ImageWell({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-cafe-felt shadow-[inset_0_0_0_1px_rgba(20,33,28,0.25)]", className)}>
      <ProtectedImage
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        referrerPolicy="no-referrer"
        wrapClassName="pointer-events-none absolute -inset-[12%] block"
        className="size-full object-cover opacity-40 blur-[22px] saturate-[.7]"
      />
      <ProtectedImage
        src={src}
        alt="รูปจากประกาศ"
        loading="lazy"
        referrerPolicy="no-referrer"
        wrapClassName="absolute inset-0 block"
        className="size-full object-contain"
      />
    </div>
  );
}

function NoticeCard({
  notice,
  big = false,
  tilt,
  motion,
}: {
  notice: CafeNotice;
  big?: boolean;
  tilt: number;
  motion?: string;
}) {
  const image = notice.mediaUrls[0];
  return (
    <a
      href={notice.url || CAFE_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-motion={motion}
      aria-label={`ประกาศ ${feedDate(notice.postedAt)} บน X`}
      className={cn(
        "relative flex h-full flex-col bg-cafe-cream text-cafe-ink",
        PAPER_SHADOW,
        TILT,
        big ? "p-3 pb-4 sm:p-3.5 sm:pb-5" : "p-2 pb-3 sm:p-2.5 sm:pb-4"
      )}
      style={tiltStyle(tilt)}
    >
      <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
      {notice.pinned ? (
        <WaxSeal
          top="PINNED"
          label="★"
          turn={-12}
          className={cn("absolute -top-3.5 -right-3 z-[2]", big ? "size-16" : "size-12")}
        />
      ) : null}
      {image ? (
        <ImageWell
          src={image}
          className={big ? "aspect-[4/3] lg:aspect-auto lg:min-h-[340px] lg:flex-1" : "aspect-square"}
        />
      ) : (
        <div
          className={cn(
            THAI,
            "flex items-center bg-cafe-cream-light p-4 leading-relaxed text-cafe-ink shadow-[inset_0_0_0_1px_rgba(122,92,28,0.25)]",
            big ? "aspect-[4/3] text-lg lg:aspect-auto lg:min-h-[340px] lg:flex-1" : "aspect-square text-[15px]"
          )}
        >
          <span className={cn("line-clamp-[7] whitespace-pre-line", !big && "line-clamp-6")}>{notice.text}</span>
        </div>
      )}
      <div className={big ? "px-1.5 pt-4" : "px-1 pt-2.5 sm:pt-3"}>
        <div className="flex items-center justify-between gap-2">
          <time
            dateTime={notice.postedAt}
            className={cn(SERIF, "font-bold text-cafe-gold-deep", big ? "text-sm" : "text-xs sm:text-[12.5px]")}
          >
            {big ? feedDate(notice.postedAt) : feedDayMonth(notice.postedAt)}
          </time>
          <SocialPlatformIcon platform="x" className="size-3 text-cafe-ink-muted" />
        </div>
        {image ? (
          <p
            className={cn(
              THAI,
              "mt-1.5 break-words leading-[1.65] text-cafe-ink",
              big ? "line-clamp-4 text-[15px] sm:text-base lg:line-clamp-6" : "line-clamp-3 text-[13.5px] sm:text-sm"
            )}
          >
            {notice.text.replace(/\s*\n+\s*/g, " ")}
          </p>
        ) : null}
        {big ? (
          <p className={cn(THAI, LINE_LINK, "mt-3 inline-flex items-center gap-1.5 text-sm text-cafe-gold-deep")}>
            อ่านโพสต์เต็มบน X
            <ExternalLink className="size-3.5" aria-hidden />
          </p>
        ) : null}
      </div>
    </a>
  );
}

export function CafeNoticeBoard({ notices }: { notices: CafeNotice[] }) {
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sorted = sortNotices(notices);
  if (sorted.length === 0) return null;

  const [lead, ...rest] = sorted;
  const total = sorted.length;
  const shown = expanded ? rest : rest.slice(0, NOTICES_FIRST - 1);

  const collapse = () => {
    setExpanded(false);
    const top = sectionRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <BoardSection id="notices" className="mt-20 sm:mt-24">
      <div ref={sectionRef} className="scroll-mt-24">
        <FeedHead
          title="Dispatch Log"
          local={`ประกาศจาก X @${CAFE_X_HANDLE}`}
          right={
            <>
              <span className={cn(THAI, "text-sm text-cafe-muted")}>{total} ประกาศ</span>
              <a
                href={CAFE_X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(THAI, LINE_LINK, "inline-flex items-center gap-1.5 text-sm text-cafe-gold-soft")}
              >
                ติดตามบน X
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </>
          }
        />
        {/* Phone/tablet: the latest across 2 columns, the rest 2 by 2.
            1024+: the latest 2×2 on the left, 4 small ones 2×2 beside it, more in rows of 4. */}
        <div className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-7 sm:mt-12 sm:gap-x-7 sm:gap-y-10 lg:grid-cols-4">
          <div className="col-span-2 lg:row-span-2">
            <NoticeCard notice={lead} big tilt={-0.5} motion="rise" />
          </div>
          {shown.map((notice, i) => (
            <div key={notice.id}>
              <NoticeCard
                notice={notice}
                tilt={NOTICE_TILTS[i % NOTICE_TILTS.length]}
                motion={i < NOTICES_FIRST - 1 ? "rise" : undefined}
              />
            </div>
          ))}
        </div>
        {total > NOTICES_FIRST ? (
          <div className="mt-9 text-center sm:mt-11">
            <button
              type="button"
              onClick={() => (expanded ? collapse() : setExpanded(true))}
              aria-expanded={expanded}
              className={WALL_BUTTON}
            >
              {expanded ? "ย่อกลับ" : `ดูประกาศทั้งหมด (${total})`}
              {expanded ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
            </button>
          </div>
        ) : null}
      </div>
    </BoardSection>
  );
}

/* ───────────────────────────── Case Footage ───────────────────────────── */

/** Rows of the tape log before "ดูอีก" below 1024px; from 1024 the whole log scrolls in its panel. */
const TAPES_FIRST = 3;
/** Rows each "ดูอีก" adds. */
const TAPES_STEP = 8;
/** Manila of the sealed folders: the row that is playing. */
const MANILA = "bg-[#e6d3a0]";

type TapeKind = "video" | "short";
const TAPE_KINDS: readonly TapeKind[] = ["video", "short"];
const KIND_LABEL: Record<TapeKind, string> = { video: "วิดีโอ", short: "Shorts" };

/** Film frame with sprocket holes along the top and bottom. */
function Film({ children }: { children: ReactNode }) {
  const row = (
    <div aria-hidden className="flex h-3 items-center px-1.5">
      <div className="h-1.5 flex-1 rounded-[2px] bg-[repeating-linear-gradient(90deg,rgba(241,230,207,0.8)_0_11px,transparent_11px_22px)]" />
    </div>
  );
  return (
    <div className="bg-[#0d1714] shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
      {row}
      <div className="relative px-2 sm:px-2.5">{children}</div>
      {row}
    </div>
  );
}

/** A clip's cover. Shorts covers carry the vertical frame in the middle, so a centred crop shows it. */
function TapeCover({ tape }: { tape: CafeTape }) {
  return (
    <ProtectedImage
      src={tape.thumbnailUrl ?? getYoutubeThumbnailUrl(tape.id)}
      alt=""
      loading="lazy"
      wrapClassName="absolute inset-0 block"
      className="size-full object-cover"
    />
  );
}

function PlayDisc({ size }: { size: "lg" | "sm" }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-cafe-deep/72 text-cafe-gold-soft shadow-[inset_0_0_0_2px_var(--color-cafe-gold)] transition group-hover:scale-110",
          size === "lg" ? "size-14 sm:size-[72px]" : "size-7"
        )}
      >
        <Play className={cn("translate-x-[1px] fill-current", size === "lg" ? "size-6 sm:size-7" : "size-3")} aria-hidden />
      </span>
    </span>
  );
}

function Duration({ tape, small }: { tape: CafeTape; small?: boolean }) {
  const duration = tapeDuration(tape.durationSeconds);
  if (!duration) return null;
  return (
    <span
      className={cn(
        SERIF,
        "absolute bg-cafe-deep/88 text-cafe-cream",
        small ? "right-1 bottom-1 px-1 text-[10.5px]" : "right-1.5 bottom-1.5 px-1.5 py-px text-[11.5px]"
      )}
    >
      {duration}
    </span>
  );
}

function TapeEmbed({ tape }: { tape: CafeTape }) {
  return (
    <iframe
      key={tape.id}
      src={getYoutubeEmbedUrl(tape.id, true)}
      title={tape.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className="absolute inset-0 size-full"
    />
  );
}

type StageProps = { tape: CafeTape; latest: boolean; playing: boolean; onPlay: () => void };

/** Videos: the film strip right on the felt, title over the picture, pinned at the top. */
function VideoWall({ tape, latest, playing, onPlay }: StageProps) {
  const duration = tapeDuration(tape.durationSeconds);
  return (
    <div className="relative lg:flex lg:h-full lg:items-center">
      <div className="relative w-full" style={{ transform: "rotate(-0.4deg)" }}>
        <KeyholePlate className="top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-[60%]" />
        <Film>
          {playing ? (
            <div className="relative aspect-video bg-black">
              <TapeEmbed tape={tape} />
            </div>
          ) : (
            <button type="button" onClick={onPlay} className="group block w-full text-left" aria-label={`เล่นคลิป ${tape.title}`}>
              <span className="relative block aspect-video overflow-hidden bg-cafe-deep">
                <TapeCover tape={tape} />
                <PlayDisc size="lg" />
                <span className={cn(LABEL, "absolute top-2.5 left-2.5 bg-cafe-deep/88 px-2 py-1 text-[10.5px] text-cafe-gold-soft sm:top-3.5 sm:left-3.5 sm:text-[10.5px]")}>
                  {latest ? "Latest footage" : "Footage"}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(10,31,26,0.92),transparent)] px-3.5 pt-12 pb-3 sm:px-5 sm:pb-4">
                  <span className={cn(SERIF, "line-clamp-2 text-base leading-snug font-bold text-cafe-cream sm:text-2xl")}>{tape.title}</span>
                  <span className={cn(SERIF, "mt-1 block text-[12px] text-cafe-muted sm:text-[13px]")}>
                    {feedDate(tape.publishedAt)}
                    {duration ? ` · ${duration}` : ""}
                  </span>
                </span>
              </span>
            </button>
          )}
        </Film>
      </div>
    </div>
  );
}

/** Shorts: a 9:16 phone frame with a gold edge (the home page's Shorts frame, in cafe colours), on the felt. */
function ShortWall({ tape, playing, onPlay }: StageProps) {
  return (
    <div className="flex items-center justify-center py-2 lg:h-full">
      <div className="relative aspect-[9/16] w-[min(220px,58vw)] overflow-hidden rounded-[20px] bg-black shadow-[0_0_0_2px_var(--color-cafe-gold),0_0_0_8px_#0d1714,0_0_0_9px_rgba(201,161,74,0.4),0_18px_30px_rgba(0,0,0,0.5)] sm:w-[260px] lg:w-[290px]">
        {playing ? (
          <TapeEmbed tape={tape} />
        ) : (
          <button type="button" onClick={onPlay} className="group absolute inset-0 block text-left" aria-label={`เล่นคลิป ${tape.title}`}>
            <TapeCover tape={tape} />
            <PlayDisc size="lg" />
            <span className={cn(LABEL, "absolute top-2.5 left-2.5 bg-cafe-deep/88 px-2 py-1 text-[10.5px] text-cafe-gold-soft sm:text-[10.5px]")}>
              Short
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(10,31,26,0.92),transparent)] px-3.5 pt-10 pb-3.5">
              <span className={cn(SERIF, "line-clamp-2 text-sm leading-snug font-bold text-cafe-cream")}>{tape.title}</span>
              <span className={cn(SERIF, "mt-0.5 block text-[11.5px] text-cafe-muted")}>{feedDate(tape.publishedAt)}</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function TapeRow({
  tape,
  kind,
  active,
  playing,
  onPlay,
  className,
}: {
  tape: CafeTape;
  kind: TapeKind;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  className?: string;
}) {
  return (
    <li className={className}>
      <button
        type="button"
        onClick={onPlay}
        aria-current={active ? "true" : undefined}
        className={cn(
          "grid w-full items-center gap-3 px-2 py-1.5 text-left transition sm:py-2",
          kind === "video" ? "grid-cols-[92px_1fr] sm:grid-cols-[128px_1fr]" : "grid-cols-[38px_1fr] sm:grid-cols-[56px_1fr]",
          active ? cn(MANILA, "shadow-[inset_3px_0_0_var(--color-cafe-gold-deep)]") : "hover:bg-cafe-ink/[0.05]"
        )}
      >
        <span
          className={cn(
            "relative block overflow-hidden bg-cafe-deep shadow-[0_0_0_1px_rgba(20,33,28,0.3),0_4px_8px_rgba(0,0,0,0.18)]",
            kind === "video" ? "aspect-video" : "aspect-[9/16]"
          )}
        >
          <TapeCover tape={tape} />
          <Duration tape={tape} small />
        </span>
        <span className="min-w-0">
          <span className={cn(SERIF, "line-clamp-1 text-[14px] leading-[1.4] font-bold sm:line-clamp-2 sm:text-[14.5px]")}>
            {tape.title}
          </span>
          <span className={cn(SERIF, "mt-0.5 block text-xs text-cafe-ink-muted")}>{feedDate(tape.publishedAt)}</span>
          {active && playing ? (
            <span className={cn(THAI, "mt-1 inline-block bg-cafe-ink px-1.5 text-[11.5px] font-bold text-cafe-gold-soft")}>
              กำลังเล่น
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * One tab of Case Footage: the clip playing (big) + the tape log. From 1024px the log
 * sits beside it, exactly as tall, and scrolls inside; below that it lists 3 and grows with "ดูอีก".
 */
function FootagePanel({
  kind,
  tapes,
  playing,
  onPlay,
}: {
  kind: TapeKind;
  tapes: CafeTape[];
  playing: boolean;
  onPlay: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shown, setShown] = useState(TAPES_FIRST);
  const stageRef = useRef<HTMLDivElement>(null);
  const active = tapes.find((tape) => tape.id === activeId) ?? tapes[0];
  const single = tapes.length === 1;

  const play = (tape: CafeTape) => {
    setActiveId(tape.id);
    onPlay();
    const top = stageRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const stageProps: StageProps = {
    tape: active,
    latest: active.id === tapes[0].id,
    playing,
    onPlay: () => play(active),
  };
  const more = Math.min(TAPES_STEP, tapes.length - shown);

  return (
    // lg:h-full: the shorter tab fills the shared cell, so its log is as tall as the other tab's.
    <div className={cn("grid gap-6 lg:h-full lg:gap-9", !single && "lg:grid-cols-[1.6fr_1fr]")}>
      <div ref={stageRef} className={cn("min-w-0 scroll-mt-24 lg:h-full", single && "mx-auto w-full max-w-3xl")}>
        {kind === "video" ? <VideoWall {...stageProps} /> : <ShortWall {...stageProps} />}
      </div>
      {single ? null : (
        <div className="relative min-w-0">
          <div className={cn("flex flex-col bg-cafe-cream p-3 pb-3.5 text-cafe-ink sm:p-4 lg:absolute lg:inset-0", PAPER_SHADOW)}>
            <div className="flex items-baseline justify-between gap-3 border-b border-cafe-ink/15 px-1 pb-2.5">
              <span className={cn(LABEL, "text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>Tape log</span>
              <span className={cn(THAI, "text-[13px] text-cafe-ink-muted")}>บันทึกเทป · {tapes.length} คลิป</span>
            </div>
            <ol className="mt-2 flex flex-col gap-0.5 lg:-mr-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1.5 lg:[scrollbar-color:var(--color-cafe-gold)_transparent] lg:[scrollbar-width:thin]">
              {tapes.map((tape, index) => (
                <TapeRow
                  key={tape.id}
                  tape={tape}
                  kind={kind}
                  active={tape.id === active.id}
                  playing={playing}
                  onPlay={() => play(tape)}
                  className={index >= shown ? "lg:block max-lg:hidden" : undefined}
                />
              ))}
            </ol>
            {more > 0 ? (
              <button
                type="button"
                onClick={() => setShown((n) => n + TAPES_STEP)}
                className={cn(THAI, "mx-auto mt-3 inline-flex min-h-11 items-center gap-1.5 border border-cafe-ink px-5 text-[14.5px] font-bold transition hover:bg-cafe-ink/[0.06] lg:hidden")}
              >
                ดูอีก {more} คลิป
                <ChevronDown className="size-4" aria-hidden />
              </button>
            ) : tapes.length > TAPES_FIRST ? (
              <button
                type="button"
                onClick={() => setShown(TAPES_FIRST)}
                className={cn(THAI, "mx-auto mt-3 inline-flex min-h-11 items-center gap-1.5 px-5 text-sm text-cafe-ink-muted transition hover:text-cafe-ink lg:hidden")}
              >
                ย่อรายการ
                <ChevronUp className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function CafeCaseTapes({ tapes }: { tapes: CafeTape[] }) {
  const [tab, setTab] = useState<TapeKind>("video");
  const [playingKind, setPlayingKind] = useState<TapeKind | null>(null);

  const all = sortTapes(tapes);
  const byKind: Record<TapeKind, CafeTape[]> = {
    video: all.filter((tape) => !tape.isShort),
    short: all.filter((tape) => tape.isShort),
  };
  const kinds = TAPE_KINDS.filter((kind) => byKind[kind].length > 0);
  if (kinds.length === 0) return null;
  // Always opens on Videos; the Shorts tab appears only when there are both.
  const current = kinds.includes(tab) ? tab : kinds[0];
  const tabbed = kinds.length > 1;

  const channel = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-cafe-gold/45 p-4 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <SocialPlatformIcon platform="youtube" className="size-6 text-cafe-gold-soft" />
        <div>
          <p className={cn(SERIF, "text-[15px] font-bold text-cafe-cream")}>{CAFE_YOUTUBE_NAME}</p>
          <p className={cn(THAI, "mt-0.5 text-[13px] text-cafe-muted")}>ช่องของคาเฟ่ · คลิปใหม่ขึ้นที่นี่ก่อน</p>
        </div>
      </div>
      <a
        href={CAFE_YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(THAI, LINE_LINK, "inline-flex items-center gap-1.5 text-sm text-cafe-gold-soft")}
      >
        ไปที่ช่อง YouTube
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );

  return (
    <BoardSection id="tapes" className="mt-24">
      <FeedHead title="Case Footage" local={`คลิปจากช่อง ${CAFE_YOUTUBE_NAME}`} />
      {tabbed ? (
        <div role="tablist" aria-label="ประเภทคลิป" className="mt-7 flex gap-2 sm:mt-9">
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              id={`tapes-tab-${kind}`}
              aria-selected={kind === current}
              aria-controls={`tapes-${kind}`}
              onClick={() => {
                setTab(kind);
                setPlayingKind(null);
              }}
              className={cn(
                THAI,
                "inline-flex min-h-11 items-center border px-[18px] text-[15px] font-bold transition",
                kind === current
                  ? "border-cafe-gold bg-cafe-gold text-cafe-ink"
                  : "border-cafe-gold/55 text-cafe-gold-soft hover:border-cafe-gold hover:bg-cafe-gold/10"
              )}
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      ) : null}
      {/* From 1024px both tabs sit in one grid cell, so switching never changes the height below
          (below 1024 only the open tab is laid out: the taller one would leave a gap under the other).
          The reveal animation lives here, not inside a tab, so it never un-hides the other one. */}
      <div data-motion="rise" className={cn("grid", tabbed ? "mt-6 sm:mt-8" : "mt-8 sm:mt-11")}>
        {kinds.map((kind) => (
          <div
            key={kind}
            id={`tapes-${kind}`}
            role={tabbed ? "tabpanel" : undefined}
            aria-labelledby={tabbed ? `tapes-tab-${kind}` : undefined}
            inert={kind !== current}
            className={cn("min-w-0 [grid-area:1/1]", kind !== current && "invisible max-lg:hidden")}
          >
            <FootagePanel
              kind={kind}
              tapes={byKind[kind]}
              playing={playingKind === kind && kind === current}
              onPlay={() => setPlayingKind(kind)}
            />
          </div>
        ))}
      </div>
      <div className="mt-6">{channel}</div>
    </BoardSection>
  );
}
