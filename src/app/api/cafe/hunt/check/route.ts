import { NextResponse } from "next/server";

import { cafeHunt } from "@/lib/cafe-hunt";
import {
  cafeHuntItemIndexForToken,
  cafeHuntTokens,
} from "@/lib/cafe-hunt-tokens";

export const runtime = "nodejs";

/**
 * Which evidence a scanned code belongs to. Lets the in-page scanner stamp
 * without leaving the camera. Only answers for one code at a time; the list
 * itself never leaves the server. Codes are 16+ random characters, so trying
 * codes one by one here is not a practical way to find them.
 */
export async function POST(request: Request) {
  if (!cafeHuntTokens()) {
    return NextResponse.json(
      { error: "กิจกรรมยังไม่พร้อม" },
      { status: 503 }
    );
  }

  let token: unknown;
  try {
    ({ token } = (await request.json()) as { token?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const index =
    typeof token === "string" && token.length <= 200
      ? cafeHuntItemIndexForToken(token)
      : -1;
  const item = index >= 0 ? cafeHunt.items[index] : undefined;
  if (!item) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: true, index, itemId: item.id });
}
