"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";

import { SocialIconButton } from "@/components/icons/SocialIconButton";
import {
  hasDropdown,
  HOME_SECTION_IDS,
  NAV_ITEMS,
  navKeyForPath,
  navKeyForSection,
  SOCIALS_HASH,
  type NavItem,
  type NavKey,
} from "@/components/layout/header-nav";
import { HeaderLivePill } from "@/components/layout/HeaderLivePill";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { NavProjectList } from "@/components/layout/NavProjectList";
import { useHeaderLive } from "@/components/layout/useHeaderLive";
import { heroNameFont } from "@/lib/hero-fonts";
import { scrollToHashTarget } from "@/lib/scroll-to-hash";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

/** Hover intent: wait before opening (passing over) and before closing (leaving towards the panel). */
const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 250;

const FOCUSABLE = "a[href], button:not([disabled])";

type HeaderProps = {
  data: VtuberProfile;
};

/** Home section under the reading line (45% down the screen) — home page only. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Queried on every update: lazy sections mount after first paint.
    const selector = [...HOME_SECTION_IDS, SOCIALS_HASH.slice(1)].map((id) => `#${CSS.escape(id)}`).join(",");
    const update = () => {
      const line = window.innerHeight * 0.45;
      let hit: { id: string; top: number } | null = null;
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.top > line || rect.bottom <= line) continue;
        // Nested / overlapping sections: the one that starts lowest is the innermost.
        if (!hit || rect.top >= hit.top) hit = { id: el.id, top: rect.top };
      }
      setActive(hit?.id ?? null);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return enabled ? active : null;
}

export function Header({ data }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";
  const showLive = pathname !== "/live" && !pathname.startsWith("/live/");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  /** Desktop dropdown: opens on click/tap and on (intentional) mouse hover. */
  const [openMenu, setOpenMenu] = useState<NavKey | null>(null);
  const primaryNavRef = useRef<HTMLElement>(null);
  /** Set when a mouse hover opened the menu, so the click that follows keeps it open. */
  const hoverOpenedRef = useRef<NavKey | null>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  /** Home-page section, from any route (e.g. "#live" on home, "/#live" elsewhere). */
  const homeSectionHref = (hash: string) => (onHome ? hash : `/${hash}`);

  const { live, week } = useHeaderLive(onHome ? "#live" : "/live#this-week");
  const shownLive = showLive ? live : null;
  const liveAlert = shownLive && shownLive.state !== "later";

  const activeSection = useActiveSection(onHome);
  const activeKey = onHome ? navKeyForSection(activeSection) : navKeyForPath(pathname);

  const youtube = data.socials.find((s) => s.platform === "youtube");
  const x = data.socials.find((s) => s.platform === "x");

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };

  const closeMenu = (key?: NavKey) => {
    clearTimers();
    hoverOpenedRef.current = null;
    setOpenMenu((current) => (key === undefined || current === key ? null : current));
  };

  const toggleMenu = (key: NavKey) => {
    clearTimers();
    if (hoverOpenedRef.current === key) {
      hoverOpenedRef.current = null;
      setOpenMenu(key);
      return;
    }
    setOpenMenu((current) => (current === key ? null : key));
  };

  const hoverOpen = (key: NavKey) => {
    window.clearTimeout(closeTimer.current);
    if (openMenu === key) return;
    window.clearTimeout(openTimer.current);
    const show = () => {
      hoverOpenedRef.current = key;
      setOpenMenu(key);
    };
    // Moving straight from one open menu to the next swaps at once.
    if (openMenu) show();
    else openTimer.current = window.setTimeout(show, HOVER_OPEN_MS);
  };

  const hoverClose = (key: NavKey) => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => closeMenu(key), HOVER_CLOSE_MS);
  };

  const panelOf = (key: NavKey) => document.getElementById(`nav-menu-${key}`);

  const focusInPanel = (key: NavKey, which: "first" | "last") => {
    requestAnimationFrame(() => {
      const items = panelOf(key)?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items?.length) return;
      (which === "first" ? items[0] : items[items.length - 1]).focus();
    });
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: NavKey) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    clearTimers();
    setOpenMenu(key);
    focusInPanel(key, event.key === "ArrowDown" ? "first" : "last");
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>, key: NavKey) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = [...(panelOf(key)?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const resolveHref = (item: NavItem) => (onHome && item.homeHash ? item.homeHash : (item.href ?? "/"));

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    closeMenu();

    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return;

    const hash = href.slice(hashIndex);
    const path = href.slice(0, hashIndex) || pathname;

    // Same-page hash: always scroll (even if hash already matches)
    if (path === pathname) {
      event.preventDefault();
      scrollToHashTarget(hash, "smooth");
      if (window.location.hash !== hash) {
        history.pushState(null, "", hash);
      }
      return;
    }

    // From another route to /#section
    if (path === "/" && hash) {
      event.preventDefault();
      router.push(`/${hash}`);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!primaryNavRef.current?.contains(event.target as Node)) closeMenu();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeMenu();
      primaryNavRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${openMenu}"]`)?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMenu]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const itemClass = (item: NavItem, menuOpen = false) =>
    cn(
      "relative inline-flex h-[34px] items-center gap-1 rounded-full px-1.5 text-[13.5px] whitespace-nowrap transition lg:px-2.5 lg:text-sm",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc",
      menuOpen ? "bg-r-pri/14 text-r-text" : activeKey === item.key ? "text-r-text" : "text-r-text/80 hover:text-r-text",
      activeKey === item.key && "after:absolute after:inset-x-1.5 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-r-pri lg:after:inset-x-2.5"
    );

  const liveDot = (item: NavItem) =>
    item.key === "live" && liveAlert ? (
      <span className="r-ping-fast absolute top-1 right-0.5 size-1.5 rounded-full bg-r-pri" aria-hidden />
    ) : null;

  return (
    <header
      className={cn(
        heroNameFont.variable,
        "fixed inset-x-0 top-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-300",
        scrolled || open
          ? "border-b border-r-text-2/10 bg-r-bg/82 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:h-16 sm:px-5 lg:px-10 xl:max-w-[76rem]">
        <div className="flex min-w-0 items-center gap-2 lg:gap-4">
          <Link
            href={onHome ? "#top" : "/"}
            className="inline-flex shrink-0 items-baseline gap-1.5 font-r-name text-[1.3rem] leading-none font-extrabold text-r-text sm:text-[1.45rem]"
            onClick={(event) => {
              if (onHome) {
                event.preventDefault();
                scrollToHashTarget("#top", "smooth");
                if (window.location.hash !== "#top") {
                  history.pushState(null, "", "#top");
                }
              }
              setOpen(false);
            }}
          >
            {data.basic.name}
            <span className="font-sans text-[13px] font-normal" aria-hidden>
              {data.fan.oshiMark}
            </span>
          </Link>
          {shownLive ? (
            <HeaderLivePill live={shownLive} onNavigate={handleNavClick} className="hidden md:inline-flex" />
          ) : null}
        </div>

        <nav ref={primaryNavRef} className="hidden items-center gap-0.5 md:flex lg:gap-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            if (!hasDropdown(item)) {
              const href = resolveHref(item);
              return (
                <Link
                  key={item.key}
                  href={href}
                  aria-current={activeKey === item.key ? (onHome ? "location" : "page") : undefined}
                  onClick={(event) => handleNavClick(event, href)}
                  className={itemClass(item)}
                >
                  {item.label}
                </Link>
              );
            }

            const menuOpen = openMenu === item.key;
            const menuId = `nav-menu-${item.key}`;
            return (
              <div
                key={item.key}
                className="relative"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") hoverOpen(item.key);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") hoverClose(item.key);
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) closeMenu(item.key);
                }}
              >
                <button
                  type="button"
                  data-menu-trigger={item.key}
                  onClick={() => toggleMenu(item.key)}
                  onKeyDown={(event) => onTriggerKeyDown(event, item.key)}
                  aria-expanded={menuOpen}
                  aria-controls={menuId}
                  aria-current={activeKey === item.key ? (onHome ? "location" : "page") : undefined}
                  className={itemClass(item, menuOpen)}
                >
                  {item.label}
                  <ChevronDown aria-hidden className={cn("size-3.5 opacity-70 transition", menuOpen && "rotate-180")} />
                  {liveDot(item)}
                </button>
                {/* pt-2.5 = invisible bridge between the button and the panel */}
                <div
                  id={menuId}
                  onKeyDown={(event) => onPanelKeyDown(event, item.key)}
                  className={cn(
                    "absolute top-full z-50 pt-2.5 transition duration-150",
                    // Projects is the last item: anchor its wide panel to the right so it stays on screen.
                    item.key === "projects" ? "right-0" : "left-1/2 -translate-x-1/2",
                    menuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-[18px] border border-r-text-2/14 bg-[rgb(26_13_18/0.97)] p-2 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.7)] backdrop-blur-md",
                      item.key === "projects" ? "w-[340px]" : item.key === "about" ? "w-[230px]" : "w-[260px]"
                    )}
                  >
                    {item.key === "projects" ? (
                      <NavProjectList data={data} size="sm" onNavigate={handleNavClick} />
                    ) : (
                      <ul className="flex flex-col">
                        {item.children?.map((child) => {
                          const href = onHome && child.homeHash ? child.homeHash : child.href;
                          const current = pathname === child.href;
                          return (
                            <li key={child.href}>
                              <Link
                                href={href}
                                aria-current={current ? "page" : undefined}
                                onClick={(event) => handleNavClick(event, href)}
                                className={cn(
                                  "group/item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition hover:bg-r-text-2/8 focus-visible:bg-r-text-2/10",
                                  current ? "text-r-pri-hover" : "text-r-text"
                                )}
                              >
                                <child.icon
                                  aria-hidden
                                  className={cn(
                                    "size-[18px] shrink-0 transition-colors group-hover/item:text-r-pri group-focus-visible/item:text-r-pri",
                                    current ? "text-r-pri" : "text-r-text-2/70"
                                  )}
                                />
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {item.footer ? (
                      <div className="mx-1 mt-1 border-t border-r-text-2/12 px-2.5 pt-2.5 pb-1.5">
                        <Link
                          href={item.footer.href}
                          onClick={(event) => handleNavClick(event, item.footer!.href)}
                          className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-r-pri outline-none transition hover:text-r-pri-hover hover:gap-2 focus-visible:underline"
                        >
                          {item.footer.label}
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {shownLive ? <HeaderLivePill live={shownLive} onNavigate={handleNavClick} className="md:hidden" /> : null}
          {youtube ? (
            <SocialIconButton platform="youtube" href={youtube.url} label={youtube.label} size="sm" className="hidden lg:inline-flex" />
          ) : null}
          {x ? <SocialIconButton platform="x" href={x.url} label={x.label} size="sm" className="hidden lg:inline-flex" /> : null}
          <Link
            href={homeSectionHref(SOCIALS_HASH)}
            onClick={(event) => handleNavClick(event, homeSectionHref(SOCIALS_HASH))}
            className="hidden h-[34px] items-center rounded-full bg-r-pri px-3.5 text-[13px] font-semibold text-r-on-pri transition hover:bg-r-pri-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc md:inline-flex"
          >
            Follow
          </Link>
          <button
            type="button"
            className="-mr-1.5 inline-flex size-10 items-center justify-center rounded-full text-r-text transition hover:bg-r-pri/12 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          // Page scroll is locked while open, so the panel must scroll itself (header is h-14 / sm:h-16).
          "max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-t border-r-text-2/10 bg-r-bg/95 sm:max-h-[calc(100dvh-4rem)] md:hidden",
          open ? "block" : "hidden"
        )}
      >
        {open ? <MobileMenu data={data} onHome={onHome} live={shownLive} week={week} onNavigate={handleNavClick} /> : null}
      </div>
    </header>
  );
}
