import Link from "next/link";
import { ExternalLink, Play, X } from "lucide-react";

import type { VtuberProfile } from "@/types/vtuber";

type FooterProps = {
  data: VtuberProfile;
};

const FOOTER_LINKS = [
  { href: "/#top", label: "Profile" },
  { href: "/gallery", label: "Gallery" },
  { href: "/fan-art", label: "Fan art" },
  { href: "/#media", label: "Media" },
  { href: "/events", label: "Events" },
  { href: "/live", label: "Live" },
  { href: "/projects", label: "Projects" },
  { href: "/#socials", label: "Connect" },
] as const;

const DEVELOPER = {
  name: "ZAYZHIK 🦈",
  xUrl: "https://x.com/ZAYZHIK_KungV2",
} as const;

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "youtube") {
    return <Play className="size-3.5" aria-hidden />;
  }
  if (platform === "x") {
    return <X className="size-3.5" aria-hidden />;
  }
  return <ExternalLink className="size-3.5" aria-hidden />;
}

export function Footer({ data }: FooterProps) {
  const year = new Date().getFullYear();
  const primarySocials = data.socials.filter(
    (social) => social.platform === "youtube" || social.platform === "x"
  );

  return (
    <footer className="border-t border-[#f3b8c4]/10 bg-[#0e0609] px-6 py-16 text-[#fff5f7] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            {data.basic.name}
          </p>
          <p className="mt-2 text-sm text-[#f3b8c4]/70">
            {data.basic.unit} · {data.basic.agency}
          </p>

          {primarySocials.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {primarySocials.map((social) => (
                <li key={social.id}>
                  <Link
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#f7d7de]/85 transition hover:text-[#e85a7a]"
                  >
                    <SocialIcon platform={social.platform} />
                    {social.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#f7d7de]/70">
            Unofficial fanclub site for {data.fan.fanName} {data.fan.oshiMark}.
            All rights to {data.basic.name} and related assets belong to their
            respective owners.
          </p>
        </div>

        <div className="space-y-6 md:text-right">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm md:justify-end">
            {FOOTER_LINKS.map((link) => (
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

          <p className="text-xs tracking-wide text-[#f3b8c4]/45">
            © {year} Fan-made · Not affiliated with Lumina Project
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide text-[#f3b8c4]/45 md:justify-end">
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
              <span className="sr-only">บน X</span>
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
