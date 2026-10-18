import { NextResponse, type NextRequest } from "next/server";

import { CAFE_CHROME_HEADER, isCountdownPath } from "@/lib/cafe-countdown";
import {
  CAFE_GATE_TIMES_HEADER,
  decideCafeRoute,
  encodeGateTimes,
  isGatedPath,
  readGateEnv,
  resolveGate,
} from "@/lib/cafe-gate";
import { loadGate } from "@/lib/cafe-gate-store";
import { isCafePromotionHost, isCafePublicPath } from "@/lib/cafe-host";
import { isSiteAdminToken, SITE_ADMIN_COOKIE } from "@/lib/site-admin-auth";

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

/** The lock changes with the clock, so no cache may keep its answers. */
function noStore<T extends NextResponse>(response: T) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Cafe page lock by time / team override / test env (rules: lib/cafe-gate.ts).
 * Only /cafe and /api/cafe pay for it: one cached read, refreshed every 30 s.
 */
async function cafePageLock(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { config } = await loadGate();
  const state = resolveGate(config, readGateEnv(process.env), Date.now());
  const isTeam = isSiteAdminToken(request.cookies.get(SITE_ADMIN_COOKIE)?.value);
  const decision = decideCafeRoute(pathname, state, isTeam);

  if (decision.kind === "not-found") {
    return noStore(NextResponse.json({ error: "not found" }, { status: 404 }));
  }
  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.to;
    url.search = "";
    return noStore(NextResponse.redirect(url, 307));
  }

  // Tell the layout whether the site chrome (and the cafe data it carries)
  // may be sent, and the countdown pages their switch times. Always
  // overwritten, never taken from the visitor.
  const rendered = decision.kind === "rewrite" ? decision.to : pathname;
  const chrome =
    !isCountdownPath(rendered) && (state.phase === "open" || isTeam || state.bypass);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CAFE_CHROME_HEADER, chrome ? "full" : "bare");
  requestHeaders.set(CAFE_GATE_TIMES_HEADER, encodeGateTimes(config));
  const init = { request: { headers: requestHeaders } };

  if (decision.kind === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = decision.to;
    return noStore(NextResponse.rewrite(url, init));
  }
  return NextResponse.next(init);
}

/** All page routes are lowercase; redirect mixed-case URLs (e.g. /HBD/2026 → /hbd/2026). */
export async function proxy(request: NextRequest) {
  const gated = cafeGate(request);
  if (gated) return gated;

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (!isApi && pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  if (isGatedPath(pathname)) return cafePageLock(request);
}

export const config = {
  // Include /api so the cafe domain can refuse main-site APIs.
  // Skip Next internals and files with an extension (images, fonts).
  matcher: ["/((?!_next/|.*\\.[\\w]+$).*)"],
};
