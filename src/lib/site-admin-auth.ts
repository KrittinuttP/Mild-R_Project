import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** Shared cookie for `/admin`, cafe settings, cafe secret, HBD approve, live ops */
export const SITE_ADMIN_COOKIE = "mild_r_site_admin";

const MIN_PASSWORD_LENGTH = 12;
const MIN_SECRET_LENGTH = 32;
const SESSION_SECONDS = 60 * 60 * 12;

function sitePassword(): string | null {
  const value =
    process.env.SITE_ADMIN_PASSWORD?.trim() ||
    process.env.CAFE_SETTINGS_PASSWORD?.trim() ||
    "";
  return value.length >= MIN_PASSWORD_LENGTH ? value : null;
}

function signingSecret(): string | null {
  const value =
    process.env.SITE_ADMIN_SECRET?.trim() ||
    process.env.CAFE_SETTINGS_SECRET?.trim() ||
    "";
  return value.length >= MIN_SECRET_LENGTH ? value : null;
}

/**
 * Admin login works only when both env values are set (no built-in default).
 * SITE_ADMIN_PASSWORD ≥ 12 chars, SITE_ADMIN_SECRET ≥ 32 chars.
 */
export function isSiteAdminConfigured() {
  return sitePassword() !== null && signingSecret() !== null;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Signs the expiry together with the password, so rotating either revokes old cookies. */
function signature(expiresAt: number, password: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`site-admin:v2:${expiresAt}:${password}`)
    .digest("hex");
}

function issueToken(): string | null {
  const password = sitePassword();
  const secret = signingSecret();
  if (!password || !secret) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${expiresAt}.${signature(expiresAt, password, secret)}`;
}

function isValidToken(token: string): boolean {
  const password = sitePassword();
  const secret = signingSecret();
  if (!password || !secret) return false;

  const [expiresRaw, sig] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!sig || !Number.isInteger(expiresAt)) return false;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, signature(expiresAt, password, secret));
}

export function verifySiteAdminPassword(input: string) {
  const expected = sitePassword();
  if (!expected || !signingSecret()) return false;
  return safeEqual(input, expected);
}

export async function isSiteAdminUnlocked() {
  const jar = await cookies();
  const value = jar.get(SITE_ADMIN_COOKIE)?.value;
  return value ? isValidToken(value) : false;
}

export async function setSiteAdminCookie() {
  const token = issueToken();
  if (!token) return false;
  const jar = await cookies();
  jar.set(SITE_ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return true;
}

export async function clearSiteAdminCookie() {
  const jar = await cookies();
  jar.delete(SITE_ADMIN_COOKIE);
}
