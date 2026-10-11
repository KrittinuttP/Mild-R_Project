import { NextResponse } from "next/server";

import { cafeHunt, isCafeHuntOpen } from "@/lib/cafe-hunt";
import { cafeHuntTokens, verifyCafeHuntProof } from "@/lib/cafe-hunt-tokens";
import { validateLuckyDrawContact } from "@/lib/lucky-draw";
import { createLuckyDrawEntry } from "@/lib/lucky-draw-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type EnterBody = {
  contactName?: unknown;
  contactChannel?: unknown;
  contactHandle?: unknown;
  consent?: unknown;
  proof?: { tokens?: unknown } | null;
};

/**
 * Evidence hunt → lucky wheel entry.
 * Lives under /api/cafe so it also works on the cafe-only domain.
 */
export async function POST(request: Request) {
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !cafeHuntTokens()
  ) {
    return NextResponse.json(
      { error: "กิจกรรมยังไม่พร้อมรับรายชื่อ" },
      { status: 503 }
    );
  }

  let body: EnterBody;
  try {
    body = (await request.json()) as EnterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isCafeHuntOpen()) {
    return NextResponse.json(
      { error: "อยู่นอกช่วงเวลารับรายชื่อของกิจกรรม" },
      { status: 403 }
    );
  }

  const contact = validateLuckyDrawContact(body);
  if (!contact.ok) {
    return NextResponse.json({ error: contact.error }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "กรุณาติ๊กยินยอมให้ใช้ข้อมูลติดต่อ" },
      { status: 400 }
    );
  }

  // The stamps live in the visitor's browser and can be edited there,
  // so the codes are checked again here before anything is saved.
  if (!verifyCafeHuntProof(body.proof?.tokens)) {
    return NextResponse.json(
      { error: "หลักฐานยังไม่ครบ กรุณาสแกนให้ครบทุกจุด" },
      { status: 403 }
    );
  }

  try {
    const outcome = await createLuckyDrawEntry({
      ...contact.value,
      campaign: cafeHunt.campaign,
    });
    return NextResponse.json({
      ok: true,
      alreadyEntered: outcome === "already",
    });
  } catch {
    return NextResponse.json(
      { error: "บันทึกรายชื่อไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 500 }
    );
  }
}
