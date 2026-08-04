import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { VtuberProfile } from "@/types/vtuber";

type FooterProps = {
  data: VtuberProfile;
};

export function Footer({ data }: FooterProps) {
  const year = new Date().getFullYear();

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
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#f7d7de]/70">
            Unofficial fanclub site for {data.fan.fanName} {data.fan.oshiMark}.
            All rights to {data.basic.name} and related assets belong to their
            respective owners.
          </p>
        </div>

        <div className="space-y-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {data.socials.map((social) => (
              <li key={social.id}>
                <Link
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#f7d7de]/85 transition hover:text-[#e85a7a]"
                >
                  {social.label}
                  <ExternalLink className="size-3.5 opacity-60" />
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-xs tracking-wide text-[#f3b8c4]/45">
            © {year} Fan-made · Not affiliated with Pixela Project
          </p>
        </div>
      </div>
    </footer>
  );
}
