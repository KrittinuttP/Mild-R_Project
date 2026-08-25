import { NextResponse } from "next/server";

import {
  clearSiteAdminCookie,
  isSiteAdminUnlocked,
  setSiteAdminCookie,
  verifySiteAdminPassword,
} from "@/lib/site-admin-auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ unlocked: await isSiteAdminUnlocked() });
}

export async function POST(request: Request) {
  let body: { password?: unknown; action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "lock") {
    await clearSiteAdminCookie();
    return NextResponse.json({ unlocked: false });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!verifySiteAdminPassword(password)) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }

  await setSiteAdminCookie();
  return NextResponse.json({ unlocked: true });
}
