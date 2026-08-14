import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isCafeSettingsUnlocked } from "@/lib/cafe-settings-auth";
import {
  isCafeSectionKey,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";
import {
  loadCafeVisibility,
  loadCafeVisibilityRows,
  saveCafeVisibility,
} from "@/lib/cafe-visibility-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isCafeSettingsUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [map, rows] = await Promise.all([
    loadCafeVisibility(),
    loadCafeVisibilityRows(),
  ]);

  return NextResponse.json({ visibility: map, sections: rows });
}

export async function PUT(request: Request) {
  if (!(await isCafeSettingsUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { visibility?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.visibility || typeof body.visibility !== "object") {
    return NextResponse.json({ error: "Missing visibility" }, { status: 400 });
  }

  const updates: Partial<CafeSectionVisibilityMap> = {};
  for (const [key, value] of Object.entries(
    body.visibility as Record<string, unknown>
  )) {
    if (isCafeSectionKey(key) && typeof value === "boolean") {
      updates[key] = value;
    }
  }

  try {
    const visibility = await saveCafeVisibility(updates);
    revalidatePath("/cafe");
    return NextResponse.json({ visibility });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save visibility";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
