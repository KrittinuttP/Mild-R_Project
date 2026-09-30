import { NextResponse } from "next/server";

import { toHbdDownloadJpeg } from "@/lib/hbd-image";
import { loadApprovedHbdCard } from "@/lib/hbd-submissions-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function downloadFilename(displayName: string) {
  const safe = displayName
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return safe ? `mild-r-hbd-2026-${safe}.jpg` : "mild-r-hbd-2026.jpg";
}

/** Approved card as a JPEG attachment (stored files are WebP). */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const card = await loadApprovedHbdCard(id);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!card || !supabaseUrl || !card.cardUrl.startsWith(`${supabaseUrl}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let jpeg: Buffer;
  try {
    const res = await fetch(card.cardUrl);
    if (!res.ok) throw new Error(`storage ${res.status}`);
    jpeg = await toHbdDownloadJpeg(Buffer.from(await res.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "ดาวน์โหลดไม่สำเร็จ" }, { status: 502 });
  }

  const filename = downloadFilename(card.displayName);
  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.length),
      "Content-Disposition": `attachment; filename="mild-r-hbd-2026.jpg"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      // Private + short: a hidden card must stop being downloadable soon after.
      "Cache-Control": "private, max-age=300",
    },
  });
}
