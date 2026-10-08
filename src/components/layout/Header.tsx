"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";

import { GALLERY_CATEGORIES } from "@/components/gallery/gallery-categories";
import { LiveTodayBanner } from "@/components/layout/LiveTodayBanner";
import { buttonVariants } from "@/components/ui/button";
import { scrollToHashTarget } from "@/lib/scroll-to-hash";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type SubNavLink = { label: string; href: string };

type NavLink =
  | {
      label: string;
      kind: "section";
      hash: string;
      children?: readonly SubNavLink[];
    }
  | {
      label: string;
      kind: "page";
      href: string;
      homeHash?: string;
      children?: readonly SubNavLink[];
    };

const NAV_LINKS: NavLink[] = [
  {
    kind: "section",
    hash: "#top",
    label: "Profile",
    children: [
      // Hero+Profile scrollytelling starts at #top (desktop profile pin breaks #profile)
      { label: "แนะนำตัว", href: "/#top" },
      { label: "Member", href: "/#member" },
      { label: "Lore", href: "/#lore" },
    ],
  },
  {
    kind: "page",
    href: "/live",
    homeHash: "#live",
    label: "Live",
    children: [
      { label: "ไลฟ์สัปดาห์นี้", href: "/live#this-week" },
      { label: "ปฏิทินรายเดือน", href: "/live#calendar" },
      { label: "ตารางรายสัปดาห์", href: "/live#weekly" },
    ],
  },
  {
    kind: "page",
    href: "/media",
    homeHash: "#media",
    label: "Media",
    children: [{ label: "คลังคลิปทั้งหมด", href: "/media" }],
  },
  {
    kind: "page",
    href: "/events",
    homeHash: "#events",
    label: "Events",
    children: [{ label: "อีเวนต์ทั้งหมด", href: "/events" }],
  },
  {
    kind: "page",
    href: "/gallery",
    homeHash: "#gallery",
    label: "Gallery",
    children: GALLERY_CATEGORIES,
  },
  {
    kind: "page",
    href: "/projects",
    homeHash: "#projects",
    label: "Fan Projects",
  },
  { kind: "section", hash: "#socials", label: "Follow" },
];

/** Home-section entry shown first in a page link's dropdown (e.g. Live → #live). */
function homeHashOf(link: NavLink) {
  return link.kind === "page" ? link.homeHash : undefined;
}

type HeaderProps = {
  data: VtuberProfile;
};

export function Header({ data }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";
  const showLiveBanner = pathname !== "/live" && !pathname.startsWith("/live/");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  /** Desktop dropdown: opens on click/tap (touch has no hover) and on mouse hover. */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const primaryNavRef = useRef<HTMLElement>(null);
  /** Set when a mouse hover opened the menu, so the click that follows keeps it open. */
  const hoverOpenedRef = useRef<string | null>(null);
  /** Mobile accordion: one group expanded at a time. */
  const [mobileOpenMenu, setMobileOpenMenu] = useState<string | null>(null);

  const closeMenu = (label?: string) => {
    hoverOpenedRef.current = null;
    setOpenMenu((current) => (label === undefined || current === label ? null : current));
  };

  const toggleMenu = (label: string) => {
    if (hoverOpenedRef.current === label) {
      hoverOpenedRef.current = null;
      setOpenMenu(label);
      return;
    }
    setOpenMenu((current) => (current === label ? null : label));
  };

  const resolveHref = (link: NavLink) => {
    if (link.kind === "section") {
      return onHome ? link.hash : `/${link.hash}`;
    }
    if (onHome && link.homeHash) return link.homeHash;
    return link.href;
  };

  /** Home-page section, from any route (e.g. "#live" on home, "/#live" elsewhere). */
  const homeSectionHref = (hash: string) => (onHome ? hash : `/${hash}`);

  const isActive = (link: NavLink) => {
    if (link.kind === "page") {
      return pathname === link.href || pathname.startsWith(`${link.href}/`);
    }
    return false;
  };

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    setOpen(false);

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

  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!primaryNavRef.current?.contains(event.target as Node)) {
        hoverOpenedRef.current = null;
        setOpenMenu(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      hoverOpenedRef.current = null;
      setOpenMenu(null);
      primaryNavRef.current
        ?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${openMenu}"]`)
        ?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-300",
        scrolled || open
          ? "border-b border-[#f3b8c4]/10 bg-[#140a0d]/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 pt-[env(safe-area-inset-top)] sm:h-16 sm:px-10 lg:px-16">
        <Link
          href={onHome ? "#top" : "/"}
          className="font-[family-name:var(--font-display)] text-base font-normal tracking-normal text-[#fff5f7] sm:text-lg"
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
          <span className="ml-1.5 text-sm font-medium text-[#e85a7a] sm:ml-2">
            {data.fan.oshiMark}
          </span>
        </Link>

        <nav
          ref={primaryNavRef}
          className="hidden items-center gap-5 lg:gap-7 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const href = resolveHref(link);
            const linkClass = cn(
              "text-sm tracking-wide transition hover:text-[#fff5f7]",
              isActive(link) ? "text-[#fff5f7]" : "text-[#f7d7de]/80"
            );

            if (link.children?.length) {
              const menuOpen = openMenu === link.label;
              const menuId = `nav-menu-${link.label.toLowerCase().replace(/\s+/g, "-")}`;
              const homeHash = homeHashOf(link);
              return (
                <div
                  key={link.label}
                  className="relative"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "mouse" || menuOpen) return;
                    hoverOpenedRef.current = link.label;
                    setOpenMenu(link.label);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") closeMenu(link.label);
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      closeMenu(link.label);
                    }
                  }}
                >
                  <button
                    type="button"
                    data-menu-trigger={link.label}
                    onClick={() => toggleMenu(link.label)}
                    aria-expanded={menuOpen}
                    aria-controls={menuId}
                    className={cn(linkClass, "inline-flex items-center gap-1")}
                  >
                    {link.label}
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-3.5 opacity-70 transition",
                        menuOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <div
                    id={menuId}
                    className={cn(
                      "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition duration-150",
                      menuOpen ? "visible opacity-100" : "invisible opacity-0"
                    )}
                  >
                    <ul className="min-w-44 rounded-xl border border-[#f3b8c4]/15 bg-[#140a0d]/95 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
                      {homeHash ? (
                        <li className="mb-1 border-b border-[#f3b8c4]/10 pb-1">
                          <Link
                            href={homeSectionHref(homeHash)}
                            onClick={(event) => {
                              closeMenu();
                              handleNavClick(event, homeSectionHref(homeHash));
                            }}
                            className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-[#f7d7de]/80 transition hover:bg-[#e85a7a]/15 hover:text-[#fff5f7] focus-visible:bg-[#e85a7a]/15 focus-visible:outline-none"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ) : null}
                      {link.children.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={childActive ? "page" : undefined}
                              onClick={(event) => {
                                closeMenu();
                                handleNavClick(event, child.href);
                              }}
                              className={cn(
                                "block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition hover:bg-[#e85a7a]/15 hover:text-[#fff5f7] focus-visible:bg-[#e85a7a]/15 focus-visible:outline-none",
                                childActive ? "text-[#fff5f7]" : "text-[#f7d7de]/80"
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.label}
                href={href}
                onClick={(event) => handleNavClick(event, href)}
                className={linkClass}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "text-[#fff5f7] md:hidden"
          )}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => {
            if (!open) {
              const current = NAV_LINKS.find(
                (link) => link.kind === "page" && link.children?.length && isActive(link)
              );
              setMobileOpenMenu(current?.label ?? null);
            }
            setOpen(!open);
          }}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {showLiveBanner ? (
        <div className={open ? "hidden" : undefined}>
          <LiveTodayBanner />
        </div>
      ) : null}

      <div
        id="mobile-nav"
        className={cn(
          // Page scroll is locked while open, so the panel must scroll itself (header is h-14 / sm:h-16).
          "max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-t border-[#f3b8c4]/10 bg-[#140a0d]/95 sm:max-h-[calc(100dvh-4rem)] md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-0.5 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link) => {
            const href = resolveHref(link);

            if (link.children?.length) {
              const expanded = mobileOpenMenu === link.label;
              const panelId = `mobile-nav-menu-${link.label.toLowerCase().replace(/\s+/g, "-")}`;
              const homeHash = homeHashOf(link);
              const subLinks: SubNavLink[] = [
                ...(homeHash
                  ? [{ label: link.label, href: homeSectionHref(homeHash) }]
                  : []),
                ...link.children,
              ];
              return (
                <div key={link.label} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() =>
                      setMobileOpenMenu((current) =>
                        current === link.label ? null : link.label
                      )
                    }
                    className={cn(
                      "flex min-h-12 items-center justify-between py-3.5 text-left text-base transition hover:text-[#fff5f7]",
                      expanded || isActive(link) ? "text-[#fff5f7]" : "text-[#f7d7de]"
                    )}
                  >
                    {link.label}
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 opacity-70 transition-transform duration-200",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>
                  <div
                    id={panelId}
                    inert={!expanded ? true : undefined}
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                      expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="mb-1 flex flex-col border-l border-[#f3b8c4]/15 pl-4">
                        {subLinks.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={pathname === child.href ? "page" : undefined}
                            className={cn(
                              "min-h-11 py-3 text-sm transition hover:text-[#fff5f7]",
                              pathname === child.href
                                ? "text-[#fff5f7]"
                                : "text-[#f7d7de]/70"
                            )}
                            onClick={(event) => handleNavClick(event, child.href)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.label}
                href={href}
                className="flex min-h-12 items-center py-3.5 text-base text-[#f7d7de] transition hover:text-[#fff5f7]"
                onClick={(event) => handleNavClick(event, href)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
