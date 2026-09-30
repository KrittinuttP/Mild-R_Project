"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MonitorPlay,
} from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { prefersReducedMotion } from "@/components/gallery/gallery-utils";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveCovers } from "@/hooks/useLiveCovers";
import {
  gsap,
  registerGsapPlugins,
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";
import type { LiveCoverItem } from "@/lib/live-streams";
import {
  BODY_CLASS,
  CTA_OUTLINE_CLASS,
  DISPLAY_H1_CLASS,
  DISPLAY_H2_CLASS,
  DISPLAY_H3_CLASS,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_MILD,
  LIVE_BADGE_PILL_SM,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

registerGsapPlugins();

const PAGE_STEP = 24;
const SKELETON_COUNT = 8;
const PREVIEW_COUNT = 8;
/** Start fetching a bit before the section scrolls into view. */
const PREFETCH_MARGIN = "600px 0px";

type Filter = "all" | "own" | "member" | "collab";

const FILTER_LABEL: Record<Filter, string> = {
  all: "ทั้งหมด",
  own: "Mild-R",
  member: "Member",
  collab: "Collab",
};

/** Mild-R includes member lives; Collab covers both in- and out-of-channel collabs. */
function matchesFilter(item: LiveCoverItem, filter: Filter): boolean {
  if (filter === "own") return item.isOwnChannel;
  if (filter === "member") return item.isMember;
  if (filter === "collab") return item.isCollab;
  return true;
}

function formatDate(ymd: string | null): string {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCaptured(iso: string | null): string {
  if (!iso) return "ปัจจุบัน";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  });
}

function ChannelBadge({ item }: { item: LiveCoverItem }) {
  return (
    <>
      <span
        className={cn(
          LIVE_BADGE_PILL_SM,
          "min-w-0 truncate text-[0.6rem]",
          item.isOwnChannel ? LIVE_BADGE_MILD : LIVE_BADGE_COLLAB
        )}
      >
        {item.channelLabel}
      </span>
      {item.isOwnChannel && item.isCollab ? (
        <span className={cn(LIVE_BADGE_PILL_SM, "text-[0.6rem]", LIVE_BADGE_COLLAB)}>
          Collab
        </span>
      ) : null}
      {item.isMember ? (
        <span className={cn(LIVE_BADGE_PILL_SM, "text-[0.6rem]", LIVE_BADGE_MEMBER)}>
          Member
        </span>
      ) : null}
    </>
  );
}

function CoverTile({
  item,
  onOpen,
}: {
  item: LiveCoverItem;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <li data-cover-item className="min-w-0 will-change-transform">
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left outline-none"
        aria-label={`ดูปกไลฟ์ ${item.title}`}
      >
        <span
          className={cn(
            "relative block aspect-video overflow-hidden rounded-xl border border-[#f3b8c4]/12 bg-[#1a0c12]",
            "transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#f3b8c4]/30",
            "group-focus-visible:ring-2 group-focus-visible:ring-[#e85a7a]/60"
          )}
        >
          {!loaded && !failed ? (
            <span className="absolute inset-0 animate-pulse bg-[#241019]" />
          ) : null}
          {failed ? (
            <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-[#f3b8c4]/50">
              {item.title}
            </span>
          ) : (
            <ProtectedImage
              src={item.thumbUrl}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                loaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </span>
        <span className="mt-2 block px-0.5">
          <span className="line-clamp-2 text-sm leading-snug text-[#fff5f7]/90">
            {item.title}
          </span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <ChannelBadge item={item} />
            {item.date ? (
              <span className="shrink-0 text-[0.7rem] text-[#f3b8c4]/55">
                {formatDate(item.date)}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function SkeletonTile() {
  return (
    <li className="min-w-0">
      <span className="block aspect-video animate-pulse rounded-xl bg-[#1d0d14]" />
      <span className="mt-2 block h-3.5 w-4/5 animate-pulse rounded bg-[#1d0d14]" />
      <span className="mt-2 block h-3 w-2/5 animate-pulse rounded bg-[#1d0d14]" />
    </li>
  );
}

type HeadingSize = "h1" | "h2" | "h3";

const HEADING_CLASS: Record<HeadingSize, string> = {
  h1: DISPLAY_H1_CLASS,
  h2: DISPLAY_H2_CLASS,
  h3: DISPLAY_H3_CLASS,
};

type LiveCoverArchiveProps = {
  /** full = gallery pages (filters + load more) · preview = home (newest 8 + View all) */
  mode?: "full" | "preview";
  id?: string;
  eyebrow?: string;
  title?: string;
  headingSize?: HeadingSize;
  /** Top border line separating it from the previous section. */
  showDivider?: boolean;
  viewAllHref?: string;
  className?: string;
};

/** Gallery section: live covers (Mild-R + collabs), lazy-loaded. */
export function LiveCoverArchive({
  mode = "full",
  id = "live-covers",
  eyebrow = "Archive",
  title = "Live covers",
  headingSize = "h2",
  showDivider = true,
  viewAllHref = "/gallery/live",
  className,
}: LiveCoverArchiveProps) {
  const preview = mode === "preview";
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const [nearView, setNearView] = useState(false);
  const { covers, total, status, retry } = useLiveCovers(
    nearView,
    preview ? PREVIEW_COUNT : undefined
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [versionIndex, setVersionIndex] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || nearView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearView(true);
          io.disconnect();
        }
      },
      { rootMargin: PREFETCH_MARGIN }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nearView]);

  const counts = useMemo(() => {
    const out = { all: 0, own: 0, member: 0, collab: 0 } as Record<Filter, number>;
    for (const c of covers) {
      for (const key of Object.keys(out) as Filter[]) {
        if (matchesFilter(c, key)) out[key] += 1;
      }
    }
    return out;
  }, [covers]);

  const filtered = useMemo(
    () => covers.filter((c) => matchesFilter(c, filter)),
    [covers, filter]
  );

  const visible = preview
    ? filtered.slice(0, PREVIEW_COUNT)
    : filtered.slice(0, visibleCount);
  const hasMore = !preview && visibleCount < filtered.length;
  const active = activeIndex !== null ? (visible[activeIndex] ?? null) : null;
  const activeVersion = active?.versions[versionIndex] ?? null;
  const lightboxSrc =
    versionIndex === 0 || !activeVersion ? active?.coverUrl : activeVersion.url;

  const openAt = (index: number | null) => {
    setActiveIndex(index);
    setVersionIndex(0);
  };

  const selectFilter = (next: Filter) => {
    setFilter(next);
    setVisibleCount(PAGE_STEP);
    openAt(null);
  };

  const step = (dir: 1 | -1) => {
    setActiveIndex((i) =>
      i === null ? i : (i + dir + visible.length) % visible.length
    );
    setVersionIndex(0);
  };

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => (i === null ? i : (i + 1) % visible.length));
        setVersionIndex(0);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) =>
          i === null ? i : (i - 1 + visible.length) % visible.length
        );
        setVersionIndex(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, visible.length]);

  useGSAP(
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>(
        "[data-cover-item]:not([data-revealed])",
        gridRef.current
      );
      tiles.forEach((tile, index) => {
        tile.setAttribute("data-revealed", "true");
        if (prefersReducedMotion()) {
          gsap.set(tile, { autoAlpha: 1 });
          return;
        }
        gsap.fromTo(
          tile,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            delay: (index % 4) * 0.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: tile,
              start: "top 94%",
              toggleActions: "play none none none",
            },
          }
        );
      });
      // Filtering reflows tiles that keep their old triggers; re-measure so they reveal in place.
      ScrollTrigger.refresh();
    },
    { scope: gridRef, dependencies: [visibleCount, filter, status] }
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "relative scroll-mt-20 bg-[#12080c] px-5 pb-20 text-[#fff5f7] sm:scroll-mt-24 sm:px-10 sm:pb-28 lg:px-16",
        className
      )}
    >
      <div
        className={cn(
          "relative mx-auto max-w-6xl",
          showDivider && "border-t border-[#f3b8c4]/10 pt-16 sm:pt-20"
        )}
      >
        <ScrollReveal>
          {eyebrow ? (
            <div className="flex items-center gap-2">
              <MonitorPlay className="size-4 text-[#e85a7a]" aria-hidden />
              <p className={META_CLASS}>{eyebrow}</p>
            </div>
          ) : null}
          <h2
            id={`${id}-heading`}
            className={cn(eyebrow && "mt-3", HEADING_CLASS[headingSize])}
          >
            {title}
          </h2>
          <p className={cn("mt-4 max-w-xl", BODY_CLASS)}>รวมปกไลฟ์ Mild-R</p>
        </ScrollReveal>

        {!preview && status === "ready" && covers.length > 0 ? (
          <div
            className="mt-6 flex flex-wrap gap-2"
            role="tablist"
            aria-label="กรองปกไลฟ์"
          >
            {(Object.keys(FILTER_LABEL) as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => selectFilter(key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs transition sm:text-sm",
                  filter === key
                    ? "border-[#e85a7a]/60 bg-[#e85a7a]/20 text-[#fff5f7]"
                    : "border-[#f3b8c4]/20 text-[#f3b8c4]/70 hover:border-[#f3b8c4]/40 hover:text-[#fff5f7]"
                )}
              >
                {FILTER_LABEL[key]}
                <span className="ml-1.5 text-[#f3b8c4]/55">{counts[key]}</span>
              </button>
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[#f3b8c4]/60">โหลดปกไลฟ์ไม่สำเร็จ</p>
            <button
              type="button"
              onClick={retry}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                CTA_OUTLINE_CLASS
              )}
            >
              ลองใหม่
            </button>
          </div>
        ) : status === "ready" && filtered.length === 0 ? (
          <p className="mt-8 text-sm text-[#f3b8c4]/60">ยังไม่มีปกไลฟ์ในหมวดนี้</p>
        ) : (
          <ul
            ref={gridRef}
            className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4"
          >
            {status === "ready"
              ? visible.map((item, index) => (
                  <CoverTile
                    key={item.videoId}
                    item={item}
                    onOpen={() => openAt(index)}
                  />
                ))
              : Array.from(
                  { length: preview ? PREVIEW_COUNT : SKELETON_COUNT },
                  (_, i) => <SkeletonTile key={i} />
                )}
          </ul>
        )}

        {preview && status === "ready" && total > 0 ? (
          <div className="mt-10 flex justify-center sm:mt-12">
            <Link
              href={viewAllHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                CTA_OUTLINE_CLASS,
                "px-6"
              )}
            >
              View all
              <span className="ml-2 text-[#f3b8c4]/70">({total})</span>
              <ArrowUpRight className="size-4 opacity-80" />
            </Link>
          </div>
        ) : null}

        {status === "ready" && hasMore ? (
          <div className="mt-10 flex justify-center sm:mt-12">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((n) => Math.min(n + PAGE_STEP, filtered.length))
              }
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                CTA_OUTLINE_CLASS,
                "px-6"
              )}
            >
              โหลดเพิ่ม
              <span className="ml-2 text-[#f3b8c4]/70">
                ({filtered.length - visibleCount})
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) openAt(null);
        }}
      >
        <DialogContent
          className="max-h-[92dvh] w-[min(100%,calc(100vw-1rem))] max-w-4xl overflow-y-auto border-[#f3b8c4]/20 bg-[#140a0d] p-3 text-[#fff5f7] sm:max-w-4xl sm:p-4"
          showCloseButton
        >
          {active ? (
            <>
              <DialogHeader className="px-1 pt-1 pr-10 sm:px-2">
                <DialogTitle className="font-[family-name:var(--font-display)] text-base leading-snug text-[#fff5f7] sm:text-lg">
                  {active.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-[#f3b8c4]/70">
                  <ChannelBadge item={active} />
                  {active.date ? <span>{formatDate(active.date)}</span> : null}
                </DialogDescription>
              </DialogHeader>

              <div className="relative mt-1 overflow-hidden rounded-xl bg-[#1a0c12]">
                <ProtectedImage
                  key={lightboxSrc}
                  src={lightboxSrc}
                  alt={active.title}
                  decoding="async"
                  className="aspect-video w-full object-contain"
                />
                {visible.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="ปกก่อนหน้า"
                      onClick={() => step(-1)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "absolute top-1/2 left-2 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 text-[#fff5f7] backdrop-blur-sm hover:bg-[#e85a7a]/90 hover:text-white"
                      )}
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="ปกถัดไป"
                      onClick={() => step(1)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "absolute top-1/2 right-2 size-10 -translate-y-1/2 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/75 text-[#fff5f7] backdrop-blur-sm hover:bg-[#e85a7a]/90 hover:text-white"
                      )}
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                ) : null}
              </div>

              {active.versions.length > 1 ? (
                <div className="mt-3 px-1 sm:px-2">
                  <p className="text-xs text-[#f3b8c4]/60">
                    ปกเวอร์ชันอื่น ({active.versions.length})
                  </p>
                  <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {active.versions.map((v, i) => (
                      <li key={v.url} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setVersionIndex(i)}
                          aria-label={`ปกเวอร์ชัน ${formatCaptured(v.capturedAt)}`}
                          aria-pressed={versionIndex === i}
                          className={cn(
                            "block w-28 overflow-hidden rounded-lg border transition sm:w-32",
                            versionIndex === i
                              ? "border-[#e85a7a]/70"
                              : "border-[#f3b8c4]/15 opacity-70 hover:opacity-100"
                          )}
                        >
                          <ProtectedImage
                            src={v.url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="aspect-video w-full object-cover"
                          />
                          <span className="block px-1.5 py-1 text-left text-[0.65rem] text-[#f3b8c4]/65">
                            {formatCaptured(i === 0 ? null : v.capturedAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 sm:px-2">
                <a
                  href={active.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#f3b8c4]/75 transition hover:text-[#f3b8c4]"
                >
                  ดูบน YouTube
                  <ExternalLink className="size-3.5 opacity-80" aria-hidden />
                </a>
                <p className="text-xs tracking-wide text-[#f3b8c4]/55">
                  {(activeIndex ?? 0) + 1} / {visible.length}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
