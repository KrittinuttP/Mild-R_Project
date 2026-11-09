// Safari / iOS copy of the Live2D Key Visual (HEVC + alpha .mov), wired into cafe.json.
// Chrome / Edge / Firefox already use the VP9 .webm; WebKit drops VP9 alpha, so it needs this.
//
//   node scripts/kv-motion-mov.mjs check          state only, changes nothing
//   node scripts/kv-motion-mov.mjs run [--yes]    make what is missing, then check
//   node scripts/kv-motion-mov.mjs run --force    remake the .mov files even if they exist
//
// macOS only (VideoToolbox). Uses ffmpeg's hevc_videotoolbox when Homebrew ffmpeg has it,
// otherwise scripts/kv-hevc-alpha.swift (AVFoundation, needs Xcode / Command Line Tools).
// (avconvert is not used: on some macOS versions it has no "WithAlpha" preset.)
// Sources (cropped, not in git): _source/kv/preview/half_master(_m)_p4444.mov for ffmpeg,
// frames_d/ · frames_m/ (RGBA PNG per frame) for Swift. Writes only:
//   public/assets/cafe/kv/KV_cafe_l2d_half.mov · KV_cafe_l2d_half_m.mov
//   src/data/mild-r/cafe.json → heroMotion.mov / heroMotion.movSmall
// --yes skips the confirmation (for Cursor). Safe to re-run. Exit 0 = PASS, 1 = FAIL.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const [mode = "check", ...flags] = process.argv.slice(2);
const YES = flags.includes("--yes");
const FORCE = flags.includes("--force");

const SRC_DIR = "_source/kv/preview";
const OUT_DIR = "public/assets/cafe/kv";
const JSON_PATH = "src/data/mild-r/cafe.json";
const JOBS = [
  { key: "mov", master: "half_master_p4444.mov", frames: "frames_d", out: "KV_cafe_l2d_half.mov", size: "760x1140", bitrate: 2_500_000, maxMB: 8 },
  { key: "movSmall", master: "half_master_m_p4444.mov", frames: "frames_m", out: "KV_cafe_l2d_half_m.mov", size: "464x696", bitrate: 1_200_000, maxMB: 4 },
];
const url = (job) => `/assets/cafe/kv/${job.out}`;

const lines = [];
const pass = (msg) => { lines.push(`PASS  ${msg}`); console.log(`PASS  ${msg}`); };
const failNow = (msg) => { lines.push(`FAIL  ${msg}`); console.log(`FAIL  ${msg}`); finish(1); };
function finish(code) {
  console.log("\n=== สรุป ===");
  for (const line of lines) console.log(line);
  console.log(code === 0 ? "RESULT: PASS" : "RESULT: FAIL");
  process.exit(code);
}
const run = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" });
const has = (cmd) => run("which", [cmd]).status === 0;

if (!["check", "run"].includes(mode)) {
  console.log("ใช้: node scripts/kv-motion-mov.mjs check | run [--yes] [--force]");
  process.exit(1);
}
if (!existsSync(JSON_PATH)) failNow("ต้องรันจากโฟลเดอร์โปรเจกต์ (ไม่เจอ src/data/mild-r/cafe.json)");

// ── 1. Check the state before touching anything ──
const branch = run("git", ["branch", "--show-current"]).stdout.trim();
if (branch !== "animation") failNow(`ต้องอยู่ branch animation (ตอนนี้: ${branch || "?"})`);
pass("อยู่ branch animation");

const cafeText = readFileSync(JSON_PATH, "utf8");
const motion = JSON.parse(cafeText).heroMotion;
if (!motion?.webmSmall) failNow("cafe.json ไม่มี heroMotion.webmSmall (โค้ด Live2D ไม่อยู่ใน branch นี้?)");
pass("cafe.json มี heroMotion");

const fileDone = (job) => existsSync(path.join(OUT_DIR, job.out));
const jsonDone = (job) => motion[job.key] === url(job);

if (mode === "check") {
  let ok = true;
  for (const job of JOBS) {
    if (fileDone(job)) pass(`มี ${OUT_DIR}/${job.out} (${(statSync(path.join(OUT_DIR, job.out)).size / 1048576).toFixed(1)} MB)`);
    else { ok = false; lines.push(`FAIL  ยังไม่มี ${OUT_DIR}/${job.out}`); console.log(`FAIL  ยังไม่มี ${OUT_DIR}/${job.out}`); }
    if (jsonDone(job)) pass(`cafe.json heroMotion.${job.key} ถูกต้อง`);
    else { ok = false; lines.push(`FAIL  cafe.json ยังไม่มี heroMotion.${job.key}`); console.log(`FAIL  cafe.json ยังไม่มี heroMotion.${job.key}`); }
  }
  finish(ok ? 0 : 1);
}

if (process.platform !== "darwin") failNow("ต้องรันบน macOS (ใช้ VideoToolbox ทำ HEVC พื้นใส)");

const SWIFT_SCRIPT = "scripts/kv-hevc-alpha.swift";
const ffmpegVT = has("ffmpeg") && run("ffmpeg", ["-hide_banner", "-encoders"]).stdout.includes("hevc_videotoolbox");
const swift = !ffmpegVT && existsSync(SWIFT_SCRIPT) && run("xcrun", ["--find", "swift"]).status === 0;
if (!ffmpegVT && !swift) {
  failNow("ไม่มีตัวแปลง: ต้องมี Xcode / Command Line Tools (xcode-select --install) หรือ Homebrew ffmpeg");
}
pass(`ตัวแปลง: ${ffmpegVT ? "ffmpeg · hevc_videotoolbox" : "Swift · AVFoundation (hevcWithAlpha)"}`);
const FRAME_COUNT = 420;
for (const job of JOBS) {
  if (ffmpegVT) {
    if (!existsSync(path.join(SRC_DIR, job.master))) failNow(`ไม่เจอไฟล์ต้นฉบับ ${SRC_DIR}/${job.master}`);
  } else {
    const dir = path.join(SRC_DIR, job.frames);
    const count = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).length : 0;
    if (count !== FRAME_COUNT) failNow(`${dir} มี PNG ${count} เฟรม (ต้องมี ${FRAME_COUNT})`);
  }
}
pass(ffmpegVT ? "เจอไฟล์ต้นฉบับครึ่งตัว 2 ไฟล์" : `เจอชุดรูป PNG 2 ชุด (${FRAME_COUNT} เฟรมต่อชุด)`);

const encode = JOBS.filter((job) => FORCE || !fileDone(job));
const wire = JOBS.filter((job) => !jsonDone(job));
console.log(`\nจะทำ: แปลง [${encode.map((j) => j.out).join(", ") || "-"}] · เพิ่มใน cafe.json [${wire.map((j) => j.key).join(", ") || "-"}]`);
if (encode.length === 0 && wire.length === 0) {
  pass("ทำครบแล้ว ไม่มีอะไรต้องแก้");
  finish(0);
}
if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("ยืนยัน? (y/N) ");
  rl.close();
  if (answer.trim().toLowerCase() !== "y") failNow("ยกเลิกโดยผู้ใช้");
}

// ── 2. Encode (into _source first; public/ only gets a file that passed every check) ──
for (const job of encode) {
  const src = path.join(SRC_DIR, job.master);
  const tmp = path.join(SRC_DIR, job.out);
  rmSync(tmp, { force: true });
  console.log(`กำลังแปลง ${job.out} … (ครั้งแรก Swift ต้อง compile สักครู่)`);
  const result = ffmpegVT
    ? run("ffmpeg", ["-v", "error", "-y", "-i", src, "-r", "24", "-an", "-c:v", "hevc_videotoolbox",
        "-allow_sw", "1", "-alpha_quality", "0.75", "-b:v", String(job.bitrate), "-tag:v", "hvc1", tmp])
    : run("xcrun", ["swift", SWIFT_SCRIPT, path.join(SRC_DIR, job.frames), tmp, String(job.bitrate), "30"]);
  if (result.status !== 0 || !existsSync(tmp)) {
    failNow(`แปลง ${job.out} ไม่สำเร็จ: ${(result.stderr || result.stdout || "").trim().slice(-400)}`);
  }
  const mb = statSync(tmp).size / 1048576;
  if (mb > job.maxMB) failNow(`${job.out} ใหญ่ ${mb.toFixed(1)} MB เกิน ${job.maxMB} MB → ไม่คัดลอกลง public`);
  if (has("ffprobe")) {
    const probe = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
      "stream=codec_name,codec_tag_string,width,height", "-of", "csv=p=0", tmp]).stdout.trim();
    const [codec, width, height, tag] = probe.split(",");
    if (codec !== "hevc") failNow(`${job.out} ไม่ใช่ HEVC (${probe})`);
    if (`${width}x${height}` !== job.size) failNow(`${job.out} ขนาด ${width}x${height} ไม่ใช่ ${job.size}`);
    if (tag !== "hvc1") failNow(`${job.out} tag เป็น ${tag} ไม่ใช่ hvc1 (Safari เล่นไม่ได้)`);
  }
  copyFileSync(tmp, path.join(OUT_DIR, job.out));
  pass(`${OUT_DIR}/${job.out} · ${job.size} · ${mb.toFixed(1)} MB`);
}

// ── 3. cafe.json: add the two lines after "webmSmall" (text edit keeps the file's formatting) ──
if (wire.length > 0) {
  const anchor = /^([ \t]*)"webmSmall": "[^"]+",\n/m;
  const match = cafeText.match(anchor);
  if (!match) failNow('cafe.json: หาบรรทัด "webmSmall" ไม่เจอ');
  const indent = match[1];
  const cleaned = cafeText.replace(/^[ \t]*"mov(?:Small)?": "[^"]*",\n/gm, "");
  const added = JOBS.map((job) => `${indent}"${job.key}": "${url(job)}",\n`).join("");
  const next = cleaned.replace(anchor, (line) => line + added);
  const parsed = JSON.parse(next).heroMotion;
  for (const job of JOBS) {
    if (parsed[job.key] !== url(job)) failNow(`cafe.json: heroMotion.${job.key} ไม่ถูกต้องหลังแก้`);
  }
  writeFileSync(JSON_PATH, next);
  pass("cafe.json: เพิ่ม heroMotion.mov / movSmall แล้ว");
}

// ── 4. Final state ──
for (const job of JOBS) {
  if (!fileDone(job)) failNow(`ยังไม่มี ${OUT_DIR}/${job.out}`);
}
pass("ไฟล์ .mov อยู่ใน public ครบ 2 ไฟล์");
finish(0);
