// One-off fix + real-job test for the "01 SEP – 07 SEP" Live Schedule poster
// (really 1–7 Nov 2026, tweet 2116409835499684319). The old agent put its lives in September.
//
//   node scripts/fix-nov-live.mjs requeue [--yes]
//     1. delete the wrong previews on 2 Sep / 4 Sep (manual_preview rows only, max 2)
//     2. put the poster back in the agent queue (status = pending)
//     → the scheduled job (pg_cron, every hour at :05) re-reads it with the deployed code
//
//   node scripts/fix-nov-live.mjs run [--yes]
//     1. same delete as requeue
//     2. call the deployed agent now (manual): dry-run first, then the real run only if
//        every date it reports is in 1–7 Nov
//     3. then the same check as below
//
//   node scripts/fix-nov-live.mjs check [--wait]
//     3. check what the job did: PASS / FAIL (exit code 0 / 1)
//        --wait polls every 60 s for up to 70 min until the job has run
//
// --yes skips the confirmation prompts (for Cursor / CI). Safe to re-run.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

// Read the repo's .env inside this process (like `next dev` does), so the command
// itself never has to point at .env. Values are never printed.
const ENV_FILE = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const TWEET_ID = "2116409835499684319";
const EXPECTED = [
  { date: "2026-11-06", time: "19:00", title: "แอชี่หักหลังบุมาจีบมายแทน" },
  { date: "2026-11-07", time: "21:00", title: "VOLCANO PRINCESS" },
];
const mode = process.argv[2];
const AUTO_YES = process.argv.includes("--yes");
const WAIT = process.argv.includes("--wait");

const { NEXT_PUBLIC_SUPABASE_URL: SB_URL, SUPABASE_SERVICE_ROLE_KEY: SB_KEY } = process.env;
if (!SB_URL || !SB_KEY) {
  console.error("ต้องมี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env ที่ root ของ repo");
  process.exit(1);
}
if (!["requeue", "run", "check"].includes(mode)) {
  console.error("ใช้: node scripts/fix-nov-live.mjs requeue|run|check [--yes] [--wait]");
  process.exit(1);
}
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
const rl = AUTO_YES || mode === "check" ? null : createInterface({ input: process.stdin, output: process.stdout });
const confirm = async (q) =>
  AUTO_YES ? true : (await rl.question(`${q} พิมพ์ y เพื่อยืนยัน: `)).trim().toLowerCase() === "y";
const done = (code = 0) => {
  rl?.close();
  process.exit(code);
};
const bkk = (iso, opts) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", ...opts });
const bkkDate = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const bkkTime = (iso) => bkk(iso, { hour: "2-digit", minute: "2-digit" });

async function loadPoster() {
  const { data, error } = await sb
    .from("mild_r_x_live_schedules")
    .select("status, agent_processed_at, attempt_count, next_retry_at, error_message, parsed_json")
    .eq("tweet_id", TWEET_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    console.log(`ไม่เจอรูป tweet ${TWEET_ID} ในตาราง`);
    done(1);
  }
  return data;
}

// ── 1. wrong previews ──────────────────────────────────────────────
async function deleteWrong() {
  const { data: wrong, error: findErr } = await sb
    .from("mild_r_live_streams")
    .select("video_id, title, metadata")
    .like("video_id", "manual-%")
    .eq("metadata->>source", "manual_preview")
    .in("metadata->>local_date", ["2026-09-02", "2026-09-04"]);
  if (findErr) throw findErr;

  console.log(`\n[1] ไลฟ์ตัวอย่างที่ผิด (2 Sep / 4 Sep): ${wrong.length} รายการ`);
  for (const r of wrong) console.log(`    ${r.metadata?.local_date} ${r.metadata?.local_time}  ${r.title}`);
  if (wrong.length > 2) {
    console.log("    เจอมากกว่า 2 รายการ — หยุด ไม่ลบอะไร");
    done(1);
  }
  if (wrong.length && (await confirm("    ลบรายการข้างบน?"))) {
    const { error } = await sb.from("mild_r_live_streams").delete().in("video_id", wrong.map((r) => r.video_id));
    if (error) throw error;
    console.log("    ลบแล้ว ✓");
  }
}

// ── requeue: let the scheduled job pick the poster up ──────────────
if (mode === "requeue") {
  await deleteWrong();
  const before = await loadPoster();
  console.log(`\n[2] รูป ${TWEET_ID} ตอนนี้: status=${before.status} · อ่านล่าสุด ${before.agent_processed_at ? bkk(before.agent_processed_at) : "-"}`);
  if (await confirm("    ส่งกลับเข้าคิว (pending) ให้ job อ่านใหม่?")) {
    const { error } = await sb
      .from("mild_r_x_live_schedules")
      .update({ status: "pending", attempt_count: 0, next_retry_at: null, error_message: null, updated_at: new Date().toISOString() })
      .eq("tweet_id", TWEET_ID);
    if (error) throw error;
    const next = new Date();
    next.setUTCMinutes(5, 0, 0);
    if (next <= new Date()) next.setUTCHours(next.getUTCHours() + 1);
    console.log(`    เข้าคิวแล้ว ✓ · job รอบถัดไปประมาณ ${bkkTime(next.toISOString())} (เวลาไทย)`);
    console.log("    แล้วรัน: node scripts/fix-nov-live.mjs check --wait");
  }
  done(0);
}

// ── run: call the deployed agent now (manual) ──────────────────────
if (mode === "run") {
  await deleteWrong();
  const SECRET = process.env.LIVE_AGENT_CRON_SECRET;
  if (!SECRET) {
    console.error("ต้องมี LIVE_AGENT_CRON_SECRET ใน .env");
    done(1);
  }
  const AGENT_URL = `${(process.env.APP_URL || "https://mild-r-project.vercel.app").replace(/\/$/, "")}/api/live/agent/run`;
  const runAgent = async (dryRun) => {
    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId: TWEET_ID, dryRun }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.log(`    agent ตอบ HTTP ${res.status}: ${body.error ?? ""}`);
      if (res.status === 401) console.log("    → LIVE_AGENT_CRON_SECRET ใน .env ไม่ตรงกับบน Vercel");
      done(1);
    }
    return body.results?.[0];
  };

  console.log(`\n[2] สั่ง agent อ่านรูปทันที (manual) · ${AGENT_URL}`);
  const trial = await runAgent(true);
  if (!trial) {
    console.log("    agent ไม่เจอรูปนี้");
    done(1);
  }
  const skipped = trial.skippedDates ?? [];
  console.log(`    ลองก่อน (dry-run): status=${trial.status} · จะเพิ่ม ${trial.toInsert ?? 0} · ข้ามวันที่มีแล้ว: ${skipped.join(", ") || "-"}${trial.error ? ` · ${trial.error}` : ""}`);
  if (trial.status === "failed" || !skipped.every((d) => d >= "2026-11-01" && d <= "2026-11-07")) {
    console.log("    วันที่ยังไม่อยู่ใน 1–7 Nov → production อาจยังไม่ใช่โค้ดใหม่ หยุดไว้ก่อน ไม่รันจริง");
    done(1);
  }
  if ((trial.toInsert ?? 0) === 0) {
    console.log("    ไม่มีอะไรต้องเพิ่ม (6–7 Nov มีแล้ว)");
  } else if (await confirm(`    รันจริง เพิ่ม ${trial.toInsert} รายการ?`)) {
    const real = await runAgent(false);
    console.log(`    รันจริง: ${real.status} · เพิ่มแล้ว ${real.imported ?? 0} รายการ ✓${real.error ? ` · ${real.error}` : ""}`);
  }
}

// ── check ──────────────────────────────────────────────────────────
let poster = await loadPoster();
if (poster.status === "pending" && WAIT) {
  console.log("\nรอ job อ่านรูป (เช็คทุก 60 วิ สูงสุด 70 นาที)…");
  for (let i = 0; i < 70 && poster.status === "pending"; i++) {
    await new Promise((r) => setTimeout(r, 60_000));
    poster = await loadPoster();
    process.stdout.write(".");
  }
  console.log("");
}

const pj = poster.parsed_json && !Array.isArray(poster.parsed_json) ? poster.parsed_json : {};
const imported = Array.isArray(pj.imported) ? pj.imported : [];
const fixes = Array.isArray(pj.week_fixes) ? pj.week_fixes : [];
console.log(`\n[3] รูป ${TWEET_ID}`);
console.log(`    status=${poster.status} · อ่านล่าสุด ${poster.agent_processed_at ? bkk(poster.agent_processed_at) : "-"} · ครั้งที่ ${poster.attempt_count}`);
console.log(`    imported: ${imported.map((i) => `${i.date} ${i.time}`).join(", ") || "-"}`);
console.log(`    week_fixes: ${fixes.map((f) => (f.to ? `${f.from}→${f.to}` : `${f.from} dropped`)).join(", ") || "-"}`);
console.log(`    message: ${poster.error_message ?? "-"}`);

const { data: logs, error: logErr } = await sb
  .from("mild_r_sync_logs")
  .select("created_at, status, message")
  .eq("source", "agent-live-schedule")
  .order("created_at", { ascending: false })
  .limit(3);
if (logErr) throw logErr;
console.log("    log ของ job ล่าสุด:");
for (const l of logs) console.log(`      ${bkk(l.created_at)}  ${l.status}  ${(l.message ?? "").slice(0, 120)}`);

const { data: nov, error: novErr } = await sb
  .from("mild_r_live_streams")
  .select("title, scheduled_start")
  .gte("scheduled_start", "2026-11-05T17:00:00Z") // 6 Nov 00:00 Bangkok
  .lt("scheduled_start", "2026-11-07T17:00:00Z"); // 8 Nov 00:00 Bangkok
if (novErr) throw novErr;
console.log("    ปฏิทิน 6–7 Nov:");
for (const r of nov) console.log(`      ${bkkDate(r.scheduled_start)} ${bkkTime(r.scheduled_start)}  ${r.title}`);
if (!nov.length) console.log("      (ว่าง)");

const checks = [
  ["job อ่านรูปแล้ว (ไม่ค้าง pending / failed)", poster.status === "imported" || poster.status === "skipped"],
  ["วันที่ที่ใส่อยู่ใน 1–7 Nov ทั้งหมด", imported.every((i) => i.date >= "2026-11-01" && i.date <= "2026-11-07")],
  // week_fixes is empty when the model already returns November (the week hint worked),
  // and lists 09→11 moves when the guard had to repair the month: both are fine.
  ["ไม่มีวันที่หลุดออกนอกสัปดาห์ (dropped)", !fixes.some((f) => !f.to)],
  ...EXPECTED.map((e) => [
    `ปฏิทินมี ${e.date} ${e.time}`,
    nov.some((r) => bkkDate(r.scheduled_start) === e.date && bkkTime(r.scheduled_start) === e.time),
  ]),
];
console.log("\nผล:");
for (const [label, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${label}`);
const pass = checks.every(([, ok]) => ok);
console.log(pass ? "\nPASS ✓ job ใช้ได้จริง\n" : "\nFAIL ✗ ดูรายละเอียดข้างบน\n");
done(pass ? 0 : 1);
