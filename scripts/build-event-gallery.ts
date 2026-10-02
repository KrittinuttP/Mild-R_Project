/**
 * Event gallery builder
 *
 * Reads doc/research/mild-r-event-assets.json, converts the original archive
 * images (public/assets/events/archive — gitignored) into webp, and writes
 * src/data/mild-r/event-gallery.json for /events/[id].
 *
 *   npx tsx scripts/build-event-gallery.ts [--force]
 *
 * Output per image: <stem>.webp (long edge ≤ 1600) + <stem>-thumb.webp (≤ 600).
 * Existing outputs are skipped unless --force is passed.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { EventGalleryImage } from "../src/types/vtuber";

type ManifestImage = {
  path: string;
  width: number;
  height: number;
  sha256: string;
};

type ManifestCollection = {
  id: string;
  title: string;
  collectionType: "event" | "supporting";
  sources: {
    url: string;
    publishedAt?: string;
    images: ManifestImage[];
  }[];
};

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const MANIFEST = path.join(ROOT, "doc/research/mild-r-event-assets.json");
const OUT_JSON = path.join(ROOT, "src/data/mild-r/event-gallery.json");
const GALLERY_URL = "/assets/events/gallery";

/**
 * Sources in "supporting" collections that belong to their own event.
 * Everything else in a supporting collection stays out of the gallery.
 */
const SUPPORTING_SOURCE_EVENTS: Record<string, { id: string; title: string }> = {
  "https://x.com/PixelaProject/status/1842505006546595861": {
    id: "pixela-lockdown-protocol-2024",
    title: "Pixela Lockdown Protocol 2024",
  },
};

const FULL_EDGE = 1600;
const THUMB_EDGE = 600;
const force = process.argv.includes("--force");

/** Event pages show announcement art only, not livestream / video thumbnails. */
function isYoutubeThumbnail(imagePath: string) {
  return path.basename(imagePath).startsWith("youtube-");
}

async function toWebp(input: string, output: string, edge: number, quality: number) {
  if (!force && existsSync(output)) return sharp(output).metadata();
  const { width, height } = await sharp(input)
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toFile(output);
  return { width, height };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as {
    collections: ManifestCollection[];
  };

  const gallery: Record<string, EventGalleryImage[]> = {};
  const seen: Record<string, Set<string>> = {};
  let missing = 0;

  async function addSource(
    eventId: string,
    title: string,
    source: ManifestCollection["sources"][number]
  ) {
    const outDir = path.join(PUBLIC_DIR, GALLERY_URL, eventId);
    await mkdir(outDir, { recursive: true });
    const images = (gallery[eventId] ??= []);
    const hashes = (seen[eventId] ??= new Set());

    for (const image of source.images) {
      if (isYoutubeThumbnail(image.path)) continue;
      if (hashes.has(image.sha256)) continue;
      hashes.add(image.sha256);

      const input = path.join(PUBLIC_DIR, image.path);
      if (!existsSync(input)) {
        missing += 1;
        console.warn(`missing: ${image.path}`);
        continue;
      }

      const stem = path.parse(image.path).name;
      const full = await toWebp(input, path.join(outDir, `${stem}.webp`), FULL_EDGE, 82);
      await toWebp(input, path.join(outDir, `${stem}-thumb.webp`), THUMB_EDGE, 72);

      images.push({
        src: `${GALLERY_URL}/${eventId}/${stem}.webp`,
        thumb: `${GALLERY_URL}/${eventId}/${stem}-thumb.webp`,
        width: full.width ?? image.width,
        height: full.height ?? image.height,
        alt: `${title} — ภาพที่ ${images.length + 1}`,
        sourceUrl: source.url,
        ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}),
      });
    }
  }

  for (const collection of manifest.collections) {
    for (const source of collection.sources) {
      if (collection.collectionType === "event") {
        await addSource(collection.id, collection.title, source);
      } else if (SUPPORTING_SOURCE_EVENTS[source.url]) {
        const target = SUPPORTING_SOURCE_EVENTS[source.url];
        await addSource(target.id, target.title, source);
      }
    }
  }

  for (const [id, images] of Object.entries(gallery)) {
    console.log(`${id}: ${images.length} images`);
  }

  await writeFile(OUT_JSON, `${JSON.stringify(gallery, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT_JSON)}${missing ? ` (${missing} missing)` : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
