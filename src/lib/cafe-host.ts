/**
 * Single-purpose domains: each serves one part of the site at `/` and keeps
 * the rest of the (still unpublished) main site out of reach.
 *
 *   CAFE_HOST    cafe.example.com    → /cafe (with the time lock, proxy.ts)
 *   FANART_HOST  fanart.example.com  → /upload/fanart
 *   HBD_HOST     hbd.example.com     → /upload/hbd
 *   ADMIN_HOST   admin.example.com   → /admin (team tools)
 *
 * Each value may be comma-separated. Empty turns that domain off; localhost
 * and the main domain serve every route.
 */

export type HostSite = "cafe" | "fanart" | "hbd" | "admin";

/** Hostname only. Uses the first value when a proxy sends a comma-separated list. */
function hostnameOf(host: string) {
  const first = host.split(",")[0] ?? "";
  return first.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function hostsFrom(value: string | undefined) {
  return (value ?? "").split(",").map(hostnameOf).filter(Boolean);
}

/** Read with static property access so the values are always picked up. */
function siteHosts(): Record<HostSite, string[]> {
  return {
    cafe: hostsFrom(process.env.CAFE_HOST),
    fanart: hostsFrom(process.env.FANART_HOST),
    hbd: hostsFrom(process.env.HBD_HOST),
    admin: hostsFrom(process.env.ADMIN_HOST),
  };
}

/** Which single-purpose domain a request came in on, if any. */
export function siteForHost(host: string | null): HostSite | null {
  const name = hostnameOf(host ?? "");
  if (!name) return null;
  const hosts = siteHosts();
  for (const site of Object.keys(hosts) as HostSite[]) {
    if (hosts[site].includes(name)) return site;
  }
  return null;
}

/** Public cafe domain(s), from `CAFE_HOST`. */
export function cafePromotionHosts() {
  return siteHosts().cafe;
}

export function isCafePromotionHost(host: string | null) {
  return siteForHost(host) === "cafe";
}

/** The page each domain shows at `/`. */
export const SITE_HOME: Record<HostSite, string> = {
  cafe: "/cafe",
  fanart: "/upload/fanart",
  hbd: "/upload/hbd",
  admin: "/admin",
};

/** `path` is `base` or below it. */
function under(path: string, base: string) {
  return path === base || path.startsWith(`${base}/`);
}

/**
 * Paths (pages and APIs) each domain may serve, beside `/`. Exact or prefix
 * matches only, so nothing outside the list leaks through.
 */
const SITE_PATHS: Record<HostSite, string[]> = {
  cafe: ["/cafe", "/api/cafe"],
  // upload-url hands out the signed upload links, submit records the entry.
  fanart: ["/upload/fanart", "/api/fanart/upload-url", "/api/fanart/submit"],
  hbd: ["/upload/hbd", "/api/hbd/submit"],
  admin: [
    "/admin",
    "/live/ops",
    "/cafe/settings",
    "/cafe/secret",
    "/upload",
    // Every API checks its own password or token.
    "/api",
  ],
};

export function isPathAllowedOnSite(site: HostSite, pathname: string) {
  const path = pathname.toLowerCase();
  return SITE_PATHS[site].some((base) => under(path, base));
}

/** Pages and APIs a visitor on the cafe domain is allowed to open. */
export function isCafePublicPath(pathname: string) {
  return isPathAllowedOnSite("cafe", pathname);
}
