import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

type SocialPlatformIconProps = {
  platform: string;
  className?: string;
};

function IconShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("size-5 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

/** Brand marks for social platforms (lucide has no social brands). */
export function SocialPlatformIcon({
  platform,
  className,
}: SocialPlatformIconProps) {
  if (platform === "youtube") {
    return (
      <IconShell className={className}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
      </IconShell>
    );
  }

  if (platform === "x") {
    return (
      <IconShell className={className}>
        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5.1-6.7L5.7 22H2.6l7.3-8.3L1 2h6.7l4.6 6.1L18.9 2zm-1.1 18h1.8L6.3 3.9H4.4L17.8 20z" />
      </IconShell>
    );
  }

  if (platform === "facebook") {
    return (
      <IconShell className={className}>
        <path d="M14 8.2V6.1c0-.7.1-1.1 1.1-1.1H17V2h-2.7C11.4 2 10 3.6 10 6v2.2H7.5V11H10v11h4V11h2.7l.5-2.8H14z" />
      </IconShell>
    );
  }

  if (platform === "tiktok") {
    return (
      <IconShell className={className}>
        <path d="M19.6 7.1a5.8 5.8 0 0 1-3.4-1.1v7.3a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.9a2.8 2.8 0 1 0 2 2.7V2h2.8c.2 1.6 1.2 3 2.5 3.8A5.8 5.8 0 0 0 21 6.7v2.9a8.5 8.5 0 0 1-1.4-2.5z" />
      </IconShell>
    );
  }

  if (platform === "discord") {
    return (
      <IconShell className={className}>
        <path d="M19.3 5.1A17 17 0 0 0 15 3.9l-.3.6a15.4 15.4 0 0 0-5.4 0L9 3.9a17 17 0 0 0-4.3 1.2C2.2 9.2 1.5 13.1 1.9 17a16.8 16.8 0 0 0 5.1 2.6l.7-1.1a10.9 10.9 0 0 1-1.7-.8l.4-.3c3.3 1.5 6.9 1.5 10.2 0l.4.3c-.5.3-1.1.6-1.7.8l.7 1.1A16.7 16.7 0 0 0 22.1 17c.5-4.4-.7-8.2-2.8-11.9zM8.7 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" />
      </IconShell>
    );
  }

  return <ExternalLink className={cn("size-5 shrink-0", className)} aria-hidden />;
}
