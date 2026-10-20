/**
 * Browser-only: gets a picked fan art file ready to upload as the print
 * original. Files within the size limit go up untouched. Bigger files are
 * re-encoded as high-quality JPEG at full size first, and made smaller only
 * when that is still over the limit. Fans are not told about this.
 */
import { FANART_LIMITS, isFanartMimeType, type FanartMimeType } from "@/lib/fanart-upload";

export class FanartPrepareError extends Error {}

const EXTENSION_TYPES: Record<string, FanartMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Some browsers leave `type` empty; fall back to the file extension. */
function fileType(file: File): FanartMimeType | null {
  if (isFanartMimeType(file.type)) return file.type;
  if (file.type) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new FanartPrepareError("อ่านไฟล์รูปนี้ไม่ได้"));
    };
    img.src = url;
  });
}

function jpegName(name: string) {
  return `${name.replace(/\.[^.]+$/, "") || "fanart"}.jpg`;
}

/** JPEG at most `maxEdge` long, or null when the browser cannot draw it that big. */
async function encodeJpeg(
  img: HTMLImageElement,
  name: string,
  maxEdge: number,
  quality: number
): Promise<File | null> {
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG has no transparency: print on white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  // Release the canvas memory right away (matters on phones).
  canvas.width = 0;
  canvas.height = 0;
  if (!blob || blob.type !== "image/jpeg") return null;
  return new File([blob], jpegName(name), { type: "image/jpeg" });
}

/** Tried in order until one fits. 4096 keeps within older iPhone canvas limits. */
const ATTEMPTS: { maxEdge: number; quality: number }[] = [
  { maxEdge: Number.POSITIVE_INFINITY, quality: 0.95 },
  { maxEdge: FANART_LIMITS.fallbackMaxEdge, quality: 0.95 },
  { maxEdge: FANART_LIMITS.fallbackMaxEdge, quality: 0.9 },
  { maxEdge: 4096, quality: 0.92 },
];

/** Quick check before a picked file gets a tile: the reason it cannot be used, or null. */
export function precheckFanartFile(file: File): string | null {
  if (!fileType(file)) return "รองรับเฉพาะ JPEG, PNG หรือ WebP";
  if (file.size === 0) return "ไฟล์ว่างเปล่า";
  if (file.size > FANART_LIMITS.maxPickBytes) return "ไฟล์ใหญ่เกิน 40 MB";
  return null;
}

export async function prepareFanartFile(file: File): Promise<File> {
  const problem = precheckFanartFile(file);
  if (problem) throw new FanartPrepareError(problem);
  const type = fileType(file) as FanartMimeType;

  // Also proves the browser can open it, so the preview will show.
  const img = await loadImage(file);

  if (file.size <= FANART_LIMITS.maxOriginalBytes) {
    return file.type === type ? file : new File([file], file.name, { type });
  }

  for (const attempt of ATTEMPTS) {
    const out = await encodeJpeg(img, file.name, attempt.maxEdge, attempt.quality);
    if (out && out.size <= FANART_LIMITS.maxOriginalBytes) return out;
  }
  throw new FanartPrepareError("ไฟล์ใหญ่เกินไป ลองลดขนาดแล้วเลือกใหม่");
}

export type UploadProgress = (loaded: number, total: number) => void;

export class FanartUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * PUT to a Supabase signed upload URL, like storage-js uploadToSignedUrl but
 * with upload progress. A 409 means an earlier try already stored the file.
 */
export function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: UploadProgress,
  apiKey: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    if (apiKey) {
      xhr.setRequestHeader("apikey", apiKey);
      // Legacy anon keys are JWTs and go in Authorization too, as supabase-js does.
      if (apiKey.startsWith("eyJ")) xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      if ((xhr.status >= 200 && xhr.status < 300) || isAlreadyStored(xhr)) {
        onProgress(file.size, file.size);
        resolve();
      } else {
        reject(new FanartUploadError("upload failed", xhr.status));
      }
    };
    xhr.onerror = () => reject(new FanartUploadError("network", 0));
    xhr.ontimeout = () => reject(new FanartUploadError("timeout", 0));
    xhr.send(body);
  });
}

function isAlreadyStored(xhr: XMLHttpRequest) {
  if (xhr.status === 409) return true;
  // Storage sometimes reports a duplicate as 400 with statusCode "409".
  try {
    const data = JSON.parse(xhr.responseText) as { statusCode?: string; error?: string };
    return data.statusCode === "409" || data.error === "Duplicate";
  } catch {
    return false;
  }
}
