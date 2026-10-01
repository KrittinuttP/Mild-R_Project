import { NextResponse } from "next/server";

import {
  clearCafeSettingsCookie,
  isCafeSettingsConfigured,
  isCafeSettingsUnlocked,
  setCafeSettingsCookie,
  verifyCafeSettingsPassword,
} from "@/lib/cafe-settings-auth";

export const runtime = "nodejs";

/** @deprecated Prefer `/api/admin/unlock` — kept for cafe settings / secret clients */
export async function GET() {
  return NextResponse.json({ unlocked: await isCafeSettingsUnlocked() });
}

export async function POST(request: Request) {
  let body: { password?: unknown; action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "lock") {
    await clearCafeSettingsCookie();
    return NextResponse.json({ unlocked: false });
  }

  if (!isCafeSettingsConfigured()) {
    return NextResponse.json(
      { error: "ระบบแอดมินยังไม่ได้ตั้งค่า (SITE_ADMIN_PASSWORD / SITE_ADMIN_SECRET)" },
      { status: 503 }
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyCafeSettingsPassword(password)) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }

  await setCafeSettingsCookie();
  return NextResponse.json({ unlocked: true });
}
