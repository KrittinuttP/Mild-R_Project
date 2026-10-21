import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  approveFanartSubmission,
  deleteFanartSubmission,
  rejectFanartSubmission,
  setFanartHidden,
} from "@/lib/fanart-submissions-store";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const ACTIONS = ["approve", "reject", "hide", "unhide", "delete"] as const;
type Action = (typeof ACTIONS)[number];

/** Pages that show approved fan art. */
function refreshGallery() {
  revalidatePath("/gallery/fanart");
  revalidatePath("/");
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: { action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = ACTIONS.find((name) => name === body.action) as Action | undefined;
  if (!action) return NextResponse.json({ error: "ไม่รู้จักคำสั่งนี้" }, { status: 400 });

  try {
    switch (action) {
      case "approve":
        await approveFanartSubmission(id);
        break;
      case "reject":
        await rejectFanartSubmission(id);
        break;
      case "hide":
        await setFanartHidden(id, true);
        break;
      case "unhide":
        await setFanartHidden(id, false);
        break;
      case "delete":
        await deleteFanartSubmission(id);
        break;
    }
    if (action !== "reject") refreshGallery();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[fanart] admin request failed", action, error);
    return NextResponse.json({ error: "อัปเดตไม่สำเร็จ" }, { status: 500 });
  }
}
