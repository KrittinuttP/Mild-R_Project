/** Hostname only. Uses the first value when a proxy sends a comma-separated list. */
function hostnameOf(host: string) {
  const first = host.split(",")[0] ?? "";
  return first.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/**
 * Public cafe domain, comma-separated (`CAFE_HOST=cafe.example.com`).
 * Empty means the gate is off: localhost and the main domain serve every route.
 */
export function cafePromotionHosts() {
  return (process.env.CAFE_HOST ?? "")
    .split(",")
    .map(hostnameOf)
    .filter(Boolean);
}

export function isCafePromotionHost(host: string | null) {
  const name = hostnameOf(host ?? "");
  return name.length > 0 && cafePromotionHosts().includes(name);
}

/** Pages and APIs a visitor on the cafe domain is allowed to open. */
export function isCafePublicPath(pathname: string) {
  const path = pathname.toLowerCase();
  return (
    path === "/cafe" ||
    path.startsWith("/cafe/") ||
    path === "/api/cafe" ||
    path.startsWith("/api/cafe/")
  );
}
