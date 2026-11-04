import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { CafeFeed } from "@/lib/cafe-feeds";
import {
  loadCafeFeedsAdmin,
  runCafeFeedSync,
  setFeedAutoSync,
  setNoticeHidden,
  setNoticePinned,
  setTapeHidden,
} from "@/lib/cafe-feeds-store";
import { isCafeSettingsUnlocked } from "@/lib/cafe-settings-auth";

export const runtime = "nodejs";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

function isFeed(value: unknown): value is CafeFeed {
  return value === "x" || value === "youtube";
}

function failure(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Posts, clips (hidden ones too) and pull state for /cafe/settings. */
export async function GET() {
  if (!(await isCafeSettingsUnlocked())) return unauthorized();
  try {
    return NextResponse.json(await loadCafeFeedsAdmin());
  } catch (error) {
    return failure(error, "โหลดข้อมูลไม่สำเร็จ");
  }
}

type PutBody =
  | { kind: "notice"; id: string; pinned?: boolean; hidden?: boolean }
  | { kind: "tape"; id: string; hidden: boolean }
  | { kind: "feed"; feed: CafeFeed; autoSync: boolean };

/** One change: pin / hide a post, hide a clip, or turn a feed's nightly pull on or off. */
export async function PUT(request: Request) {
  if (!(await isCafeSettingsUnlocked())) return unauthorized();

  let body: Partial<PutBody> & Record<string, unknown>;
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  try {
    if (body.kind === "notice" && id) {
      if (typeof body.pinned === "boolean") await setNoticePinned(id, body.pinned);
      else if (typeof body.hidden === "boolean") await setNoticeHidden(id, body.hidden);
      else return NextResponse.json({ error: "Missing pinned or hidden" }, { status: 400 });
    } else if (body.kind === "tape" && id && typeof body.hidden === "boolean") {
      await setTapeHidden(id, body.hidden);
    } else if (body.kind === "feed" && isFeed(body.feed) && typeof body.autoSync === "boolean") {
      await setFeedAutoSync(body.feed, body.autoSync);
    } else {
      return NextResponse.json({ error: "Invalid change" }, { status: 400 });
    }
  } catch (error) {
    return failure(error, "บันทึกไม่สำเร็จ");
  }

  revalidatePath("/cafe", "layout");
  return NextResponse.json(await loadCafeFeedsAdmin());
}

/** "ดึงตอนนี้": runs cafe-feed-sync for the given feeds (both when none given). */
export async function POST(request: Request) {
  if (!(await isCafeSettingsUnlocked())) return unauthorized();

  let feeds: CafeFeed[] = ["x", "youtube"];
  try {
    const body = (await request.json()) as { feeds?: unknown };
    if (Array.isArray(body.feeds)) {
      const asked = body.feeds.filter(isFeed);
      if (asked.length) feeds = asked;
    }
  } catch {
    /* no body: both feeds */
  }

  try {
    await runCafeFeedSync(feeds);
  } catch (error) {
    revalidatePath("/cafe", "layout");
    // Still send the state back: the error is also written to last_error.
    const data = await loadCafeFeedsAdmin().catch(() => null);
    return NextResponse.json(
      { ...(data ?? {}), error: error instanceof Error ? error.message : "ดึงไม่สำเร็จ" },
      { status: 502 }
    );
  }

  revalidatePath("/cafe", "layout");
  return NextResponse.json(await loadCafeFeedsAdmin());
}
