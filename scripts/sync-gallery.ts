/**
 * Gallery sync
 *
 * Finds images in public/assets/Gallery/{moments,mild} that
 * src/data/mild-r/gallery.json does not reference yet and appends them using
 * the default entry pattern. Existing entries are never reordered or rewritten
 * (only missing width/height/thumb are filled), so the curated order (and the
 * home preview, which shows the first 8) only changes when edited by hand.
 *
 * Every new upload is kept as-is in originals/gallery (committed, not served).
 * Anything that is not already a URL-safe .webp is converted (long edge ≤ 1920)
 * next to its source. Every entry gets a <stem>-thumb.webp (≤ 800) for grid
 * tiles; the lightbox keeps the full image.
 *
 * Runs before `next dev` / `next build`. `npm run dev` also starts it with
 * `--watch=<pid>`, so images dropped in while the dev server runs are picked up;
 * the watcher exits when that pid does.
 *
 *   npx tsx scripts/sync-gallery.ts [--dry-run] [--watch[=<pid>]]
 *
 * Defaults per new item:
 *   file    moments: NN-<slug>.webp (next free number), mild: <slug>.webp
 *   id      moment-<slug from filename>
 *   alt     filename text outside 【…】 (video timestamps / "screenshot" removed)
 *   credit  YouTube when the filename says "screenshot", otherwise X
 *   size    next slot of TAIL_PATTERN, counted from the item after TAIL_ANCHOR_ID
 *   width/height  intrinsic pixels (also backfilled on existing entries that lack them)
 *   loadOnDemand  true (keeps new items after the eager ones, i.e. truly last)
 */
import { createHash } from "node:crypto";
import { existsSync, watch as watchDir } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { GalleryItem, GalleryTileSize } from "../src/types/vtuber";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const GALLERY_DIR = path.join(PUBLIC_DIR, "assets/Gallery");
const GALLERY_URL = "/assets/Gallery";
/** `numbered` folders name files `NN-<slug>`; the number is fixed once assigned. */
const SOURCE_FOLDERS = [
  { folder: "moments", numbered: true },
  { folder: "mild", numbered: false },
];
const NUMBER_PREFIX = /^(\d+)-/;
const ORIGINALS_DIR = path.join(ROOT, "originals/gallery");
const GALLERY_JSON = path.join(ROOT, "src/data/mild-r/gallery.json");

/** Last hand-curated entry; everything after it follows TAIL_PATTERN. */
const TAIL_ANCHOR_ID = "moment-winter-treat";
/**
 * Archive rows 3 → 4 → 5 on the 4-column grid (5 tiles = one full 2-row band):
 * large tile in the middle, then left, then right.
 */
const TAIL_PATTERN: GalleryTileSize[] = [
  "sm", "lg", "sm", "sm", "sm",
  "lg", "sm", "sm", "sm", "sm",
  "sm", "sm", "lg", "sm", "sm",
];

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;
const FULL_EDGE = 1920;
/** Widest tile is two grid columns (~600 CSS px); 800 covers it on most screens. */
const THUMB_EDGE = 800;
const THUMB_QUALITY = 78;
/** Generated thumbs live next to their image and must never be imported as new items. */
const THUMB_SUFFIX = "-thumb.webp";
/** Wait for copies to settle before syncing (Finder / AirDrop write in chunks). */
const WATCH_DEBOUNCE_MS = 1500;
const CREDIT_X = "Mild-R · X (@MildRWorldEnd)";
const CREDIT_YOUTUBE = "Mild-R · YouTube (@MildRWorldEnd)";

const dryRun = process.argv.includes("--dry-run");
const watchArg = process.argv.find((arg) => arg === "--watch" || arg.startsWith("--watch="));

function slugOf(stem: string) {
  return stem
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\bscreenshot\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

function altOf(stem: string) {
  // NFKC would split Thai sara am (ำ) into nikhahit + sara aa.
  const text = stem.normalize("NFC");
  const outside = text
    .replace(/【[^】]*】|\[[^\]]*\]/g, " ")
    .replace(/\bscreenshot\b/gi, " ")
    .replace(/(^|\s)\d{1,2}(?:-\d{1,2}){1,2}(?=\s|$)/g, " ")
    .replace(/[_\s]+/g, " ")
    .trim();
  if (outside) return outside;
  const bracket = text.match(/【([^】]+)】|\[([^\]]+)\]/);
  return (bracket?.[1] ?? bracket?.[2] ?? "").trim() || "ภาพใหม่";
}

function creditOf(stem: string) {
  return /screenshot/i.test(stem) ? CREDIT_YOUTUBE : CREDIT_X;
}

function isImageName(name: string) {
  return IMAGE_EXT.has(path.extname(name).toLowerCase()) && !name.endsWith(THUMB_SUFFIX);
}

function thumbSrcOf(src: string) {
  return `${src.slice(0, -path.extname(src).length)}${THUMB_SUFFIX}`;
}

async function shortHash(file: string) {
  return createHash("sha1").update(await readFile(file)).digest("hex").slice(0, 8);
}

async function imageSize(file: string) {
  const meta = await sharp(file).metadata();
  return {
    width: meta.autoOrient?.width ?? meta.width ?? 1,
    height: meta.autoOrient?.height ?? meta.height ?? 1,
  };
}

/** Copies an upload into ORIGINALS_DIR without overwriting an earlier one. */
async function keepOriginal(file: string, name: string, slug: string) {
  await mkdir(ORIGINALS_DIR, { recursive: true });
  const target = path.join(ORIGINALS_DIR, name);
  await copyFile(file, existsSync(target) ? path.join(ORIGINALS_DIR, `${slug}-${name}`) : target);
}

/** Fills width/height on entries that don't have them; returns how many changed. */
async function backfillSizes(items: GalleryItem[]) {
  let filled = 0;
  for (const item of items) {
    if (item.width && item.height) continue;
    const file = path.join(PUBLIC_DIR, item.src);
    if (!item.src.startsWith("/") || !existsSync(file)) continue;
    Object.assign(item, await imageSize(file));
    filled += 1;
  }
  return filled;
}

/** Creates missing thumbs and points `thumb` at them; returns how many entries changed. */
async function ensureThumbs(items: GalleryItem[]) {
  let changed = 0;
  for (const item of items) {
    const ext = path.extname(item.src).toLowerCase();
    if (!item.src.startsWith("/") || !IMAGE_EXT.has(ext) || item.src.endsWith(THUMB_SUFFIX)) continue;
    const input = path.join(PUBLIC_DIR, item.src);
    if (!existsSync(input)) continue;

    const thumb = thumbSrcOf(item.src);
    const output = path.join(PUBLIC_DIR, thumb);
    if (!existsSync(output)) {
      if (dryRun) continue;
      await sharp(input)
        .rotate()
        .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(output);
    }
    if (item.thumb !== thumb) {
      item.thumb = thumb;
      changed += 1;
    }
  }
  return changed;
}

async function sync({ quiet = false } = {}) {
  const items = JSON.parse(await readFile(GALLERY_JSON, "utf8")) as GalleryItem[];
  const filled = await backfillSizes(items);
  const usedSrc = new Set(items.flatMap((item) => [item.src, item.thumb].filter(Boolean)));
  const usedIds = new Set(items.map((item) => item.id));

  const anchorIndex = items.findIndex((item) => item.id === TAIL_ANCHOR_ID);
  if (anchorIndex < 0) {
    console.warn(`gallery: anchor ${TAIL_ANCHOR_ID} not found, pattern counts from the start`);
  }
  const tailSize = (index: number) =>
    TAIL_PATTERN[(index - (anchorIndex + 1)) % TAIL_PATTERN.length];

  const pending = [];
  const lastNumber = new Map<string, number>();
  for (const { folder, numbered } of SOURCE_FOLDERS) {
    const dir = path.join(GALLERY_DIR, folder);
    if (!existsSync(dir)) continue;
    const names = await readdir(dir, { withFileTypes: true });
    if (numbered) {
      const numbers = names.map((entry) => Number(entry.name.match(NUMBER_PREFIX)?.[1] ?? 0));
      lastNumber.set(folder, Math.max(0, ...numbers));
    }
    for (const entry of names) {
      if (!entry.isFile() || !isImageName(entry.name)) continue;
      if (usedSrc.has(`${GALLERY_URL}/${folder}/${entry.name}`)) continue;
      const file = path.join(dir, entry.name);
      pending.push({ folder, numbered, dir, name: entry.name, file, mtime: (await stat(file)).mtimeMs });
    }
  }

  pending.sort((a, b) => a.mtime - b.mtime || a.name.localeCompare(b.name));
  const added: GalleryItem[] = [];

  for (const { folder, numbered, dir, name, file } of pending) {
    const ext = path.extname(name).toLowerCase();
    const stem = path.parse(name).name;
    const isSafeWebp = ext === ".webp" && SAFE_NAME.test(name);
    const keepInPlace = isSafeWebp && !numbered;

    let prefix = "";
    if (numbered) {
      const number = (lastNumber.get(folder) ?? 0) + 1;
      lastNumber.set(folder, number);
      prefix = `${String(number).padStart(2, "0")}-`;
    }

    const rawSlug = isSafeWebp ? stem.replace(NUMBER_PREFIX, "") : slugOf(stem);
    let slug = rawSlug || (await shortHash(file));
    if (!keepInPlace) {
      const base = slug;
      for (let n = 2; ; n += 1) {
        const taken =
          usedIds.has(`moment-${slug}`) || existsSync(path.join(dir, `${prefix}${slug}.webp`));
        if (!taken) break;
        slug = `${base}-${n}`;
      }
    }

    const outName = keepInPlace ? name : `${prefix}${slug}.webp`;
    let width: number;
    let height: number;

    if (dryRun) {
      ({ width, height } = await imageSize(file));
    } else if (isSafeWebp) {
      ({ width, height } = await imageSize(file));
      await keepOriginal(file, name, slug);
      if (!keepInPlace) await rename(file, path.join(dir, outName));
    } else {
      const info = await sharp(file)
        .rotate()
        .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(path.join(dir, outName));
      width = info.width;
      height = info.height;
      await mkdir(ORIGINALS_DIR, { recursive: true });
      const original = path.join(ORIGINALS_DIR, name);
      await rename(file, existsSync(original) ? path.join(ORIGINALS_DIR, `${slug}-${name}`) : original);
    }

    const id = `moment-${slug}`;
    usedIds.add(id);
    added.push({
      id,
      src: `${GALLERY_URL}/${folder}/${outName}`,
      alt: altOf(stem),
      credit: creditOf(stem),
      size: tailSize(items.length + added.length),
      width,
      height,
      loadOnDemand: true,
    });
    const last = added[added.length - 1];
    console.log(
      `${dryRun ? "[dry-run] " : ""}+ ${folder}/${name} -> ${outName} (${width}x${height}, ${last.size})`
    );
  }

  const next = [...items, ...added];
  const thumbs = await ensureThumbs(next);

  if (dryRun) {
    if (added.length) console.log(JSON.stringify(added, null, 2));
    console.log(`gallery: [dry-run] ${added.length} new · ${filled} missing size`);
    return;
  }

  if (added.length || filled || thumbs) {
    await writeFile(GALLERY_JSON, `${JSON.stringify(next, null, 2)}\n`);
  }
  const parts = [
    added.length && `added ${added.length} image(s)`,
    filled && `filled size on ${filled}`,
    thumbs && `${thumbs} thumb(s)`,
  ].filter(Boolean);
  if (parts.length) console.log(`gallery: ${parts.join(" · ")}`);
  else if (!quiet) console.log("gallery: no new images");
}

/** Re-syncs whenever an image lands in a source folder, until `parentPid` exits. */
function watch(parentPid?: number) {
  let running = false;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await sync({ quiet: true });
    } catch (error) {
      console.error("gallery:", error);
    }
    running = false;
    if (again) {
      again = false;
      schedule();
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, WATCH_DEBOUNCE_MS);
  };

  for (const { folder } of SOURCE_FOLDERS) {
    const dir = path.join(GALLERY_DIR, folder);
    if (!existsSync(dir)) continue;
    watchDir(dir, (_event, name) => {
      if (name && isImageName(name)) schedule();
    });
  }

  if (parentPid) {
    setInterval(() => {
      try {
        process.kill(parentPid, 0);
      } catch {
        process.exit(0);
      }
    }, 2000);
  }
  console.log(`gallery: watching ${SOURCE_FOLDERS.map((f) => f.folder).join(", ")}`);
}

if (watchArg) {
  const pid = Number(watchArg.split("=")[1]);
  watch(Number.isInteger(pid) && pid > 0 ? pid : undefined);
} else {
  sync().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
