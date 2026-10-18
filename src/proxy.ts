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
import {
  isPathAllowedOnSite,
  SITE_HOME,
  siteForHost,
  type HostSite,
} from "@/lib/cafe-host";
import { isSiteAdminToken, SITE_ADMIN_COOKIE } from "@/lib/site-admin-auth";

function siteOf(request: NextRequest) {
  return siteForHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
}

/**
 * On a single-purpose domain (lib/cafe-host.ts) only that part of the site is
 * reachable. Other pages go back to the domain's home `/`, other APIs 404, so
 * the main site stays unpublished until its own domain is attached.
 */
function siteGate(request: NextRequest, site: HostSite) {
  const { pathname } = request.nextUrl;
  if (isPathAllowedOnSite(site, pathname)) return null;

  if (pathname.toLowerCase().startsWith("/api/")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
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
 *
 * `pathname` is the cafe path to judge; on the cafe domain the bare `/` is
 * judged as `/cafe` and served under `/` so the address bar stays clean.
 */
async function cafePageLock(request: NextRequest, pathname: string, onCafeHost: boolean) {
  const { config } = await loadGate();
  const state = resolveGate(config, readGateEnv(process.env), Date.now());
  const isTeam = isSiteAdminToken(request.cookies.get(SITE_ADMIN_COOKIE)?.value);
  const decision = decideCafeRoute(pathname, state, isTeam);

  if (decision.kind === "not-found") {
    return noStore(NextResponse.json({ error: "not found" }, { status: 404 }));
  }
  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    // On the cafe domain the cafe home is `/`.
    url.pathname = onCafeHost && decision.to === "/cafe" ? "/" : decision.to;
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

  if (rendered !== request.nextUrl.pathname) {
    const url = request.nextUrl.clone();
    url.pathname = rendered;
    const response = NextResponse.rewrite(url, init);
    return decision.kind === "rewrite" ? noStore(response) : response;
  }
  return NextResponse.next(init);
}

/** All page routes are lowercase; redirect mixed-case URLs (e.g. /HBD/2026 → /hbd/2026). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const site = siteOf(request);
  const onCafeHost = site === "cafe";

  if (site && pathname === "/") {
    // cafe.example.com/ shows the cafe (whichever page the lock picks) at `/`.
    if (onCafeHost) return cafePageLock(request, SITE_HOME.cafe, true);
    // fanart. / hbd. / admin. show their page at `/`.
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME[site];
    return NextResponse.rewrite(url);
  }

  if (site) {
    const gated = siteGate(request, site);
    if (gated) return gated;
  }

  const isApi = pathname.startsWith("/api/");

  if (!isApi && pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  if (isGatedPath(pathname)) return cafePageLock(request, pathname, onCafeHost);
}

export const config = {
  // Include /api so the cafe domain can refuse main-site APIs.
  // Skip Next internals and files with an extension (images, fonts).
  matcher: ["/((?!_next/|.*\\.[\\w]+$).*)"],
};
