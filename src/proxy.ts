import { NextResponse, type NextRequest } from "next/server";

/** All page routes are lowercase; redirect mixed-case URLs (e.g. /HBD/2026 → /hbd/2026). */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lower = pathname.toLowerCase();
  if (pathname === lower) return;

  const url = request.nextUrl.clone();
  url.pathname = lower;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Skip API routes (ids may be case-sensitive), Next internals, and files with an extension.
  matcher: ["/((?!api/|_next/|.*\\.[\\w]+$).*)"],
};
