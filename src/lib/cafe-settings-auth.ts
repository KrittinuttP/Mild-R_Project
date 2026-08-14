import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { CAFE_SETTINGS_COOKIE } from "@/lib/cafe-visibility";
import { getCafeSettingsPassword } from "@/lib/cafe-visibility-store";

function signingSecret() {
  return (
    process.env.CAFE_SETTINGS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    getCafeSettingsPassword()
  );
}

function tokenForPassword(password: string) {
  return createHmac("sha256", signingSecret())
    .update(`cafe-settings:${password}`)
    .digest("hex");
}

export function expectedCafeSettingsToken() {
  return tokenForPassword(getCafeSettingsPassword());
}

export function verifyCafeSettingsPassword(input: string) {
  const expected = getCafeSettingsPassword();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isCafeSettingsUnlocked() {
  const jar = await cookies();
  const value = jar.get(CAFE_SETTINGS_COOKIE)?.value;
  if (!value) return false;
  const expected = expectedCafeSettingsToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setCafeSettingsCookie() {
  const jar = await cookies();
  jar.set(CAFE_SETTINGS_COOKIE, expectedCafeSettingsToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearCafeSettingsCookie() {
  const jar = await cookies();
  jar.delete(CAFE_SETTINGS_COOKIE);
}
