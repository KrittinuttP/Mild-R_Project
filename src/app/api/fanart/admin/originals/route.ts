import { NextResponse } from "next/server";

import {
  FANART_ORIGINALS_BUCKET,
  listFanartSubmissions,
  type FanartSubmissionRow,
} from "@/lib/fanart-submissions-store";
import { creditHref, creditLabel } from "@/lib/fanart-upload";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Long enough to fetch a few hundred MB on a slow connection. */
const LINK_SECONDS = 30 * 60;

/** Folder name that is safe on Windows and macOS. */
function folderName(row: FanartSubmissionRow) {
  const handle = row.contact_channel === "x" ? `@${row.contact_handle}` : row.contact_handle;
  return `${row.display_name} (${handle})`
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/, "")
    .slice(0, 80);
}

/**
 * Short-lived links to many print originals at once, with the file name each
 * should get inside the admin's ZIP: one folder per fan, numbered in the
 * order they sent them. Body: { ids: string[] } or { status: "approved" }.
 */
export async function POST(request: Request) {
  if (!(await isSiteAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Supabase ไม่พร้อม" }, { status: 503 });
  }

  let body: { ids?: unknown; status?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    let rows: FanartSubmissionRow[];
    if (Array.isArray(body.ids)) {
      const ids = new Set(body.ids.map(String));
      if (ids.size === 0 || ids.size > 200) {
        return NextResponse.json({ error: "จำนวนรูปไม่ถูกต้อง" }, { status: 400 });
      }
      rows = (await listFanartSubmissions(["pending", "approved"])).filter((row) => ids.has(row.id));
    } else if (body.status === "approved") {
      rows = await listFanartSubmissions(["approved"]);
    } else {
      return NextResponse.json({ error: "ต้องระบุรูป" }, { status: 400 });
    }

    rows = rows
      .filter((row) => row.original_path)
      .sort(
        (a, b) =>
          a.created_at.localeCompare(b.created_at) ||
          (a.original_path ?? "").localeCompare(b.original_path ?? "")
      );
    if (!rows.length) {
      return NextResponse.json({ error: "ไม่มีไฟล์ต้นฉบับให้ดาวน์โหลด" }, { status: 404 });
    }

    const { data, error } = await createAdminClient()
      .storage.from(FANART_ORIGINALS_BUCKET)
      .createSignedUrls(
        rows.map((row) => row.original_path as string),
        LINK_SECONDS
      );
    if (error || !data) throw new Error(error?.message ?? "sign failed");

    const counters = new Map<string, number>();
    const files = rows.flatMap((row, index) => {
      const url = data[index]?.signedUrl;
      if (!url) return [];
      const folder = folderName(row);
      const number = (counters.get(folder) ?? 0) + 1;
      counters.set(folder, number);
      const ext = EXTENSION[row.original_type ?? ""] ?? "jpg";
      const credit = row.credit_type && row.credit_value
        ? { type: row.credit_type, value: row.credit_value }
        : { type: "x" as const, value: row.contact_handle };
      return [
        {
          id: row.id,
          url,
          type: row.original_type,
          name: `${folder}/${String(number).padStart(2, "0")}.${ext}`,
          sender: `${row.display_name} (@${row.contact_handle})`,
          credit: creditLabel(credit),
          creditUrl: creditHref(credit),
        },
      ];
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("[fanart] originals links failed", error);
    return NextResponse.json({ error: "สร้างลิงก์ดาวน์โหลดไม่สำเร็จ" }, { status: 500 });
  }
}
