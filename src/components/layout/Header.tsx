"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";

import { GALLERY_CATEGORIES } from "@/components/gallery/gallery-categories";
import { buttonVariants } from "@/components/ui/button";
import { scrollToHashTarget } from "@/lib/scroll-to-hash";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type SubNavLink = { label: string; href: string };

type NavLink =
  | { label: string; kind: "section"; hash: string }
  | {
      label: string;
      kind: "page";
      href: string;
      homeHash?: string;
      children?: readonly SubNavLink[];
    };

const NAV_LINKS: NavLink[] = [
  // Hero+Profile scrollytelling starts at #top (desktop profile pin breaks #profile)
  { kind: "section", hash: "#top", label: "Profile" },
  { kind: "section", hash: "#lore", label: "Lore" },
  { kind: "section", hash: "#media", label: "Media" },
  {
    kind: "page",
    href: "/events",
    homeHash: "#events",
    label: "Events",
    children: [
      { label: "อีเวนต์เร็วๆ นี้", href: "/events#upcoming" },
      { label: "อีเวนต์ที่ผ่านมา", href: "/events#past" },
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
    href: "/gallery",
    homeHash: "#gallery",
    label: "Gallery",
    children: GALLERY_CATEGORIES,
  },
  { kind: "page", href: "/projects", homeHash: "#projects", label: "Projects" },
  { kind: "section", hash: "#socials", label: "Connect" },
];

type HeaderProps = {
  data: VtuberProfile;
};

export function Header({ data }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  /** Desktop dropdown forced shut after a click/Esc until the pointer or focus leaves it. */
  const [closedMenu, setClosedMenu] = useState<string | null>(null);

  const closeMenu = (label: string) => {
    // Blur first: its onBlur release must run before the suppression is set.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setClosedMenu(label);
  };

  const releaseMenu = (label: string) => {
    setClosedMenu((current) => (current === label ? null : current));
  };

  const resolveHref = (link: NavLink) => {
    if (link.kind === "section") {
      return onHome ? link.hash : `/${link.hash}`;
    }
    if (onHome && link.homeHash) return link.homeHash;
    return link.href;
  };

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
          className="hidden items-center gap-5 lg:gap-7 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const href = resolveHref(link);
            const linkClass = cn(
              "text-sm tracking-wide transition hover:text-[#fff5f7]",
              isActive(link) ? "text-[#fff5f7]" : "text-[#f7d7de]/80"
            );

            if (link.kind === "page" && link.children?.length) {
              const suppressed = closedMenu === link.label;
              return (
                <div
                  key={link.label}
                  className="group relative"
                  onMouseLeave={() => releaseMenu(link.label)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      releaseMenu(link.label);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") closeMenu(link.label);
                  }}
                >
                  <Link
                    href={href}
                    onClick={(event) => {
                      closeMenu(link.label);
                      handleNavClick(event, href);
                    }}
                    aria-haspopup="true"
                    className={cn(linkClass, "inline-flex items-center gap-1")}
                  >
                    {link.label}
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-3.5 opacity-70 transition",
                        !suppressed &&
                          "group-hover:rotate-180 group-focus-within:rotate-180"
                      )}
                    />
                  </Link>
                  <div
                    className={cn(
                      "invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition duration-150",
                      !suppressed &&
                        "group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                    )}
                  >
                    <ul className="min-w-44 rounded-xl border border-[#f3b8c4]/15 bg-[#140a0d]/95 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
                      {link.children.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={childActive ? "page" : undefined}
                              onClick={(event) => {
                                closeMenu(link.label);
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
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "border-t border-[#f3b8c4]/10 bg-[#140a0d]/95 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-0.5 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link) => {
            const href = resolveHref(link);
            return (
              <div key={link.label} className="flex flex-col">
                <Link
                  href={href}
                  className="min-h-12 py-3.5 text-base text-[#f7d7de] transition hover:text-[#fff5f7]"
                  onClick={(event) => handleNavClick(event, href)}
                >
                  {link.label}
                </Link>
                {link.kind === "page" && link.children?.length ? (
                  <div className="mb-1 flex flex-col border-l border-[#f3b8c4]/15 pl-4">
                    {link.children.map((child) => (
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
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
