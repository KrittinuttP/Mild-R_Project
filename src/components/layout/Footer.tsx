import Link from "next/link";
import { KeyRound } from "lucide-react";

import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import { heroNameFont } from "@/lib/hero-fonts";
import { cn } from "@/lib/utils";
import type { VtuberProfile } from "@/types/vtuber";

type FooterProps = {
  data: VtuberProfile;
};

/** One list in header order (5 Nov): no duplicate "Media", About / Member scroll on the home page. */
const FOOTER_NAV = [
  { href: "/#lore", label: "About" },
  { href: "/live", label: "Live" },
  { href: "/media", label: "Media" },
  { href: "/gallery/archive", label: "Gallery" },
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
  { href: "/#member", label: "Member" },
] as const;

const DEVELOPER = {
  name: "ZAYZHIK 🦈",
  xUrl: "https://x.com/ZAYZHIK_KungV2",
} as const;

export function DeveloperCredit() {
  return (
    <p className="m-0 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0 leading-none">
      <span>Made with 🩷 by</span>
      <Link
        href={DEVELOPER.xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1 rounded transition hover:text-r-pri focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
      >
        <span>{DEVELOPER.name}</span>
        <SocialPlatformIcon
          platform="x"
          className="size-[0.85em] shrink-0 opacity-80 transition group-hover:opacity-100"
        />
        <span className="sr-only">on X</span>
      </Link>
    </p>
  );
}

export function Footer({ data }: FooterProps) {
  const year = new Date().getFullYear();
  const footerSocials = data.socials.filter(
    (social) => social.id !== "lumina-project"
  );

  return (
    <footer className="relative bg-[color-mix(in_srgb,var(--r-bg)_80%,black)] px-5 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] text-r-text sm:px-10 sm:py-16 lg:px-16">
      <div aria-hidden className="r-hairline absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
          <div>
            {/* Same wordmark as the header (5 Nov). */}
            <Link
              href="/#top"
              className={cn(
                heroNameFont.variable,
                "inline-flex items-baseline gap-1.5 rounded font-r-name text-[1.75rem] leading-none font-extrabold text-r-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-acc sm:text-[2rem]"
              )}
            >
              {data.basic.name}
              <span className="font-sans text-base font-normal" aria-hidden>
                {data.fan.oshiMark}
              </span>
            </Link>
            <p className="mt-3 text-sm text-r-text-3">
              {data.basic.unit} · {data.basic.agency}
            </p>

            {footerSocials.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2 sm:gap-x-5 sm:gap-y-2.5 text-sm">
                {footerSocials.map((social) => (
                  <li key={social.id}>
                    <Link
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex size-10 items-center justify-center rounded text-r-text/85 transition hover:text-r-pri sm:size-auto sm:justify-start sm:gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
                    >
                      <SocialPlatformIcon
                        platform={social.platform}
                        className="size-4 sm:size-3.5"
                      />
                      <span className="hidden sm:inline">{social.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Footer navigation" className="flex flex-col gap-1.5 text-sm md:items-end md:text-right">
            <span className="text-xs tracking-[0.2em] text-r-acc uppercase">Explore</span>
            {/* Phones: taller rows so links are easy to tap. */}
            <ul className="-mx-1 grid grid-cols-4 md:mx-0 md:flex md:max-w-md md:flex-wrap md:justify-end md:gap-x-4 md:gap-y-1">
              {FOOTER_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center rounded px-1 text-r-text/85 transition hover:text-r-pri focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc md:min-h-0 md:px-0"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 space-y-5 border-t border-r-text-2/10 pt-8 text-xs leading-relaxed text-r-text-3 sm:text-sm">
          {/* One disclaimer (5 Nov) — "not affiliated" sits right after "unofficial". */}
          <p>
            Unofficial fan site — not affiliated with Lumina Project.
            <br className="hidden sm:block" /> {data.basic.name} and related assets belong to their respective owners.
          </p>

          <div className="flex flex-col gap-3 text-xs leading-none tracking-wide sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
            <p className="m-0 inline-flex items-center gap-1.5 leading-none">
              <span>© {year}</span>
              <Link
                href="/admin"
                prefetch={false}
                rel="nofollow"
                aria-label="Admin"
                className="inline-flex rounded text-r-text-2/25 transition hover:text-r-pri focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
              >
                <KeyRound className="size-3" aria-hidden />
              </Link>
            </p>
            <DeveloperCredit />
          </div>
        </div>
      </div>
    </footer>
  );
}
