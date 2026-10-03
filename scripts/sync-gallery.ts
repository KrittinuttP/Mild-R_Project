/**
 * Gallery sync
 *
 * Finds images in public/assets/Gallery/{moments,mild} that
 * src/data/mild-r/gallery.json does not reference yet and appends them using
 * the default entry pattern. Existing entries are never touched, so the curated
 * order (and the home preview, which shows the first 8) only changes when
 * edited by hand. Anything that is not already a URL-safe .webp is converted
 * (long edge ≤ 1920) next to its source, and the original is moved to
 * public/assets/Gallery/originals (gitignored).
 *
 *   npx tsx scripts/sync-gallery.ts [--dry-run]
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
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { GalleryItem, GalleryTileSize } from "../src/types/vtuber";

const ROOT = process.cwd();
const GALLERY_DIR = path.join(ROOT, "public/assets/Gallery");
const GALLERY_URL = "/assets/Gallery";
/** `numbered` folders name files `NN-<slug>`; the number is fixed once assigned. */
const SOURCE_FOLDERS = [
  { folder: "moments", numbered: true },
  { folder: "mild", numbered: false },
];
const NUMBER_PREFIX = /^(\d+)-/;
const ORIGINALS_DIR = path.join(GALLERY_DIR, "originals");
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
const CREDIT_X = "Mild-R · X (@MildRWorldEnd)";
const CREDIT_YOUTUBE = "Mild-R · YouTube (@MildRWorldEnd)";

const dryRun = process.argv.includes("--dry-run");

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

/** Fills width/height on entries that don't have them; returns how many changed. */
async function backfillSizes(items: GalleryItem[]) {
  let filled = 0;
  for (const item of items) {
    if (item.width && item.height) continue;
    const file = path.join(ROOT, "public", item.src);
    if (!item.src.startsWith("/") || !existsSync(file)) continue;
    Object.assign(item, await imageSize(file));
    filled += 1;
  }
  return filled;
}

async function main() {
  const items = JSON.parse(await readFile(GALLERY_JSON, "utf8")) as GalleryItem[];
  const filled = await backfillSizes(items);
  const usedSrc = new Set(items.map((item) => item.src));
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
      if (!entry.isFile()) continue;
      if (!IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      if (usedSrc.has(`${GALLERY_URL}/${folder}/${entry.name}`)) continue;
      const file = path.join(dir, entry.name);
      pending.push({ folder, numbered, dir, name: entry.name, file, mtime: (await stat(file)).mtimeMs });
    }
  }

  if (pending.length === 0) {
    if (filled && !dryRun) {
      await writeFile(GALLERY_JSON, `${JSON.stringify(items, null, 2)}\n`);
      console.log(`gallery: no new images · filled size on ${filled} entr${filled === 1 ? "y" : "ies"}`);
    } else {
      console.log(`gallery: no new images${filled ? ` · ${filled} entries missing size [dry-run]` : ""}`);
    }
    return;
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

    if (isSafeWebp && numbered && !dryRun) {
      ({ width, height } = await imageSize(file));
      await rename(file, path.join(dir, outName));
    } else if (keepInPlace || dryRun) {
      ({ width, height } = await imageSize(file));
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

  if (dryRun) {
    console.log(JSON.stringify(added, null, 2));
    return;
  }

  await writeFile(GALLERY_JSON, `${JSON.stringify([...items, ...added], null, 2)}\n`);
  console.log(`gallery: added ${added.length} image(s) to ${path.relative(ROOT, GALLERY_JSON)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
