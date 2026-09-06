import Link from "next/link";
import { X } from "lucide-react";

import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import type { VtuberProfile } from "@/types/vtuber";

type FooterProps = {
  data: VtuberProfile;
};

const FOOTER_NAV_GROUPS = [
  {
    title: "Home",
    links: [
      { href: "/#top", label: "Profile" },
      { href: "/#lore", label: "Lore" },
      { href: "/#media", label: "Media" },
      { href: "/#socials", label: "Connect" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/gallery", label: "Gallery" },
      { href: "/fan-art", label: "Fan art" },
      { href: "/events", label: "Events" },
      { href: "/live", label: "Live" },
      { href: "/projects", label: "Projects" },
    ],
  },
] as const;

const DEVELOPER = {
  name: "ZAYZHIK 🦈",
  xUrl: "https://x.com/ZAYZHIK_KungV2",
} as const;

function DeveloperCredit() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide text-[#f3b8c4]/45">
      <span>Made with 🩷 by</span>
      <Link
        href={DEVELOPER.xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 transition hover:text-[#e85a7a]"
      >
        <span>{DEVELOPER.name}</span>
        <span
          className="inline-flex size-6 items-center justify-center rounded-full border border-[#f3b8c4]/35 text-[#f7d7de]/90 transition group-hover:border-[#e85a7a]/55 group-hover:text-[#e85a7a]"
          aria-hidden
        >
          <X className="size-3.5" />
        </span>
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

  const disclaimer = (
    <p className="text-xs leading-relaxed text-[#f3b8c4]/50 sm:text-sm sm:text-[#f3b8c4]/55">
      Unofficial fanclub site for {data.fan.fanName} {data.fan.oshiMark}. All
      rights to {data.basic.name} and related assets belong to their respective
      owners.
    </p>
  );

  return (
    <footer className="border-t border-[#f3b8c4]/10 bg-[#0e0609] px-5 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] text-[#fff5f7] sm:px-10 sm:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-normal sm:text-3xl">
              {data.basic.name}
            </p>
            <p className="mt-2 text-sm text-[#f3b8c4]/70">
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
                      className="inline-flex size-10 items-center justify-center text-[#f7d7de]/85 transition hover:text-[#e85a7a] sm:size-auto sm:justify-start sm:gap-1.5"
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

          <nav
            aria-label="Footer navigation"
            className="space-y-4 md:text-right"
          >
            {FOOTER_NAV_GROUPS.map((group) => (
              <div
                key={group.title}
                className="flex flex-col gap-1 text-sm md:items-end"
              >
                <span className="text-xs text-[#e85a7a]/85">{group.title}</span>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[#f7d7de]/85 transition hover:text-[#e85a7a]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="pt-2 md:hidden">{disclaimer}</div>
          </nav>
        </div>

        <div className="mt-10 space-y-4 border-t border-[#f3b8c4]/10 pt-8">
          <div className="hidden md:block">{disclaimer}</div>

          <div className="flex flex-col gap-3 text-xs tracking-wide text-[#f3b8c4]/45 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
            <p>© {year} Fan-made · Not affiliated with Lumina Project</p>
            <DeveloperCredit />
          </div>
        </div>
      </div>
    </footer>
  );
}
