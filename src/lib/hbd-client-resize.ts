/**
 * Browser-only: shrink a picked photo before upload so phone photos stay small
 * and under the API size limit. The server re-encodes to WebP afterwards.
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}.${ext}`;
}

/**
 * Returns the original file when it is already within `maxEdge` and `maxBytes`
 * (keeps PNG transparency untouched); otherwise a resized WebP, or JPEG on
 * browsers that can't encode WebP.
 */
export async function shrinkImageFile(
  file: File,
  { maxEdge, maxBytes }: { maxEdge: number; maxBytes: number }
): Promise<File> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const { naturalWidth: w, naturalHeight: h } = img;
  const longest = Math.max(w, h);
  if (longest <= maxEdge && file.size <= maxBytes) return file;

  const scale = Math.min(1, maxEdge / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return (await encodeCanvas(canvas, ctx, file.name, 0.9)) ?? file;
}

/**
 * WebP, or JPEG on browsers that can't encode WebP. Null when the browser
 * could not encode at all.
 */
async function encodeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  name: string,
  quality: number
): Promise<File | null> {
  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") {
    return new File([webp], renamed(name, "webp"), { type: "image/webp" });
  }

  // JPEG has no alpha: paint white behind the image before encoding.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!jpeg) return null;
  return new File([jpeg], renamed(name, "jpg"), { type: "image/jpeg" });
}

/** Square region of the source image, in source pixels (from react-easy-crop). */
export type CropArea = { x: number; y: number; width: number; height: number };

/**
 * Cut the part chosen in the avatar cropper into a square image at most
 * `maxEdge` wide. Lowers the quality once if the result is over `maxBytes`.
 */
export async function cropAvatarFile(
  file: File,
  area: CropArea,
  { maxEdge, maxBytes }: { maxEdge: number; maxBytes: number }
): Promise<File> {
  const img = await loadImage(file);
  const size = Math.max(1, Math.min(maxEdge, Math.round(area.width)));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);

  for (const quality of [0.9, 0.75]) {
    const out = await encodeCanvas(canvas, ctx, file.name, quality);
    if (!out) break;
    if (out.size <= maxBytes || quality === 0.75) return out;
  }
  throw new Error("encode failed");
}
