import { NextResponse } from "next/server";

import {
  FANART_ORIGINALS_BUCKET,
  getFanartSubmission,
} from "@/lib/fanart-submissions-store";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Short-lived link to the print original. The file is fetched from storage
 * directly, because a function response is capped at 4.5 MB on Vercel.
 */
export async function GET(_request: Request, context: RouteContext) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    const row = await getFanartSubmission(id);
    if (!row?.original_path) {
      return NextResponse.json({ error: "รูปนี้ไม่มีไฟล์ต้นฉบับ" }, { status: 404 });
    }
    const ext = EXTENSION[row.original_type ?? ""] ?? row.original_path.split(".").pop() ?? "jpg";
    const day = row.created_at.slice(0, 10).replaceAll("-", "");
    const fileName = `mild-r-fanart-${day}-${row.id.slice(0, 8)}.${ext}`;

    const { data, error } = await createAdminClient()
      .storage.from(FANART_ORIGINALS_BUCKET)
      .createSignedUrl(row.original_path, 120, { download: fileName });
    if (error || !data) {
      return NextResponse.json({ error: "ไม่พบไฟล์ต้นฉบับ" }, { status: 404 });
    }
    return NextResponse.json({ url: data.signedUrl, fileName, type: row.original_type });
  } catch (error) {
    console.error("[fanart] original link failed", error);
    return NextResponse.json({ error: "สร้างลิงก์ดาวน์โหลดไม่สำเร็จ" }, { status: 500 });
  }
}
