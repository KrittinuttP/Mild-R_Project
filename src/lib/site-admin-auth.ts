import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** Shared cookie for `/admin`, cafe settings, cafe secret, HBD approve */
export const SITE_ADMIN_COOKIE = "mild_r_site_admin";

export const DEFAULT_SITE_ADMIN_PASSWORD = "MILDRPROJECT";

export function getSiteAdminPassword() {
  return (
    process.env.SITE_ADMIN_PASSWORD?.trim() ||
    process.env.CAFE_SETTINGS_PASSWORD?.trim() ||
    DEFAULT_SITE_ADMIN_PASSWORD
  );
}

function signingSecret() {
  return (
    process.env.SITE_ADMIN_SECRET?.trim() ||
    process.env.CAFE_SETTINGS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    getSiteAdminPassword()
  );
}

function tokenForPassword(password: string) {
  return createHmac("sha256", signingSecret())
    .update(`site-admin:${password}`)
    .digest("hex");
}

export function expectedSiteAdminToken() {
  return tokenForPassword(getSiteAdminPassword());
}

export function verifySiteAdminPassword(input: string) {
  const expected = getSiteAdminPassword();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isSiteAdminUnlocked() {
  const jar = await cookies();
  const value = jar.get(SITE_ADMIN_COOKIE)?.value;
  if (!value) return false;
  const expected = expectedSiteAdminToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setSiteAdminCookie() {
  const jar = await cookies();
  jar.set(SITE_ADMIN_COOKIE, expectedSiteAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSiteAdminCookie() {
  const jar = await cookies();
  jar.delete(SITE_ADMIN_COOKIE);
}
