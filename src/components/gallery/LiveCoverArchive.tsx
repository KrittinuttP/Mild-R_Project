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
  ExternalLink,
  Layers,
  LayoutGrid,
  MonitorPlay,
  Search,
  X,
} from "lucide-react";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { prefersReducedMotion } from "@/components/gallery/gallery-utils";
import {
  ImageLightbox,
  type ImageLightboxItem,
} from "@/components/media/ImageLightbox";
import { ProtectedImage } from "@/components/media/ProtectedImage";
import { buttonVariants } from "@/components/ui/button";
import { useLiveCovers } from "@/hooks/useLiveCovers";
import { useLoadMoreOnScroll } from "@/hooks/useLoadMoreOnScroll";
import {
  gsap,
  registerGsapPlugins,
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";
import type { LiveCoverItem, LiveCoverVersion } from "@/lib/live-streams";
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
/** Month view shows (and loads more) this many months at a time. */
const MONTH_STEP = 3;
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

function versionLabel(version: LiveCoverVersion): string {
  if (version.source === "x") return "X · HD";
  return version.capturedAt ? formatCaptured(version.capturedAt) : "YouTube";
}

function formatCaptured(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  });
}

const hdProbes = new Map<string, Promise<boolean>>();

/** YouTube answers a missing maxresdefault with a 120×90 placeholder (HTTP 404). */
function probeHdCover(url: string): Promise<boolean> {
  let probe = hdProbes.get(url);
  if (!probe) {
    probe = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 120);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    hdProbes.set(url, probe);
  }
  return probe;
}

function versionSrc(
  version: LiveCoverVersion | undefined,
  hdReady: ReadonlySet<string>
): string | undefined {
  if (!version) return undefined;
  return version.hdUrl && hdReady.has(version.hdUrl)
    ? version.hdUrl
    : version.url;
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
          <span className="line-clamp-2 min-h-[2.75em] text-sm leading-snug text-[#fff5f7]/90">
            {item.title}
          </span>
          <span className="mt-1.5 flex min-h-[2.875rem] min-w-0 flex-wrap content-start items-center gap-1.5 md:min-h-5">
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
      <span className="mt-2 block h-[2.75em] w-4/5 animate-pulse rounded bg-[#1d0d14] text-sm" />
      <span className="mt-1.5 block min-h-[2.875rem] md:min-h-5">
        <span className="block h-5 w-2/5 animate-pulse rounded bg-[#1d0d14]" />
      </span>
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
  eyebrow = "Live covers",
  title = "ปกไลฟ์",
  headingSize = "h2",
  showDivider = true,
  viewAllHref = "/gallery/live",
  className,
}: LiveCoverArchiveProps) {
  const preview = mode === "preview";
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [nearView, setNearView] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  /** `null` = newest year with lives · `"all"` = every year. */
  const [yearChoice, setYearChoice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const view = useSyncExternalStore(
    subscribeCoverView,
    readCoverView,
    () => "month" as const
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [visibleMonths, setVisibleMonths] = useState(MONTH_STEP);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [versionIndex, setVersionIndex] = useState(0);
  const [hdReady, setHdReady] = useState<ReadonlySet<string>>(() => new Set());

  const { covers, years, latestYear, status, retry } = useLiveCovers(
    nearView,
    preview
      ? { kind: "latest", limit: PREVIEW_COUNT }
      : yearChoice === "all"
        ? { kind: "all" }
        : { kind: "year", year: yearChoice }
  );
  const year = preview ? "all" : (yearChoice ?? latestYear ?? "all");

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

  const inYear = useMemo(
    () =>
      year === "all" ? searched : searched.filter((c) => coverYear(c) === year),
    [searched, year]
  );

  const counts = useMemo(() => {
    const out = { all: 0, own: 0, member: 0, collab: 0 } as Record<Filter, number>;
    for (const c of inYear) {
      for (const key of Object.keys(out) as Filter[]) {
        if (matchesFilter(c, key)) out[key] += 1;
      }
    }
    return out;
  }, [inYear]);

  const filtered = useMemo(
    () => inYear.filter((c) => matchesFilter(c, filter)),
    [inYear, filter]
  );

  const byMonth = !preview && view === "month";

  const allMonthGroups = useMemo(
    () => (byMonth ? groupByMonth(filtered) : []),
    [byMonth, filtered]
  );
  const monthGroups = allMonthGroups.slice(0, visibleMonths);

  const visible = preview
    ? filtered.slice(0, PREVIEW_COUNT)
    : byMonth
      ? monthGroups.flatMap((g) => g.items)
      : filtered.slice(0, visibleCount);
  const hasMore = !preview && visible.length < filtered.length;
  const active = activeIndex !== null ? (visible[activeIndex] ?? null) : null;
  const lightboxItems: ImageLightboxItem[] = visible.map((cover, index) => ({
    id: cover.videoId,
    src:
      versionSrc(
        cover.versions[index === activeIndex ? versionIndex : 0],
        hdReady
      ) ?? cover.coverUrl,
    alt: cover.title,
  }));

  const hdProbeKey =
    activeIndex === null || visible.length === 0
      ? ""
      : [
          visible[activeIndex]?.versions[versionIndex]?.hdUrl,
          visible[(activeIndex + 1) % visible.length]?.versions[0]?.hdUrl,
          visible[(activeIndex - 1 + visible.length) % visible.length]
            ?.versions[0]?.hdUrl,
        ]
          .filter(Boolean)
          .join(" ");

  useEffect(() => {
    if (!hdProbeKey) return;
    let cancelled = false;
    for (const url of hdProbeKey.split(" ")) {
      void probeHdCover(url).then((ok) => {
        if (!ok || cancelled) return;
        setHdReady((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [hdProbeKey]);

  const openAt = (index: number | null) => {
    setActiveIndex(index);
    setVersionIndex(0);
  };

  const resetPaging = () => {
    setVisibleCount(PAGE_STEP);
    setVisibleMonths(MONTH_STEP);
    openAt(null);
  };

  const selectFilter = (next: Filter) => {
    setFilter(next);
    resetPaging();
  };

  const selectYear = (next: string) => {
    setYearChoice(next);
    resetPaging();
  };

  const changeQuery = (next: string) => {
    // Searching spans every year (loads the whole archive once).
    if (!normalizedQuery && normalizeSearch(next)) setYearChoice("all");
    setQuery(next);
    resetPaging();
  };

  const selectView = (next: CoverView) => {
    if (next === view) return;
    writeCoverView(next);
    resetPaging();
  };

  const showMore = () => {
    if (byMonth) setVisibleMonths((m) => m + MONTH_STEP);
    else setVisibleCount(visible.length + PAGE_STEP);
  };

  const { sentinelRef, auto: autoLoad } = useLoadMoreOnScroll({
    hasMore: status === "ready" && hasMore,
    onLoadMore: showMore,
    resetKey: `${filter}|${year}|${normalizedQuery}|${view}`,
  });

  const matchesInOtherYears =
    year !== "all" && searched.some((c) => matchesFilter(c, filter));

  useGSAP(
    () => {
      const tiles = gsap.utils.toArray<HTMLElement>(
        "[data-cover-item]:not([data-revealed])",
        gridRef.current
      );
      tiles.forEach((tile) => tile.setAttribute("data-revealed", "true"));
      if (tiles.length > 0 && prefersReducedMotion()) {
        gsap.set(tiles, { autoAlpha: 1 });
      } else if (tiles.length > 0) {
        gsap.set(tiles, { autoAlpha: 0, y: 24 });
        // end "max" keeps tiles above the viewport active, so a jump (End key) still reveals them.
        ScrollTrigger.batch(tiles, {
          start: "top 94%",
          end: "max",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out",
              stagger: 0.05,
            }),
        });
      }
      // Filtering reflows tiles that keep their old triggers; re-measure so they reveal in place.
      ScrollTrigger.refresh();

      // Context revert (unmount, Strict Mode re-run) clears the styles; let the next run re-animate.
      return () => tiles.forEach((tile) => tile.removeAttribute("data-revealed"));
    },
    {
      scope: gridRef,
      dependencies: [
        visibleCount,
        visibleMonths,
        filter,
        year,
        normalizedQuery,
        view,
        status,
      ],
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

        {!preview && years.length > 0 ? (
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

            {years.length > 1 ? (
              <div
                className="col-span-2 row-start-3 flex flex-wrap gap-1.5 lg:col-span-1 lg:col-start-1 lg:row-start-2"
                role="group"
                aria-label="กรองตามปี"
              >
                {["all", ...years].map((key) => {
                  const selected = year === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectYear(key)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[0.7rem] transition sm:text-xs",
                        selected
                          ? "border-[#f3b8c4]/45 bg-[#f3b8c4]/12 text-[#fff5f7]"
                          : "border-[#f3b8c4]/12 text-[#f3b8c4]/60 hover:border-[#f3b8c4]/35 hover:text-[#fff5f7]"
                      )}
                    >
                      {key === "all" ? "ทุกปี" : key}
                    </button>
                  );
                })}
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
                  matchesInOtherYears ? selectYear("all") : changeQuery("")
                }
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  CTA_OUTLINE_CLASS
                )}
              >
                {matchesInOtherYears ? "ค้นหาในทุกปี" : "ล้างคำค้น"}
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

        {preview && status !== "error" && !(status === "ready" && covers.length === 0) ? (
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
              <ArrowUpRight className="size-4 opacity-80" />
            </Link>
          </div>
        ) : null}

        {autoLoad ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}

        {status === "ready" && hasMore && !autoLoad ? (
          <div className="mt-10 flex justify-center sm:mt-12">
            <button
              type="button"
              onClick={showMore}
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

      <ImageLightbox
        items={lightboxItems}
        activeIndex={active ? activeIndex : null}
        onActiveIndexChange={openAt}
        useProtectedImage
        prevLabel="ปกก่อนหน้า"
        nextLabel="ปกถัดไป"
        aspect="video"
        subtitle={
          active ? (
            <>
              <ChannelBadge item={active} />
              {active.date ? <span>{formatDate(active.date)}</span> : null}
            </>
          ) : null
        }
        drawer={
          active && active.versions.length > 1
            ? {
                label: "ปกเวอร์ชันอื่น",
                count: active.versions.length,
                icon: Layers,
                content: (
                  <ul className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto pb-1">
                    {active.versions.map((v, i) => (
                      <li key={v.url} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setVersionIndex(i)}
                          aria-label={`ปกเวอร์ชัน ${versionLabel(v)}`}
                          aria-pressed={versionIndex === i}
                          className={cn(
                            "block w-24 overflow-hidden rounded-lg border transition sm:w-28",
                            versionIndex === i
                              ? "border-[#e85a7a]/70"
                              : "border-[#f3b8c4]/15 opacity-70 hover:opacity-100"
                          )}
                        >
                          <ProtectedImage
                            src={v.thumbUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="aspect-video w-full object-cover"
                          />
                          <span className="block px-1.5 py-1 text-left text-[0.65rem] text-[#f3b8c4]/65">
                            {versionLabel(v)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ),
              }
            : undefined
        }
        footerStart={
          active ? (
            <a
              href={active.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#f3b8c4]/75 transition hover:text-[#f3b8c4]"
            >
              ดูบน YouTube
              <ExternalLink className="size-3.5 opacity-80" aria-hidden />
            </a>
          ) : null
        }
      />
    </section>
  );
}
