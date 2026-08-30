import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import {
  approveHbdSubmission,
  rejectHbdSubmission,
} from "@/lib/hbd-submissions-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "reject" ? "reject" : "approve";

  try {
    const row =
      action === "reject"
        ? await rejectHbdSubmission(id)
        : await approveHbdSubmission(id);

    if (action === "approve") {
      revalidatePath("/hbd/2026", "page");
    }

    return NextResponse.json({ ok: true, submission: row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
