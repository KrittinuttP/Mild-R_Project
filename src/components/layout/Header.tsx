"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { scrollToHashTarget } from "@/lib/scroll-to-hash";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type NavLink =
  | { label: string; kind: "section"; hash: string }
  | { label: string; kind: "page"; href: string; homeHash?: string };

const NAV_LINKS: NavLink[] = [
  // Hero+Profile scrollytelling starts at #top (desktop profile pin breaks #profile)
  { kind: "section", hash: "#top", label: "Profile" },
  { kind: "section", hash: "#lore", label: "Lore" },
  { kind: "page", href: "/gallery", homeHash: "#gallery", label: "Gallery" },
  { kind: "page", href: "/fan-art", homeHash: "#fan-art", label: "Fan art" },
  { kind: "section", hash: "#media", label: "Media" },
  { kind: "page", href: "/events", homeHash: "#events", label: "Events" },
  { kind: "page", href: "/live", homeHash: "#live", label: "Live" },
  { kind: "section", hash: "#socials", label: "Connect" },
  { kind: "page", href: "/projects", label: "Projects" },
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
    const path = href.slice(0, hashIndex) || "/";

    // Same-page hash: always scroll (even if hash already matches)
    if (onHome && (path === "" || path === "/")) {
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
            return (
              <Link
                key={link.label}
                href={href}
                onClick={(event) => handleNavClick(event, href)}
                className={cn(
                  "text-sm tracking-wide transition hover:text-[#fff5f7]",
                  isActive(link) ? "text-[#fff5f7]" : "text-[#f7d7de]/80"
                )}
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
              <Link
                key={link.label}
                href={href}
                className="min-h-12 py-3.5 text-base text-[#f7d7de] transition hover:text-[#fff5f7]"
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
