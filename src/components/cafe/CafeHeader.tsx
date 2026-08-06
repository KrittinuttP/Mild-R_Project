"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

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
  { kind: "section", hash: "#plates", label: "Plates" },
  { kind: "section", hash: "#day-schedule", label: "Schedule" },
  { kind: "section", hash: "#menu", label: "Menu" },
  { kind: "section", hash: "#goods", label: "Goods" },
  { kind: "page", href: "/projects/cafe", label: "Case file" },
];

type CafeHeaderProps = {
  cafe: CafePage;
  mildRHomeHref?: string;
};

export function CafeHeader({
  cafe,
  mildRHomeHref = "/",
}: CafeHeaderProps) {
  const pathname = usePathname();
  const onCafeRoot = pathname === "/cafe" || pathname === "/cafe/";
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
          ? "border-b border-[#9a7b5a]/35 bg-[#0a0c0e]/92 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      {(scrolled || open) && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#9a7b5a]/20"
          aria-hidden
        />
      )}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 pt-[env(safe-area-inset-top)] sm:h-16 sm:px-10 lg:px-16">
        <div className="min-w-0">
          <Link
            href="/cafe"
            className="block font-[family-name:var(--font-cafe-serif)] text-base font-semibold tracking-tight text-[#f4ebe3] italic sm:text-lg"
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
            {masthead}
          </Link>
          <div className="mt-0.5 hidden items-center gap-2 sm:flex">
            {cafe.edition?.caseNo ? (
              <span className="text-[0.58rem] tracking-[0.18em] text-[#9a7b5a]/90 uppercase">
                {cafe.edition.caseNo}
              </span>
            ) : null}
            <Link
              href={mildRHomeHref}
              className="text-[0.65rem] tracking-[0.18em] text-[#a84d5f] uppercase transition hover:text-[#c46a7a]"
            >
              เว็บหลัก →
            </Link>
          </div>
        </div>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Cafe"
        >
          {CAFE_NAV.map((link, index) => {
            const href = resolveHref(link);
            return (
              <span key={link.label} className="flex items-center">
                {index > 0 ? (
                  <span
                    className="mx-2 text-[#9a7b5a]/50 select-none"
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
                  className="text-[0.8rem] tracking-[0.14em] text-[#c4b8a8] uppercase transition hover:text-[#f4ebe3]"
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
            "rounded-none text-[#f4ebe3] md:hidden"
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
          "border-t border-[#9a7b5a]/25 bg-[#0a0c0e]/95 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-0.5 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
          aria-label="Cafe mobile"
        >
          {CAFE_NAV.map((link) => {
            const href = resolveHref(link);
            return (
              <Link
                key={link.label}
                href={href}
                target={link.kind === "external" ? "_blank" : undefined}
                rel={
                  link.kind === "external" ? "noopener noreferrer" : undefined
                }
                className="min-h-12 py-3.5 text-base tracking-wide text-[#d8d0c4] uppercase transition hover:text-[#f4ebe3]"
                onClick={(event) => handleNavClick(event, href)}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={mildRHomeHref}
            className="min-h-12 border-t border-[#9a7b5a]/20 py-3.5 text-sm tracking-wide text-[#a84d5f] transition hover:text-[#c46a7a]"
            onClick={() => setOpen(false)}
          >
            เว็บหลัก →
          </Link>
        </nav>
      </div>
    </header>
  );
}
