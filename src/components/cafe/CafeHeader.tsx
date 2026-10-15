"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Classified } from "@/components/cafe/board/pieces";
import { SherlockSweetieLogo } from "@/components/cafe/SherlockSweetieLogo";
import { buttonVariants } from "@/components/ui/button";
import { scrollToHashTarget } from "@/lib/scroll-to-hash";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

type CafeNavLink =
  | { label: string; kind: "section"; hash: string }
  | { label: string; kind: "page"; href: string }
  | { label: string; kind: "external"; href: string };

const CAFE_NAV: CafeNavLink[] = [
  { kind: "section", hash: "#overview", label: "Overview" },
  { kind: "section", hash: "#menu", label: "Menu · Pre-order" },
  { kind: "section", hash: "#activities", label: "Activities" },
  { kind: "section", hash: "#goods", label: "Goods" },
  { kind: "section", hash: "#venue-menu", label: "Venue Menu" },
  { kind: "section", hash: "#story", label: "Story · Gallery" },
];

type CafeHeaderProps = {
  cafe: CafePage;
  mildRHomeHref?: string;
  showMainSiteLink?: boolean;
  /** The date is the dispatch date, which has its own visibility toggle. */
  showDate?: boolean;
};

export function CafeHeader({
  cafe,
  mildRHomeHref = "/",
  showMainSiteLink = true,
  showDate = true,
}: CafeHeaderProps) {
  const pathname = usePathname();
  const onCafeRoot = pathname === "/cafe" || pathname === "/cafe/";
  const onEventPage =
    pathname === "/cafe/event" || pathname === "/cafe/event/";
  const onSecretPreview =
    pathname === "/cafe/secret" || pathname === "/cafe/secret/";
  const showHomeLink = showMainSiteLink || onSecretPreview;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const masthead = cafe.edition?.masthead ?? cafe.title;

  const resolveHref = (link: CafeNavLink) => {
    if (link.kind === "section") {
      return onCafeRoot ? link.hash : `/cafe${link.hash}`;
    }
    return link.href;
  };

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    setOpen(false);

    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return;

    const hash = href.slice(hashIndex);
    const path = href.slice(0, hashIndex) || "/cafe";

    if (onCafeRoot && (path === "" || path === "/cafe")) {
      event.preventDefault();
      scrollToHashTarget(hash, "smooth");
      if (window.location.hash !== hash) {
        history.pushState(null, "", hash);
      }
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
          ? "border-b border-cafe-gold/25 bg-cafe-ground/88 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex min-h-14 max-w-[1280px] items-center justify-between gap-3 px-5 pt-[env(safe-area-inset-top)] sm:h-16 sm:gap-4 sm:px-8">
        <div className="min-w-0 flex-1">
          <Link
            href="/cafe"
            aria-label={masthead}
            className="flex min-w-0 text-[15px] sm:text-[17px]"
            onClick={(event) => {
              if (onCafeRoot) {
                event.preventDefault();
                scrollToHashTarget("#overview", "smooth");
                if (window.location.hash !== "#overview") {
                  history.pushState(null, "", "#overview");
                }
              }
              setOpen(false);
            }}
          >
            <SherlockSweetieLogo variant="inline" label={masthead} as="span" />
          </Link>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 sm:flex">
            {cafe.dispatch.schedule.label ? (
              <span className="shrink-0 font-[family-name:var(--font-cafe-serif)] text-[0.65rem] font-bold tracking-[0.18em] text-cafe-gold-soft">
                <Classified hidden={!showDate} tone="wall">
                  {cafe.dispatch.schedule.label}
                </Classified>
              </span>
            ) : null}
            {cafe.edition?.caseNo ? (
              <span className="hidden truncate font-[family-name:var(--font-cafe-serif)] text-[0.55rem] tracking-[0.14em] text-cafe-gold/90 uppercase sm:inline sm:text-[0.58rem] sm:tracking-[0.18em]">
                {cafe.edition.caseNo}
              </span>
            ) : null}
            {showHomeLink ? (
              <Link
                href={mildRHomeHref}
                className="hidden text-[0.65rem] tracking-[0.18em] text-cafe-gold uppercase transition hover:text-cafe-gold-soft sm:inline"
              >
                เว็บหลัก →
              </Link>
            ) : null}
          </div>
        </div>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Cafe"
        >
          {CAFE_NAV.map((link, index) => {
            const href = resolveHref(link);
            const active =
              link.kind === "page" &&
              (link.href === pathname ||
                (link.href === "/cafe/event" && onEventPage));
            return (
              <span key={link.label} className="flex items-center">
                {index > 0 ? (
                  <span
                    className="mx-2 text-cafe-gold/40 select-none"
                    aria-hidden
                  >
                    ·
                  </span>
                ) : null}
                <Link
                  href={href}
                  target={link.kind === "external" ? "_blank" : undefined}
                  rel={
                    link.kind === "external" ? "noopener noreferrer" : undefined
                  }
                  onClick={(event) => handleNavClick(event, href)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[0.72rem] tracking-[0.12em] uppercase transition",
                    link.kind === "section" &&
                      link.hash === "#menu" &&
                      "text-cafe-gold",
                    active
                      ? "bg-cafe-gold/15 text-cafe-cream"
                      : "hover:bg-white/[0.04] hover:text-cafe-cream",
                    !(link.kind === "section" && link.hash === "#menu") &&
                      !active &&
                      "text-cafe-muted"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </span>
            );
          })}
        </nav>

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "rounded-full text-cafe-cream lg:hidden"
          )}
          aria-expanded={open}
          aria-controls="cafe-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <div
        id="cafe-mobile-nav"
        className={cn(
          "border-t border-cafe-gold/20 bg-cafe-ground/95 backdrop-blur-md lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-0.5 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
          aria-label="Cafe mobile"
        >
          {CAFE_NAV.map((link) => {
            const href = resolveHref(link);
            const active =
              link.kind === "page" &&
              (link.href === pathname ||
                (link.href === "/cafe/event" && onEventPage));
            return (
              <Link
                key={link.label}
                href={href}
                target={link.kind === "external" ? "_blank" : undefined}
                rel={
                  link.kind === "external" ? "noopener noreferrer" : undefined
                }
                className={cn(
                  "min-h-12 rounded-2xl px-3 py-3.5 text-base tracking-wide uppercase transition",
                  link.kind === "section" &&
                    link.hash === "#menu" &&
                    "text-cafe-gold",
                  active
                    ? "bg-cafe-gold/12 text-cafe-cream"
                    : "hover:bg-white/[0.04] hover:text-cafe-cream",
                  !(link.kind === "section" && link.hash === "#menu") &&
                    !active &&
                    "text-cafe-text"
                )}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleNavClick(event, href)}
              >
                {link.label}
              </Link>
            );
          })}
          {showHomeLink ? (
            <Link
              href={mildRHomeHref}
              className="min-h-12 border-t border-cafe-gold/15 px-3 py-3.5 text-sm tracking-wide text-cafe-gold transition hover:text-cafe-gold-soft"
              onClick={() => setOpen(false)}
            >
              เว็บหลัก →
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
