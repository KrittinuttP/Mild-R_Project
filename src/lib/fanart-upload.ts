/**
 * Fan art upload rules, shared by the browser and the API.
 *
 * Originals go straight from the browser to the private `fanart-originals`
 * bucket (signed upload URL), so print-size files never pass through a
 * Vercel function body (4.5 MB cap). The server keeps a 2048 px WebP copy
 * in `fanart-uploads` for the admin screen.
 */
/** Sample profile picture: shown while a fan has not picked one (same file as the HBD card). */
export const FANART_AVATAR_DEFAULT = "/assets/hbd/default-avatar.png";

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
  /** Gallery tile; the lightbox uses the 2048 px copy. */
  thumbMaxEdge: 720,
  avatarSize: 512,
  avatarClientMaxEdge: 1024,
} as const;

export const FANART_TEXT_LIMITS = {
  displayName: 40,
  handle: 15,
  creditUrl: 200,
  /** Facebook profile link used as a contact. */
  contactUrl: 200,
} as const;

/** Bump `version` whenever `text` changes; it is stored with every submission. */
export const FANART_CONSENT = {
  version: "2026-11-05",
  // `|` = where Thai may wrap (render with <ThaiPhrases>, strip elsewhere).
  text: "แฟนอาร์ต|ที่ส่งมา|จะถูกนำไปใช้|เพื่อตกแต่งคาเฟ่ และ|ในโปรเจกต์|วันเกิด|ของ Mild-R เท่านั้น",
  /** Own line under `text` (11/5): the label's "ข้างต้น" covers it, so it is not repeated in the label. */
  rule: "ไม่รับ|ภาพที่สร้างด้วย AI",
  label:
    "ฉันเป็น|เจ้าของผลงาน หรือ|ได้รับอนุญาต|จากเจ้าของผลงาน|แล้ว และ|ยินยอม|ให้นำไปใช้|ตามที่ระบุ|ข้างต้น",
  hint: "ถ้าเป็นผลงาน|ของคนอื่น เช่น งาน|ที่จ้างวาด กรุณา|ขออนุญาต|คนวาดก่อน และ|ใส่เครดิต|ของคนวาด|ที่ “แก้เครดิต”",
} as const;

/** What the fan ticked, by consent version (shown in admin). */
export const FANART_CONSENT_SUMMARY: Record<string, string> = {
  "2026-10-20": "เป็นเจ้าของผลงาน",
  "2026-10-21": "เป็นเจ้าของผลงาน หรือได้รับอนุญาตจากเจ้าของแล้ว",
  "2026-11-05": "เป็นเจ้าของผลงาน หรือได้รับอนุญาตจากเจ้าของแล้ว · ยอมรับกติกาไม่รับภาพ AI",
};

export type FanartContactChannel = "x" | "discord" | "facebook";

/** Contact channels on the form, in dropdown order (X is the default). */
export const FANART_CONTACT_CHANNELS: ReadonlyArray<{ value: FanartContactChannel; label: string }> = [
  { value: "x", label: "X" },
  { value: "discord", label: "Discord" },
  { value: "facebook", label: "Facebook" },
];

export function isContactChannel(value: string): value is FanartContactChannel {
  return value === "x" || value === "discord" || value === "facebook";
}

const HANDLE_RULES: Record<"x" | "discord", { pattern: RegExp; message: string }> = {
  x: {
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    message: "ชื่อบัญชี X ใช้ได้เฉพาะ a–z, 0–9 และ _ ไม่เกิน 15 ตัว",
  },
  discord: {
    pattern: /^[A-Za-z0-9_.]{2,32}$/,
    message: "ชื่อผู้ใช้ Discord ใช้ได้เฉพาะ a–z, 0–9, _ และ . (2–32 ตัว)",
  },
};

const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com"]);
const FACEBOOK_MESSAGE = "Facebook ใส่เป็นลิงก์หน้าโปรไฟล์ เช่น https://facebook.com/…";

/** Facebook profile link as https://facebook.com/…, or null when it is not one. */
function normalizeFacebookUrl(raw: string): string | null {
  const text = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (text.length > FANART_TEXT_LIMITS.contactUrl) return null;
  try {
    const url = new URL(text);
    if (!FACEBOOK_HOSTS.has(url.hostname.toLowerCase())) return null;
    if (url.pathname.replace(/\/+$/, "") === "" && !url.searchParams.get("id")) return null;
    url.protocol = "https:";
    url.hostname = "facebook.com";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Contact for the team (never shown publicly): X / Discord name without the
 * leading @, or a Facebook profile link — or the reason it is not valid.
 */
export function checkContactHandle(
  channel: FanartContactChannel,
  raw: string
): { handle: string } | { error: string } {
  if (channel === "facebook") {
    const text = raw.trim();
    if (!text) return { error: "กรุณากรอกลิงก์ Facebook" };
    const url = normalizeFacebookUrl(text);
    return url ? { handle: url } : { error: FACEBOOK_MESSAGE };
  }
  const handle = raw.trim().replace(/^@+/, "");
  if (!handle) return { error: channel === "x" ? "กรุณากรอกชื่อบัญชี X" : "กรุณากรอกชื่อผู้ใช้ Discord" };
  const rule = HANDLE_RULES[channel];
  return rule.pattern.test(handle) ? { handle } : { error: rule.message };
}

/** "X · @name", "Discord · name" or "Facebook · facebook.com/…" for the review screen and admin. */
export function contactLabel(channel: FanartContactChannel, handle: string): string {
  if (channel === "x") return `X · @${handle}`;
  if (channel === "discord") return `Discord · ${handle}`;
  return `Facebook · ${handle.replace(/^https:\/\//, "")}`;
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

/**
 * Credit shown with a picture: always a name, plus an optional X account or
 * web link shown as a small line under it.
 */
export type FanartPictureCredit = { name: string; link: FanartCredit | null };

/** Name in a credit (the sender's display name, or the artist's name). */
export function checkCreditName(raw: string, emptyMessage = "กรุณากรอกชื่อคนวาด"): { name: string } | { error: string } {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!name) return { error: emptyMessage };
  if ([...name].length > FANART_TEXT_LIMITS.displayName) {
    return { error: `ชื่อยาวได้ไม่เกิน ${FANART_TEXT_LIMITS.displayName} ตัวอักษร` };
  }
  return { name };
}

/** Optional @X / link part of a credit: empty → null. */
export function checkCreditLink(type: string, raw: string): { link: FanartCredit | null } | { error: string } {
  if (!raw.trim().replace(/^@+/, "")) return { link: null };
  const checked = checkCredit(type, raw);
  return "error" in checked ? checked : { link: checked.credit };
}

export function sameCredit(a: FanartPictureCredit | null, b: FanartPictureCredit | null): boolean {
  if (!a || !b) return a === b;
  if (a.name !== b.name) return false;
  if (!a.link || !b.link) return a.link === b.link;
  return a.link.type === b.link.type && a.link.value.toLowerCase() === b.link.value.toLowerCase();
}

/**
 * Credit of a saved picture. Rows sent before 2026-11-04 have no credit name:
 * their credit was the sender's X account (name = display name) or an
 * artist's account / link (name = that account or link).
 */
export function creditOfRow(row: {
  display_name: string;
  contact_channel: FanartContactChannel;
  contact_handle: string;
  credit_name: string | null;
  credit_type: FanartCreditType | null;
  credit_value: string | null;
}): FanartPictureCredit {
  const link: FanartCredit | null =
    row.credit_type && row.credit_value ? { type: row.credit_type, value: row.credit_value } : null;
  if (row.credit_name) return { name: row.credit_name, link };
  const legacy = link ?? (row.contact_channel === "x" ? { type: "x" as const, value: row.contact_handle } : null);
  const own =
    !legacy ||
    (legacy.type === "x" && row.contact_channel === "x" && legacy.value.toLowerCase() === row.contact_handle.toLowerCase());
  return { name: own ? row.display_name : creditLabel(legacy), link: legacy };
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
