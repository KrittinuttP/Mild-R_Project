import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import {
  approveHbdSubmission,
  deleteHbdSubmission,
  hideHbdSubmission,
  rejectHbdSubmission,
  unhideHbdSubmission,
} from "@/lib/hbd-submissions-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Action = "approve" | "reject" | "hide" | "unhide";

const ACTIONS: Record<Action, (id: string) => Promise<unknown>> = {
  approve: approveHbdSubmission,
  reject: rejectHbdSubmission,
  hide: hideHbdSubmission,
  unhide: unhideHbdSubmission,
};

/** Actions that change what /hbd/2026 shows. */
const REVALIDATES_PUBLIC: ReadonlySet<Action> = new Set([
  "approve",
  "hide",
  "unhide",
]);

function isAction(value: unknown): value is Action {
  return typeof value === "string" && value in ACTIONS;
}

async function guard(context: RouteContext) {
  if (!(await isSiteAdminUnlocked())) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { response: NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 }) };
  }
  const { id } = await context.params;
  if (!id) {
    return { response: NextResponse.json({ error: "Missing id" }, { status: 400 }) };
  }
  return { id };
}

export async function POST(request: Request, context: RouteContext) {
  const checked = await guard(context);
  if ("response" in checked) return checked.response;

  let body: { action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action: Action = isAction(body.action) ? body.action : "approve";

  try {
    const row = await ACTIONS[action](checked.id);
    if (REVALIDATES_PUBLIC.has(action)) {
      revalidatePath("/hbd/2026", "page");
    }
    return NextResponse.json({ ok: true, submission: row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const checked = await guard(context);
  if ("response" in checked) return checked.response;

  try {
    await deleteHbdSubmission(checked.id);
    revalidatePath("/hbd/2026", "page");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ลบไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
