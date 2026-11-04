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
/** Clips on the page: the latest big + up to 4 beside it. More live on YouTube. */
const TAPES_ON_PAGE = 5;

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

/** Film frame with sprocket holes along the top and bottom. */
function Film({
  children,
  holes = "md",
}: {
  children: ReactNode;
  holes?: "md" | "sm";
}) {
  const row = (
    <div aria-hidden className={cn("flex items-center px-1.5", holes === "md" ? "h-3" : "h-2")}>
      <div
        className={cn(
          "flex-1 rounded-[2px]",
          holes === "md"
            ? "h-1.5 bg-[repeating-linear-gradient(90deg,rgba(241,230,207,0.8)_0_11px,transparent_11px_22px)]"
            : "h-1 bg-[repeating-linear-gradient(90deg,rgba(241,230,207,0.8)_0_7px,transparent_7px_14px)]"
        )}
      />
    </div>
  );
  return (
    <div className="bg-[#0d1714] shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
      {row}
      <div className={cn("relative", holes === "md" ? "px-2 sm:px-2.5" : "px-1")}>{children}</div>
      {row}
    </div>
  );
}

function TapeThumb({ tape, play }: { tape: CafeTape; play: "lg" | "sm" }) {
  const duration = tapeDuration(tape.durationSeconds);
  return (
    <span className="relative block aspect-video overflow-hidden bg-cafe-deep">
      <ProtectedImage
        src={tape.thumbnailUrl ?? getYoutubeThumbnailUrl(tape.id)}
        alt=""
        loading="lazy"
        wrapClassName="absolute inset-0 block"
        className="size-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-cafe-deep/72 text-cafe-gold-soft shadow-[inset_0_0_0_2px_var(--color-cafe-gold)] transition group-hover:scale-110",
            play === "lg" ? "size-14 sm:size-[72px]" : "size-8"
          )}
        >
          <Play className={cn("translate-x-[1px] fill-current", play === "lg" ? "size-6 sm:size-7" : "size-3")} aria-hidden />
        </span>
      </span>
      {duration ? (
        <span className={cn(SERIF, "absolute right-1.5 bottom-1.5 bg-cafe-deep/88 px-1.5 py-px text-[11.5px] text-cafe-cream")}>
          {duration}
        </span>
      ) : null}
    </span>
  );
}

function tapeMeta(tape: CafeTape) {
  return tape.isShort ? `${feedDate(tape.publishedAt)} · Short` : feedDate(tape.publishedAt);
}

export function CafeCaseTapes({ tapes }: { tapes: CafeTape[] }) {
  const all = sortTapes(tapes);
  const onPage = all.slice(0, TAPES_ON_PAGE);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const featureRef = useRef<HTMLDivElement>(null);
  if (onPage.length === 0) return null;

  const active = onPage.find((tape) => tape.id === activeId) ?? onPage[0];
  const others = onPage.filter((tape) => tape.id !== active.id).slice(0, TAPES_ON_PAGE - 1);
  const total = all.length;

  const play = (tape: CafeTape) => {
    setActiveId(tape.id);
    setPlaying(true);
    const top = featureRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      featureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const featured = (
    <div
      ref={featureRef}
      data-motion="rise"
      className={cn("relative scroll-mt-24 bg-cafe-cream p-4 pb-5 text-cafe-ink sm:p-[26px] sm:pb-7", PAPER_SHADOW)}
      style={{ transform: "rotate(-0.4deg)" }}
    >
      <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn(LABEL, "text-[10.5px] text-cafe-gold-deep sm:text-[10.5px]")}>
          {active.id === onPage[0].id ? "Latest footage" : "Footage"}
        </span>
        <time dateTime={active.publishedAt} className={cn(SERIF, "text-[13px] text-cafe-ink-muted")}>
          {tapeMeta(active)}
        </time>
      </div>
      <div className="mt-3.5">
        <Film>
          {playing ? (
            <div className="relative aspect-video bg-black">
              <iframe
                key={active.id}
                src={getYoutubeEmbedUrl(active.id, true)}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => play(active)}
              className="group block w-full"
              aria-label={`เล่นคลิป ${active.title}`}
            >
              <TapeThumb tape={active} play="lg" />
            </button>
          )}
        </Film>
      </div>
      <h3 className={cn(SERIF, "mt-4 text-lg leading-[1.3] font-bold sm:mt-[18px] sm:text-2xl")}>{active.title}</h3>
      <a
        href={`https://www.youtube.com/watch?v=${active.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(THAI, LINE_LINK, "mt-2.5 inline-flex items-center gap-1.5 text-sm text-cafe-gold-deep")}
      >
        ดูบน YouTube
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );

  const slip = (tape: CafeTape, row: boolean) => (
    <button
      key={tape.id}
      type="button"
      onClick={() => play(tape)}
      className={cn(
        "group bg-cafe-cream p-3 text-left text-cafe-ink shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5",
        row ? "grid w-full grid-cols-[150px_1fr] items-center gap-4" : "block w-[220px] flex-none snap-start"
      )}
    >
      <Film holes="sm">
        <TapeThumb tape={tape} play="sm" />
      </Film>
      <span className={cn("block min-w-0", !row && "mt-2.5")}>
        <span className={cn(SERIF, "line-clamp-2 text-[14.5px] leading-[1.4] font-bold sm:text-[15.5px]")}>{tape.title}</span>
        <span className={cn(SERIF, "mt-1 block text-[12.5px] text-cafe-ink-muted")}>{tapeMeta(tape)}</span>
      </span>
    </button>
  );

  const channel = (
    <div className="flex flex-col items-start gap-3.5 border border-cafe-gold/45 p-4 sm:px-5 sm:py-[18px]">
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
        {total > TAPES_ON_PAGE ? `ดูทั้งหมด ${total} คลิปบน YouTube` : `ไปที่ช่อง ${CAFE_YOUTUBE_NAME}`}
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );

  return (
    <BoardSection id="tapes" className="mt-24">
      <FeedHead title="Case Footage" local={`คลิปจากช่อง ${CAFE_YOUTUBE_NAME}`} />
      {/* 1024+: the clip big on the left, up to 4 slips + the channel on the right.
          Smaller: the clip, then the slips side by side (swipe), then the channel. */}
      <div className="mt-8 grid gap-6 sm:mt-11 lg:grid-cols-[1.65fr_1fr] lg:items-start lg:gap-10">
        {featured}
        <div className="flex min-w-0 flex-col gap-[18px]">
          {others.length > 0 ? (
            <>
              <p className={cn(LABEL, "hidden lg:block")}>More footage</p>
              <div className="hidden flex-col gap-[18px] lg:flex">{others.map((tape) => slip(tape, true))}</div>
              <div className="-mx-5 flex snap-x gap-3.5 overflow-x-auto px-5 pt-1.5 pb-3.5 sm:-mx-8 sm:px-8 lg:hidden">
                {others.map((tape) => slip(tape, false))}
              </div>
              {others.length > 1 ? (
                <p className={cn(THAI, "-mt-2 text-center text-[13px] text-cafe-muted lg:hidden")}>ปัดดูคลิปอื่น</p>
              ) : null}
            </>
          ) : null}
          {channel}
        </div>
      </div>
    </BoardSection>
  );
}
