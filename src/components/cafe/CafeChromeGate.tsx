"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Pages that bring their own frame and footer, so the site menu would only get in the way. */
const BARE_PATHS = ["/cafe/countdown"];

/** Renders its children (the cafe menu or footer) everywhere except the countdown pages. */
export function CafeChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  return bare ? null : <>{children}</>;
}
