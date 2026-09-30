import sharp from "sharp";

import { HBD_IMAGE_SIZES } from "@/lib/hbd-upload";

export type ProcessedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
};

/** Card: fit within max edge (never upscale), EXIF-rotated, metadata stripped. */
export async function processHbdCard(input: Buffer): Promise<ProcessedImage> {
  const edge = HBD_IMAGE_SIZES.cardMaxEdge;
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 5 })
    .toBuffer();
  return { buffer, contentType: "image/webp", extension: "webp" };
}

/** Avatar: square center crop. */
export async function processHbdAvatar(input: Buffer): Promise<ProcessedImage> {
  const size = HBD_IMAGE_SIZES.avatarSize;
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: size, height: size, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  return { buffer, contentType: "image/webp", extension: "webp" };
}

/** Download copy: JPEG opens everywhere; transparent areas become white. */
export async function toHbdDownloadJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}
