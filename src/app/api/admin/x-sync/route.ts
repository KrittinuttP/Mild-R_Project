import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { runXFeedSync } from "@/lib/x-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Every run bills twitterapi.io credits, so one run per window (per server instance). */
const MIN_GAP_MS = 60_000;
let lastRunAt = 0;

/** "ดึงตอนนี้": pull new X posts now, then refresh the pages that show them. */
export async function POST() {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  const wait = lastRunAt + MIN_GAP_MS - Date.now();
  if (wait > 0) {
    return NextResponse.json(
      { error: `เพิ่งดึงไป รอ ${Math.ceil(wait / 1000)} วินาทีแล้วลองใหม่` },
      { status: 429 }
    );
  }
  lastRunAt = Date.now();

  try {
    const result = await runXFeedSync();
    // Socials (home) + Moments are cached pages; show the new posts right away.
    revalidatePath("/");
    revalidatePath("/gallery/archive");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    lastRunAt = 0;
    console.error("[x_sync] manual run failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ดึงไม่สำเร็จ" },
      { status: 502 }
    );
  }
}
