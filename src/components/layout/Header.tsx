"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

const NAV_LINKS = [
  { href: "#profile", label: "Profile" },
  { href: "#lore", label: "Lore" },
  { href: "#gallery", label: "Gallery" },
  { href: "#socials", label: "Connect" },
] as const;

type HeaderProps = {
  data: VtuberProfile;
};

export function Header({ data }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
          href="#top"
          className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[#fff5f7] sm:text-lg"
          onClick={() => setOpen(false)}
        >
          {data.basic.name}
          <span className="ml-1.5 text-sm font-medium text-[#e85a7a] sm:ml-2">
            {data.fan.oshiMark}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm tracking-wide text-[#f7d7de]/80 transition hover:text-[#fff5f7]"
            >
              {link.label}
            </Link>
          ))}
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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="min-h-12 py-3.5 text-base text-[#f7d7de] transition hover:text-[#fff5f7]"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
