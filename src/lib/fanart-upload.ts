/**
 * Fan art upload rules, shared by the browser and the API.
 *
 * Originals go straight from the browser to the private `fanart-originals`
 * bucket (signed upload URL), so print-size files never pass through a
 * Vercel function body (4.5 MB cap). The server keeps a 2048 px WebP copy
 * in `fanart-uploads` for the admin screen.
 */
export const FANART_LIMITS = {
  maxFiles: 5,
  /** Largest file a fan may pick. Bigger than `maxOriginalBytes` is re-encoded in the browser. */
  maxPickBytes: 40 * 1024 * 1024,
  /** Stored original. Must match the `fanart-originals` bucket file_size_limit. */
  maxOriginalBytes: 15 * 1024 * 1024,
  /** Long edge used when a same-size re-encode is still over `maxOriginalBytes`. */
  fallbackMaxEdge: 6000,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const FANART_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type FanartMimeType = (typeof FANART_MIME_TYPES)[number];

export function isFanartMimeType(value: string): value is FanartMimeType {
  return (FANART_MIME_TYPES as readonly string[]).includes(value);
}

export const FANART_AVATAR_LIMITS = {
  maxSourceBytes: 10 * 1024 * 1024,
  maxBytes: 2 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const FANART_IMAGE_SIZES = {
  artMaxEdge: 2048,
  avatarSize: 512,
  avatarClientMaxEdge: 1024,
} as const;

export const FANART_TEXT_LIMITS = {
  displayName: 40,
  handle: 15,
  creditUrl: 200,
} as const;

/** Bump `version` whenever `text` changes; it is stored with every submission. */
export const FANART_CONSENT = {
  version: "2026-10-21",
  text: "แฟนอาร์ตที่ส่งมาจะถูกนำไปใช้เพื่อตกแต่งคาเฟ่ และในโปรเจกต์วันเกิดของ Mild-R เท่านั้น",
  label:
    "ฉันเป็นเจ้าของผลงาน หรือได้รับอนุญาตจากเจ้าของผลงานแล้ว และยินยอมให้นำไปใช้ตามที่ระบุข้างต้น",
  hint: "ถ้าเป็นผลงานของคนอื่น เช่น งานที่จ้างวาด กรุณาขออนุญาตคนวาดก่อน และใส่เครดิตของคนวาดที่ “แก้เครดิต”",
} as const;

/** What the fan ticked, by consent version (shown in admin). */
export const FANART_CONSENT_SUMMARY: Record<string, string> = {
  "2026-10-20": "เป็นเจ้าของผลงาน",
  "2026-10-21": "เป็นเจ้าของผลงาน หรือได้รับอนุญาตจากเจ้าของแล้ว",
};

export type FanartContactChannel = "x" | "discord";

export function isContactChannel(value: string): value is FanartContactChannel {
  return value === "x" || value === "discord";
}

const HANDLE_RULES: Record<FanartContactChannel, { pattern: RegExp; message: string }> = {
  x: {
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    message: "ชื่อบัญชี X ใช้ได้เฉพาะ a–z, 0–9 และ _ ไม่เกิน 15 ตัว",
  },
  discord: {
    pattern: /^[A-Za-z0-9_.]{2,32}$/,
    message: "ชื่อผู้ใช้ Discord ใช้ได้เฉพาะ a–z, 0–9, _ และ . (2–32 ตัว)",
  },
};

/** Handle without the leading @, or the reason it is not valid. */
export function checkContactHandle(
  channel: FanartContactChannel,
  raw: string
): { handle: string } | { error: string } {
  const handle = raw.trim().replace(/^@+/, "");
  if (!handle) return { error: "กรุณากรอกชื่อช่องทางติดต่อ" };
  const rule = HANDLE_RULES[channel];
  return rule.pattern.test(handle) ? { handle } : { error: rule.message };
}

export type FanartCreditType = "x" | "url";
export type FanartCredit = { type: FanartCreditType; value: string };

/** Credit for one picture, normalized, or the reason it is not valid. */
export function checkCredit(type: string, raw: string): { credit: FanartCredit } | { error: string } {
  if (type === "x") {
    const handle = raw.trim().replace(/^@+/, "");
    return /^[A-Za-z0-9_]{1,15}$/.test(handle)
      ? { credit: { type: "x", value: handle } }
      : { error: "เครดิต: บัญชี X ใช้ได้เฉพาะ a–z, 0–9 และ _ ไม่เกิน 15 ตัว" };
  }
  if (type === "url") {
    const value = raw.trim();
    if (value.length > FANART_TEXT_LIMITS.creditUrl) return { error: "เครดิต: ลิงก์ยาวเกินไป" };
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || !url.hostname.includes(".")) throw new Error("bad");
      return { credit: { type: "url", value: url.toString() } };
    } catch {
      return { error: "เครดิต: ลิงก์ต้องขึ้นต้นด้วย https://" };
    }
  }
  return { error: "เครดิตไม่ถูกต้อง" };
}

/** Short text for a credit: "@name" or the link without https://. */
export function creditLabel(credit: FanartCredit): string {
  return credit.type === "x" ? `@${credit.value}` : credit.value.replace(/^https:\/\//, "").replace(/\/$/, "");
}

/** Where a credit points to. */
export function creditHref(credit: FanartCredit): string {
  return credit.type === "x" ? `https://x.com/${credit.value}` : credit.value;
}

/** Display name with control characters removed and spaces collapsed, or the reason it is not valid. */
export function checkDisplayName(raw: string): { name: string } | { error: string } {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!name) return { error: "กรุณากรอกชื่อที่แสดง" };
  if ([...name].length > FANART_TEXT_LIMITS.displayName) {
    return { error: `ชื่อที่แสดงยาวได้ไม่เกิน ${FANART_TEXT_LIMITS.displayName} ตัวอักษร` };
  }
  return { name };
}

export function formatMegabytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
