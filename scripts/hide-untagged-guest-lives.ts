/**
 * Hide lives from other channels whose title and description do not tag @MildRWorldEnd
 * (sets metadata.hidden = true, so they drop off the public schedule; ops still sees them).
 * Dry run unless --apply is passed.
 *
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts             # today (Bangkok), dry run
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts --days=7    # last 7 Bangkok days
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts --apply     # write the change
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts --unhide=<videoId> --apply
 *
 * Clips (mild_r_videos, Media page): add --videos. Scans every visible clip from other channels
 * (no date limit) and sets hidden = true on those without @MildRWorldEnd in title or description.
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts --videos
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts --videos --apply
 *   npx tsx --env-file=.env.local scripts/hide-untagged-guest-lives.ts --videos --unhide=<videoId> --apply
 */
import { createClient } from "@supabase/supabase-js";

import { textTagsMildRHandle } from "./lib/mild-r-mention";

const APPLY = process.argv.includes("--apply");
const DAYS = Math.max(1, Number(argValue("--days") ?? 1) || 1);
const UNHIDE = argValue("--unhide")?.trim() || null;
const VIDEOS = process.argv.includes("--videos");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TABLE = "mild_r_live_streams";
const DAY_MS = 24 * 60 * 60 * 1000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

type Row = {
  video_id: string;
  channel_name: string | null;
  title: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  metadata: Record<string, unknown> | null;
};

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
}

function bangkokDate(ms: number): string {
  return new Date(ms + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function rowTagsHandle(row: Row): boolean {
  const description = row.metadata?.description;
  return (
    textTagsMildRHandle(row.title) ||
    (typeof description === "string" && textTagsMildRHandle(description))
  );
}

function rowDate(row: Row): string | null {
  const iso = row.actual_start ?? row.scheduled_start;
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? bangkokDate(ms) : null;
}

async function unhide(videoId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("video_id, channel_name, title, metadata")
    .eq("video_id", videoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    console.log(`ไม่พบ video_id ${videoId}`);
    return;
  }
  console.log(`unhide: ${data.video_id} · ${data.channel_name ?? "-"} · ${data.title ?? "-"}`);
  if (!APPLY) {
    console.log("dry run: ใส่ --apply เพื่อบันทึก");
    return;
  }
  const meta = { ...((data.metadata as Record<string, unknown> | null) ?? {}) };
  delete meta.hidden;
  delete meta.hidden_reason;
  delete meta.hidden_at;
  const { error: upError } = await supabase.from(TABLE).update({ metadata: meta }).eq("video_id", videoId);
  if (upError) throw new Error(upError.message);
  console.log("บันทึกแล้ว: แสดงบนหน้าเว็บอีกครั้ง");
}

type VideoRow = {
  video_id: string;
  channel_name: string | null;
  title: string | null;
  published_at: string | null;
  metadata: Record<string, unknown> | null;
};

const VIDEO_TABLE = "mild_r_videos";

async function unhideVideo(videoId: string) {
  const { data, error } = await supabase
    .from(VIDEO_TABLE)
    .select("video_id, channel_name, title, hidden, metadata")
    .eq("video_id", videoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    console.log(`ไม่พบคลิป ${videoId}`);
    return;
  }
  console.log(`unhide คลิป: ${data.video_id} · ${data.channel_name ?? "-"} · ${data.title ?? "-"}`);
  if (!APPLY) {
    console.log("dry run: ใส่ --apply เพื่อบันทึก");
    return;
  }
  const meta = { ...((data.metadata as Record<string, unknown> | null) ?? {}) };
  delete meta.hidden_reason;
  delete meta.hidden_at;
  const { error: upError } = await supabase
    .from(VIDEO_TABLE)
    .update({ hidden: false, metadata: meta })
    .eq("video_id", videoId);
  if (upError) throw new Error(upError.message);
  console.log("บันทึกแล้ว: แสดงในหน้า Media อีกครั้ง");
}

async function runVideos() {
  const rows: VideoRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(VIDEO_TABLE)
      .select("video_id, channel_name, title, published_at, metadata")
      .eq("is_own_channel", false)
      .eq("hidden", false)
      .order("published_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as VideoRow[]));
    if (!data || data.length < PAGE) break;
  }

  const tagged = (row: VideoRow) => {
    const description = row.metadata?.description;
    return (
      textTagsMildRHandle(row.title) ||
      (typeof description === "string" && textTagsMildRHandle(description))
    );
  };
  const targets = rows.filter((row) => !tagged(row));
  const kept = rows.length - targets.length;
  const day = (iso: string | null) => (iso ? bangkokDate(Date.parse(iso)) : "-");

  console.log(`คลิปจากช่องอื่นที่ยังแสดงอยู่ ${rows.length} รายการ · เก็บไว้ (มี @) ${kept}`);
  console.log(`\nจะซ่อน (ไม่มี @MildRWorldEnd ทั้งในหัวข้อและคำอธิบาย): ${targets.length}`);
  for (const row of targets) {
    console.log(`  - ${row.video_id} · ${day(row.published_at)} · ${row.channel_name ?? "-"} · ${row.title ?? "-"}`);
  }

  if (!APPLY) {
    console.log("\ndry run: ยังไม่ได้บันทึก ใส่ --apply เพื่อซ่อนรายการด้านบน");
    return;
  }

  let saved = 0;
  for (const row of targets) {
    const meta = {
      ...(row.metadata ?? {}),
      hidden_reason: "guest-video-without-handle",
      hidden_at: new Date().toISOString(),
    };
    const { error: upError } = await supabase
      .from(VIDEO_TABLE)
      .update({ hidden: true, metadata: meta })
      .eq("video_id", row.video_id);
    if (upError) {
      console.error(`  ✗ ${row.video_id}: ${upError.message}`);
      continue;
    }
    saved += 1;
  }
  console.log(`\nซ่อนแล้ว ${saved}/${targets.length} คลิป`);
}

async function main() {
  if (VIDEOS) {
    if (UNHIDE) await unhideVideo(UNHIDE);
    else await runVideos();
    return;
  }
  if (UNHIDE) {
    await unhide(UNHIDE);
    return;
  }

  const now = Date.now();
  const today = bangkokDate(now);
  const startDate = bangkokDate(now - (DAYS - 1) * DAY_MS);
  const since = new Date(Date.parse(`${startDate}T00:00:00+07:00`)).toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select("video_id, channel_name, title, scheduled_start, actual_start, metadata")
    .eq("is_own_channel", false)
    .or(`scheduled_start.gte.${since},actual_start.gte.${since}`)
    .limit(500);
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as Row[]).filter((row) => {
    const d = rowDate(row);
    return d !== null && d >= startDate && d <= today;
  });
  const visible = rows.filter((row) => row.metadata?.hidden !== true);
  const targets = visible.filter((row) => !rowTagsHandle(row));
  const kept = visible.filter((row) => rowTagsHandle(row));

  console.log(`ช่วงวันที่ ${startDate} → ${today} (Asia/Bangkok) · ไลฟจากช่องอื่นที่ยังแสดงอยู่ ${visible.length} รายการ`);
  console.log(`\nจะซ่อน (ไม่มี @MildRWorldEnd ทั้งในหัวข้อและคำอธิบาย): ${targets.length}`);
  for (const row of targets) {
    console.log(`  - ${row.video_id} · ${rowDate(row)} · ${row.channel_name ?? "-"} · ${row.title ?? "-"}`);
  }
  console.log(`\nเก็บไว้ (มี @MildRWorldEnd ในหัวข้อหรือคำอธิบาย): ${kept.length}`);
  for (const row of kept) {
    console.log(`  - ${row.video_id} · ${rowDate(row)} · ${row.channel_name ?? "-"} · ${row.title ?? "-"}`);
  }

  if (!APPLY) {
    console.log("\ndry run: ยังไม่ได้บันทึก ใส่ --apply เพื่อซ่อนรายการด้านบน");
    return;
  }

  let saved = 0;
  for (const row of targets) {
    const meta = {
      ...(row.metadata ?? {}),
      hidden: true,
      hidden_reason: "guest-live-without-handle",
      hidden_at: new Date().toISOString(),
    };
    const { error: upError } = await supabase.from(TABLE).update({ metadata: meta }).eq("video_id", row.video_id);
    if (upError) {
      console.error(`  ✗ ${row.video_id}: ${upError.message}`);
      continue;
    }
    saved += 1;
  }
  console.log(`\nซ่อนแล้ว ${saved}/${targets.length} รายการ`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
