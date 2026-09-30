import { NextResponse } from "next/server";

import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import {
  countPendingHbdSubmissions,
  listHbdSubmissions,
  type HbdSubmissionStatus,
} from "@/lib/hbd-submissions-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

/** Admin tabs → statuses listed (hidden tab also shows rejected, so mistakes can be restored). */
const TAB_STATUSES: Record<string, HbdSubmissionStatus[]> = {
  pending: ["pending"],
  approved: ["approved"],
  hidden: ["hidden", "rejected"],
};

export async function GET(request: Request) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "Supabase ไม่พร้อม", submissions: [], pendingCount: 0 },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "pending";
  const countOnly = searchParams.get("countOnly") === "1";

  try {
    if (countOnly) {
      const pendingCount = await countPendingHbdSubmissions();
      return NextResponse.json({ pendingCount });
    }

    const statuses = TAB_STATUSES[statusParam];
    if (!statuses) {
      return NextResponse.json({ error: "status ไม่ถูกต้อง" }, { status: 400 });
    }

    const [submissions, pendingCount] = await Promise.all([
      listHbdSubmissions(statuses),
      countPendingHbdSubmissions(),
    ]);

    return NextResponse.json({ submissions, pendingCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "โหลดรายการไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
