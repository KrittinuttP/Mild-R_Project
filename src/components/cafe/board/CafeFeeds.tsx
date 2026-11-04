"use client";

import { Fragment, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Play } from "lucide-react";

import {
  BoardSection,
  CorkBoard,
  LABEL,
  Paper,
  SectionHead,
  SERIF,
  THAI,
  TYPE,
} from "@/components/cafe/board/pieces";
import { WaxSeal } from "@/components/cafe/board/brass";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import type { ImageLightboxItem } from "@/components/media/ImageLightbox";
import {
  CAFE_X_HANDLE,
  CAFE_X_URL,
  CAFE_YOUTUBE_NAME,
  CAFE_YOUTUBE_URL,
  NOTICE_PREVIEW_DESKTOP,
  NOTICE_PREVIEW_MOBILE,
  TAPES_LISTED,
  feedDate,
  noticeHeadline,
  sortNotices,
  sortTapes,
  tapeDuration,
  type CafeNotice,
  type CafeTape,
} from "@/lib/cafe-feeds";
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type OpenImages = (items: ImageLightboxItem[], index: number, group?: string) => void;

const GHOST_BUTTON = cn(
  SERIF,
  "inline-flex min-h-11 items-center justify-center gap-2 border border-cafe-gold/60 px-5 text-sm font-bold tracking-[0.02em] text-cafe-gold-soft transition hover:border-cafe-gold hover:bg-cafe-gold/10"
);

const LINE_LINK =
  "underline decoration-current/45 underline-offset-[3px] transition hover:decoration-current";

/* ───────────────────────────── Notice Board ───────────────────────────── */

/** Post text: links clickable (shown without https://), #hashtags tinted. */
function PostText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|#[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("break-all text-cafe-gold-deep", LINE_LINK)}
            >
              {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          );
        }
        if (part.startsWith("#")) {
          return (
            <span key={i} className="text-cafe-gold-deep">
              {part}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

const NOTICE_TILTS = [0.7, -0.5, 0.5, -0.4, 0.6];

function NoticeCard({
  notice,
  wide = false,
  tilt,
  motion,
  onOpen,
}: {
  notice: CafeNotice;
  wide?: boolean;
  tilt: number;
  motion?: string;
  onOpen: OpenImages;
}) {
  const image = notice.mediaUrls[0];
  const date = feedDate(notice.postedAt);
  const headline = noticeHeadline(notice.text);

  return (
    <Paper pin={`notice-${notice.id}`} tilt={tilt} motion={motion} className="p-[18px] sm:p-[22px]">
      {notice.pinned ? (
        <WaxSeal
          top="PINNED"
          label="★"
          turn={-12}
          className="absolute -top-4 -right-3.5 size-14 sm:size-16"
        />
      ) : null}
      <p className={cn(TYPE, "pr-10 text-xs tracking-[0.04em] text-cafe-ink-muted")}>
        <span className="flex items-center gap-2 text-cafe-ink-soft">
          <SocialPlatformIcon platform="x" className="size-3.5 text-cafe-ink" />@{CAFE_X_HANDLE}
        </span>
        {date ? (
          <time dateTime={notice.postedAt} className="mt-0.5 block uppercase">
            {date}
          </time>
        ) : null}
      </p>
      <p
        className={cn(
          THAI,
          "mt-3 leading-[1.75] break-words whitespace-pre-line text-cafe-ink",
          wide ? "line-clamp-8 text-[15px] sm:text-base" : "line-clamp-5 text-[14.5px] sm:text-[15px]"
        )}
      >
        <PostText text={notice.text} />
      </p>
      {image ? (
        <button
          type="button"
          onClick={() =>
            onOpen(
              notice.mediaUrls.map((src, index) => ({
                id: `${notice.id}-${index}`,
                src,
                alt: headline || `โพสต์ของ @${CAFE_X_HANDLE}`,
                caption: date,
              })),
              0,
              "Notice Board"
            )
          }
          className="relative -mx-[18px] mt-4 block w-[calc(100%+36px)] cursor-zoom-in sm:-mx-[22px] sm:w-[calc(100%+44px)]"
          aria-label="ดูรูปจากโพสต์แบบเต็ม"
        >
          <ProtectedImage
            src={image}
            alt={headline || `รูปจากโพสต์ของ @${CAFE_X_HANDLE}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn(
              "block w-full object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
              wide ? "aspect-[16/10]" : "aspect-[16/10] lg:aspect-[16/11]"
            )}
          />
          {notice.mediaUrls.length > 1 ? (
            <span
              className={cn(
                TYPE,
                "absolute right-2 bottom-2 bg-cafe-deep/85 px-1.5 py-0.5 text-[11px] text-cafe-cream"
              )}
            >
              +{notice.mediaUrls.length - 1}
            </span>
          ) : null}
        </button>
      ) : null}
      <a
        href={notice.url || CAFE_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(THAI, LINE_LINK, "mt-3.5 inline-flex items-center gap-1.5 text-[13px] text-cafe-gold-deep")}
      >
        <SocialPlatformIcon platform="x" className="size-3" />
        ดูโพสต์บน X
        <ExternalLink className="size-3" aria-hidden />
      </a>
    </Paper>
  );
}

export function CafeNoticeBoard({
  notices,
  onOpen,
}: {
  notices: CafeNotice[];
  onOpen: OpenImages;
}) {
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sorted = sortNotices(notices);
  if (sorted.length === 0) return null;

  const [lead, ...rest] = sorted;
  const total = sorted.length;
  const moreOnPhone = total > NOTICE_PREVIEW_MOBILE;
  const moreOnWide = total > NOTICE_PREVIEW_DESKTOP;

  const collapse = () => {
    setExpanded(false);
    const top = sectionRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <BoardSection id="notices" className="mt-20 sm:mt-24">
      <div ref={sectionRef} className="scroll-mt-24">
        <CorkBoard className="p-[22px] sm:p-10 lg:p-11">
          <SectionHead
            eyebrow="Bulletin"
            title="Notice Board"
            titleLocal={`ประกาศจาก X @${CAFE_X_HANDLE}`}
            stamp="Official"
          />
          {/* Phone: one column, 3 cards. 640+: two columns (lead spans both), 4 cards.
              1024+: lead card big on the left, the rest two by two on the right. */}
          <div className="mt-7 grid gap-x-7 gap-y-[26px] sm:mt-10 sm:grid-cols-2 sm:gap-y-9 lg:grid-cols-[1.25fr_2fr] lg:items-start lg:gap-x-9">
            <div className="sm:col-span-2 lg:col-span-1">
              <NoticeCard notice={lead} wide tilt={-0.6} motion="rise" onOpen={onOpen} />
            </div>
            <div className="contents lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-7 lg:gap-y-9">
              {rest.map((notice, i) => {
                const place = i + 1;
                return (
                  <div
                    key={notice.id}
                    className={cn(
                      !expanded && place >= NOTICE_PREVIEW_MOBILE && "max-sm:hidden",
                      !expanded && place >= NOTICE_PREVIEW_DESKTOP && "hidden"
                    )}
                  >
                    <NoticeCard
                      notice={notice}
                      tilt={NOTICE_TILTS[i % NOTICE_TILTS.length]}
                      motion={place < NOTICE_PREVIEW_DESKTOP ? "rise" : undefined}
                      onOpen={onOpen}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {moreOnPhone ? (
            <div className={cn("mt-8 text-center sm:mt-11", !moreOnWide && "sm:hidden")}>
              <button
                type="button"
                onClick={() => (expanded ? collapse() : setExpanded(true))}
                aria-expanded={expanded}
                className={GHOST_BUTTON}
              >
                {expanded ? (
                  <>
                    ย่อกลับ
                    <ChevronUp className="size-4" aria-hidden />
                  </>
                ) : (
                  <>
                    <span className={THAI}>ดูประกาศทั้งหมด ({total})</span>
                    <ChevronDown className="size-4" aria-hidden />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </CorkBoard>
      </div>
    </BoardSection>
  );
}

/* ───────────────────────────── Case Tapes ───────────────────────────── */

function TapeLabel({ n }: { n: number }) {
  return (
    <span
      className={cn(
        TYPE,
        "inline-block -rotate-[1.5deg] bg-cafe-gold-pale px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-cafe-ink shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
      )}
    >
      TAPE {String(n).padStart(2, "0")}
    </span>
  );
}

/** 16:9 frame. A Short shows its upright picture in the middle of a dimmed copy. */
function TapeThumb({ tape, big = false }: { tape: CafeTape; big?: boolean }) {
  const src = tape.thumbnailUrl ?? getYoutubeThumbnailUrl(tape.id);
  const duration = tapeDuration(tape.durationSeconds);
  return (
    <span className="relative block aspect-video overflow-hidden bg-cafe-deep">
      {tape.isShort ? (
        <>
          <ProtectedImage
            src={src}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-md"
          />
          <ProtectedImage
            src={src}
            alt=""
            loading="lazy"
            className="absolute inset-y-0 left-1/2 aspect-[9/16] h-full -translate-x-1/2 object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          />
        </>
      ) : (
        <ProtectedImage
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-cafe-deep/75 text-cafe-gold-soft shadow-[inset_0_0_0_1.5px_var(--color-cafe-gold)] transition group-hover:scale-110 group-hover:bg-cafe-deep/90",
            big ? "size-14 sm:size-16" : "size-9"
          )}
        >
          <Play className={cn("translate-x-[1px] fill-current", big ? "size-6" : "size-3.5")} aria-hidden />
        </span>
      </span>
      {tape.isShort ? (
        <span
          className={cn(
            SERIF,
            "absolute top-2.5 left-2.5 bg-cafe-heart px-1.5 pt-[3px] pb-0.5 text-[10px] font-bold tracking-[0.16em] text-white"
          )}
        >
          SHORT
        </span>
      ) : null}
      {duration ? (
        <span
          className={cn(
            TYPE,
            "absolute right-2 bottom-2 bg-cafe-deep/85 px-1.5 py-0.5 text-[11px] text-cafe-cream"
          )}
        >
          {duration}
        </span>
      ) : null}
    </span>
  );
}

export function CafeCaseTapes({ tapes }: { tapes: CafeTape[] }) {
  const sorted = sortTapes(tapes).slice(0, TAPES_LISTED + 1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const featureRef = useRef<HTMLDivElement>(null);
  if (sorted.length === 0) return null;

  const activeIndex = Math.max(0, sorted.findIndex((tape) => tape.id === activeId));
  const active = sorted[activeIndex];
  const others = sorted.slice(1);

  const play = (tape: CafeTape) => {
    setActiveId(tape.id);
    setPlaying(true);
    const top = featureRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      featureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const channelLink = (
    <a
      href={CAFE_YOUTUBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(THAI, LINE_LINK, "inline-flex items-center gap-2 text-sm text-cafe-gold-soft")}
    >
      <SocialPlatformIcon platform="youtube" className="size-4" />
      ดูทั้งช่อง {CAFE_YOUTUBE_NAME}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );

  return (
    <BoardSection id="tapes" className="mt-24">
      <CorkBoard className="p-[22px] sm:p-10 lg:p-11">
        <SectionHead
          eyebrow="Evidence"
          title="Case Tapes"
          titleLocal={`คลิปจากช่อง ${CAFE_YOUTUBE_NAME}`}
          stamp="On Record"
        />
        <div
          className={cn(
            "mt-7 grid gap-[18px] sm:mt-10 lg:items-start lg:gap-10",
            others.length > 0 && "lg:grid-cols-[1.55fr_1fr]"
          )}
        >
          <div
            ref={featureRef}
            data-motion="rise"
            className="scroll-mt-24 bg-cafe-deep p-2.5 shadow-[0_14px_26px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(201,161,74,0.35)] sm:p-3.5"
          >
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
                <TapeThumb tape={active} big />
              </button>
            )}
            <div className="px-1 pt-3.5 pb-1 sm:pt-[18px]">
              <div className="flex items-center gap-2.5">
                <TapeLabel n={activeIndex + 1} />
                <span className={cn(LABEL, "text-[10px] sm:text-[10px]")}>
                  {playing ? "Now Playing" : activeIndex === 0 ? "Latest" : ""}
                </span>
              </div>
              <h3
                className={cn(
                  SERIF,
                  "mt-2.5 text-lg leading-[1.4] font-bold text-cafe-cream sm:text-[22px]"
                )}
              >
                {active.title}
              </h3>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <time
                  dateTime={active.publishedAt}
                  className={cn(TYPE, "text-xs tracking-[0.06em] text-cafe-muted uppercase")}
                >
                  {feedDate(active.publishedAt)}
                </time>
                <a
                  href={`https://www.youtube.com/watch?v=${active.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(THAI, LINE_LINK, "inline-flex items-center gap-1 text-[13px] text-cafe-gold-soft")}
                >
                  เปิดใน YouTube
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </p>
            </div>
          </div>

          <div>
            {others.length > 0 ? (
              <>
                <p className={cn(LABEL, "mb-1.5 hidden text-[11px] lg:block")}>More Tapes</p>
                <ul>
                  {others.map((tape, i) => {
                    const isActive = playing && tape.id === active.id;
                    return (
                      <li key={tape.id} className="border-t border-cafe-gold/20">
                        <button
                          type="button"
                          onClick={() => play(tape)}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "group flex w-full items-start gap-3.5 py-3 text-left transition",
                            isActive && "bg-cafe-gold/[0.07]"
                          )}
                        >
                          <span className="w-[148px] flex-none lg:w-[176px]">
                            <TapeThumb tape={tape} />
                          </span>
                          <span className="min-w-0 pt-0.5">
                            <TapeLabel n={i + 2} />
                            <span
                              className={cn(
                                SERIF,
                                "mt-2 line-clamp-2 text-sm leading-[1.45] text-cafe-cream group-hover:text-cafe-gold-soft sm:text-[15px]"
                              )}
                            >
                              {tape.title}
                            </span>
                            <span
                              className={cn(
                                TYPE,
                                "mt-1 block text-[11px] tracking-[0.06em] text-cafe-muted uppercase"
                              )}
                            >
                              {isActive ? "Now Playing" : feedDate(tape.publishedAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
            <div className={cn("mt-4 text-center lg:text-left", others.length > 0 && "lg:mt-[18px]")}>
              {channelLink}
            </div>
          </div>
        </div>
      </CorkBoard>
    </BoardSection>
  );
}
