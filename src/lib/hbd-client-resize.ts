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

  const webp = await canvasToBlob(canvas, "image/webp", 0.9);
  if (webp && webp.type === "image/webp") {
    return new File([webp], renamed(file.name, "webp"), { type: "image/webp" });
  }

  // JPEG has no alpha: paint white behind the image before encoding.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.9);
  if (!jpeg) return file;
  return new File([jpeg], renamed(file.name, "jpg"), { type: "image/jpeg" });
}
