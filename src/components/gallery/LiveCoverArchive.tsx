"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  MonitorPlay,
  Search,
  X,
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
const COVER_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4";
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

type CoverView = "month" | "all";

const VIEW_STORAGE_KEY = "mild-r:live-cover-view";
const VIEW_CHANGE_EVENT = "mild-r:live-cover-view-change";

function readCoverView(): CoverView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "all" ? "all" : "month";
  } catch {
    return "month";
  }
}

function subscribeCoverView(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VIEW_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VIEW_CHANGE_EVENT, onChange);
  };
}

function writeCoverView(view: CoverView) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Private mode / storage disabled: preference just won't persist.
  }
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

const VIEW_OPTIONS: {
  key: CoverView;
  label: string;
  ariaLabel: string;
  Icon: typeof CalendarDays;
}[] = [
  { key: "month", label: "รายเดือน", ariaLabel: "ดูแบบแบ่งตามเดือน", Icon: CalendarDays },
  { key: "all", label: "ทั้งหมด", ariaLabel: "ดูทั้งหมดต่อกัน", Icon: LayoutGrid },
];

function normalizeSearch(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase();
}

function matchesSearch(item: LiveCoverItem, normalizedQuery: string): boolean {
  return normalizeSearch(`${item.title} ${item.channelLabel}`).includes(
    normalizedQuery
  );
}

const UNKNOWN_MONTH = "unknown";

function coverYear(item: LiveCoverItem): string | null {
  return item.date?.slice(0, 4) ?? null;
}

function coverMonth(item: LiveCoverItem): string {
  return item.date?.slice(0, 7) ?? UNKNOWN_MONTH;
}

function formatMonthHeading(monthKey: string): string {
  if (monthKey === UNKNOWN_MONTH) return "ไม่ระบุวันที่";
  const d = new Date(`${monthKey}-15T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return monthKey;
  return d.toLocaleDateString("th-TH-u-ca-gregory", {
    timeZone: "Asia/Bangkok",
    month: "long",
    year: "numeric",
  });
}

type MonthGroup = {
  key: string;
  items: LiveCoverItem[];
  /** Index of the first item in the flat visible list (lightbox order). */
  start: number;
};

function groupByMonth(items: LiveCoverItem[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  items.forEach((item, index) => {
    const key = coverMonth(item);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item], start: index });
  });
  return groups;
}

function formatDate(ymd: string | null): string {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH-u-ca-gregory", {
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
  const gridRef = useRef<HTMLDivElement>(null);
  const [nearView, setNearView] = useState(false);
  const { covers, total, status, retry } = useLiveCovers(
    nearView,
    preview ? PREVIEW_COUNT : undefined
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [year, setYear] = useState<string>("all");
  const [query, setQuery] = useState("");
  const view = useSyncExternalStore(
    subscribeCoverView,
    readCoverView,
    () => "month" as const
  );
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

  const normalizedQuery = normalizeSearch(query);

  const searched = useMemo(
    () =>
      normalizedQuery
        ? covers.filter((c) => matchesSearch(c, normalizedQuery))
        : covers,
    [covers, normalizedQuery]
  );

  const counts = useMemo(() => {
    const out = { all: 0, own: 0, member: 0, collab: 0 } as Record<Filter, number>;
    for (const c of searched) {
      for (const key of Object.keys(out) as Filter[]) {
        if (matchesFilter(c, key)) out[key] += 1;
      }
    }
    return out;
  }, [searched]);

  const byCategory = useMemo(
    () => searched.filter((c) => matchesFilter(c, filter)),
    [searched, filter]
  );

  const yearCounts = useMemo(() => {
    const out = new Map<string, number>();
    for (const c of covers) {
      const y = coverYear(c);
      if (y) out.set(y, 0);
    }
    for (const c of byCategory) {
      const y = coverYear(c);
      if (y) out.set(y, (out.get(y) ?? 0) + 1);
    }
    return [...out].sort((a, b) => b[0].localeCompare(a[0]));
  }, [covers, byCategory]);

  const filtered = useMemo(
    () =>
      year === "all"
        ? byCategory
        : byCategory.filter((c) => coverYear(c) === year),
    [byCategory, year]
  );

  const byMonth = !preview && view === "month";

  const monthGroups = useMemo(() => {
    if (!byMonth) return [];
    // Whole months only: stop once the running total reaches visibleCount.
    const all = groupByMonth(filtered);
    const out: MonthGroup[] = [];
    let shown = 0;
    for (const group of all) {
      if (shown >= visibleCount) break;
      out.push(group);
      shown += group.items.length;
    }
    return out;
  }, [byMonth, filtered, visibleCount]);

  const visible = preview
    ? filtered.slice(0, PREVIEW_COUNT)
    : byMonth
      ? monthGroups.flatMap((g) => g.items)
      : filtered.slice(0, visibleCount);
  const hasMore = !preview && visible.length < filtered.length;
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
    if (
      year !== "all" &&
      !searched.some((c) => matchesFilter(c, next) && coverYear(c) === year)
    ) {
      setYear("all");
    }
    setVisibleCount(PAGE_STEP);
    openAt(null);
  };

  const selectYear = (next: string) => {
    setYear(next);
    setVisibleCount(PAGE_STEP);
    openAt(null);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setVisibleCount(PAGE_STEP);
    openAt(null);
  };

  const selectView = (next: CoverView) => {
    if (next === view) return;
    writeCoverView(next);
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
    {
      scope: gridRef,
      dependencies: [visibleCount, filter, year, normalizedQuery, view, status],
    }
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
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 sm:gap-x-3 lg:gap-x-4">
            <div
              className="relative col-start-2 row-start-1 grid h-10 grid-cols-2 rounded-full border border-[#f3b8c4]/15 bg-[#1a0c12]/70 p-0.5 lg:h-9"
              role="group"
              aria-label="มุมมอง"
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full border border-[#e85a7a]/55",
                  "bg-gradient-to-b from-[#e85a7a]/30 to-[#e85a7a]/12 shadow-[0_0_18px_-6px_rgba(232,90,122,0.75)]",
                  "transition-transform duration-300 ease-out motion-reduce:transition-none",
                  view === "all" && "translate-x-full"
                )}
              />
              {VIEW_OPTIONS.map(({ key, label, ariaLabel, Icon }) => {
                const selected = view === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    aria-label={ariaLabel}
                    title={ariaLabel}
                    onClick={() => selectView(key)}
                    className={cn(
                      "relative flex items-center justify-center gap-1.5 rounded-full px-3 text-xs transition-colors duration-300 sm:px-4 sm:text-sm",
                      "focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60 focus-visible:outline-none",
                      selected
                        ? "text-[#fff5f7]"
                        : "text-[#f3b8c4]/55 hover:text-[#fff5f7]"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="hidden whitespace-nowrap sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            <label className="relative col-start-1 row-start-1 block w-full lg:col-start-2 lg:row-start-2 lg:w-64 lg:justify-self-end">
              <span className="sr-only">ค้นหาปกไลฟ์</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#f3b8c4]/45"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder="ค้นหาชื่อไลฟ์ หรือช่อง…"
                enterKeyHint="search"
                className={cn(
                  "h-10 w-full rounded-full border border-[#f3b8c4]/15 bg-[#1a0c12]/70 pr-9 pl-9 text-sm text-[#fff5f7] transition outline-none",
                  "placeholder:text-[#f3b8c4]/40 focus:border-[#e85a7a]/55 focus:bg-[#1a0c12]",
                  "[&::-webkit-search-cancel-button]:appearance-none"
                )}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => changeQuery("")}
                  aria-label="ล้างคำค้น"
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#f3b8c4]/60 transition hover:bg-[#f3b8c4]/10 hover:text-[#fff5f7]"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </label>

            <div
              className="col-span-2 row-start-2 -mx-5 flex min-w-0 gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-10 sm:gap-2 sm:px-10 lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
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
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition sm:px-3.5 sm:text-sm",
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

            {yearCounts.length > 1 ? (
              <div
                className="col-span-2 row-start-3 flex flex-wrap gap-1.5 lg:col-span-1 lg:col-start-1 lg:row-start-2"
                role="group"
                aria-label="กรองตามปี"
              >
                {[["all", byCategory.length] as const, ...yearCounts].map(
                  ([key, count]) => {
                    const selected = year === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        disabled={count === 0 && !selected}
                        onClick={() => selectYear(key)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[0.7rem] transition sm:text-xs",
                          "disabled:cursor-not-allowed disabled:opacity-35",
                          selected
                            ? "border-[#f3b8c4]/45 bg-[#f3b8c4]/12 text-[#fff5f7]"
                            : "border-[#f3b8c4]/12 text-[#f3b8c4]/60 enabled:hover:border-[#f3b8c4]/35 enabled:hover:text-[#fff5f7]"
                        )}
                      >
                        {key === "all" ? "ทุกปี" : key}
                        <span className="ml-1.5 text-[#f3b8c4]/45">{count}</span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : null}
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
          normalizedQuery ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <p className="text-sm text-[#f3b8c4]/60">
                ไม่พบไลฟ์ที่ตรงกับ “{query.trim()}”
              </p>
              <button
                type="button"
                onClick={() =>
                  year !== "all" && byCategory.length > 0
                    ? selectYear("all")
                    : changeQuery("")
                }
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  CTA_OUTLINE_CLASS
                )}
              >
                {year !== "all" && byCategory.length > 0
                  ? "ค้นหาในทุกปี"
                  : "ล้างคำค้น"}
              </button>
            </div>
          ) : (
            <p className="mt-8 text-sm text-[#f3b8c4]/60">ยังไม่มีปกไลฟ์ในหมวดนี้</p>
          )
        ) : (
          <div ref={gridRef} className="mt-6 sm:mt-8">
            {status !== "ready" ? (
              <ul className={COVER_GRID_CLASS}>
                {Array.from(
                  { length: preview ? PREVIEW_COUNT : SKELETON_COUNT },
                  (_, i) => <SkeletonTile key={i} />
                )}
              </ul>
            ) : !byMonth ? (
              <ul className={COVER_GRID_CLASS}>
                {visible.map((item, index) => (
                  <CoverTile
                    key={item.videoId}
                    item={item}
                    onOpen={() => openAt(index)}
                  />
                ))}
              </ul>
            ) : (
              <div className="space-y-10 sm:space-y-12">
                {monthGroups.map((group) => (
                  <section
                    key={group.key}
                    aria-labelledby={`${id}-month-${group.key}`}
                  >
                    <h3
                      id={`${id}-month-${group.key}`}
                      className="sticky top-14 z-10 -mx-2 mb-4 flex items-baseline gap-2 bg-[#12080c]/90 px-2 py-2.5 backdrop-blur-sm sm:top-16"
                    >
                      <span className="font-[family-name:var(--font-display)] text-lg text-[#fff5f7] sm:text-xl">
                        {formatMonthHeading(group.key)}
                      </span>
                      <span className="text-xs text-[#f3b8c4]/55">
                        {group.items.length} ไลฟ์
                      </span>
                    </h3>
                    <ul className={COVER_GRID_CLASS}>
                      {group.items.map((item, i) => (
                        <CoverTile
                          key={item.videoId}
                          item={item}
                          onOpen={() => openAt(group.start + i)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
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
              onClick={() => setVisibleCount(visible.length + PAGE_STEP)}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                CTA_OUTLINE_CLASS,
                "px-6"
              )}
            >
              โหลดเพิ่ม
              <span className="ml-2 text-[#f3b8c4]/70">
                ({filtered.length - visible.length})
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
