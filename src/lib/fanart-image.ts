import sharp from "sharp";

import { FANART_IMAGE_SIZES, type FanartMimeType } from "@/lib/fanart-upload";

/** About 120 MP (e.g. 9000 × 13000). Bigger inputs are refused before decoding. */
const MAX_INPUT_PIXELS = 120_000_000;

const FORMAT_TO_MIME: Record<string, FanartMimeType> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type FanartOriginalInfo = {
  /** Detected from the file contents, not the browser's claim. */
  type: FanartMimeType;
  /** Displayed size (after EXIF rotation). */
  width: number;
  height: number;
};

export type FanartCard = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
};

/**
 * Checks that an uploaded original is a real JPEG / PNG / WebP and makes the
 * 2048 px WebP copy (admin, lightbox) and a 720 px one (gallery tiles).
 * Throws when the file cannot be decoded.
 */
export async function processFanartOriginal(
  input: Buffer
): Promise<{ info: FanartOriginalInfo; card: FanartCard; thumb: FanartCard }> {
  const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
  const meta = await image.metadata();
  const type = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  if (!type || !meta.width || !meta.height) throw new Error("unsupported image");

  // EXIF orientations 5–8 swap width and height on screen.
  const swap = (meta.orientation ?? 1) >= 5;
  const info: FanartOriginalInfo = {
    type,
    width: swap ? meta.height : meta.width,
    height: swap ? meta.width : meta.height,
  };

  const edge = FANART_IMAGE_SIZES.artMaxEdge;
  const buffer = await image
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 5 })
    .toBuffer();

  const thumbEdge = FANART_IMAGE_SIZES.thumbMaxEdge;
  const thumb = await sharp(buffer)
    .resize({ width: thumbEdge, height: thumbEdge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer();

  return {
    info,
    card: { buffer, contentType: "image/webp", extension: "webp" },
    thumb: { buffer: thumb, contentType: "image/webp", extension: "webp" },
  };
}
