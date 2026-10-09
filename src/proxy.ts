import { NextResponse, type NextRequest } from "next/server";

import { isCafePromotionHost, isCafePublicPath } from "@/lib/cafe-host";

/**
 * On the cafe promotion domain, only cafe pages and cafe APIs are reachable.
 * Everything else goes back to /cafe, so the main site stays unpublished
 * until its own domain is attached (and CAFE_HOST does not include that domain).
 */
function cafeGate(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isCafePromotionHost(host)) return null;

  const { pathname } = request.nextUrl;
  if (isCafePublicPath(pathname)) return null;

  if (pathname.toLowerCase().startsWith("/api/")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/cafe";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

/** All page routes are lowercase; redirect mixed-case URLs (e.g. /HBD/2026 → /hbd/2026). */
export function proxy(request: NextRequest) {
  const gated = cafeGate(request);
  if (gated) return gated;

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return;

  const lower = pathname.toLowerCase();
  if (pathname === lower) return;

  const url = request.nextUrl.clone();
  url.pathname = lower;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Include /api so the cafe domain can refuse main-site APIs.
  // Skip Next internals and files with an extension (images, fonts).
  matcher: ["/((?!_next/|.*\\.[\\w]+$).*)"],
};
