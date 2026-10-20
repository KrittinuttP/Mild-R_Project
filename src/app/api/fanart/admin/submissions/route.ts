import { NextResponse } from "next/server";

import {
  countPendingFanartSubmissions,
  listFanartSubmissions,
  type FanartSubmissionStatus,
} from "@/lib/fanart-submissions-store";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const TAB_STATUSES: Record<string, FanartSubmissionStatus[]> = {
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
      const pendingCount = await countPendingFanartSubmissions();
      return NextResponse.json({ pendingCount });
    }

    const statuses = TAB_STATUSES[statusParam];
    if (!statuses) {
      return NextResponse.json({ error: "status ไม่ถูกต้อง" }, { status: 400 });
    }

    const [submissions, pendingCount] = await Promise.all([
      listFanartSubmissions(statuses),
      countPendingFanartSubmissions(),
    ]);
    return NextResponse.json({ submissions, pendingCount });
  } catch (error) {
    console.error("[fanart] admin request failed", error);
    return NextResponse.json({ error: "โหลดรายการไม่สำเร็จ" }, { status: 500 });
  }
}
