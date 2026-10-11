/**
 * Lucky-wheel entries — shared rules for every draw campaign.
 * Safe to import from Client Components (no secrets, no database access).
 */

/** Every campaign value lives here. Never type one of these strings elsewhere. */
export const LUCKY_DRAW_CAMPAIGNS = {
  cafeHunt: "cafe-hunt-2026",
  hbd: "hbd-2026",
} as const;

export type LuckyDrawCampaign =
  (typeof LUCKY_DRAW_CAMPAIGNS)[keyof typeof LUCKY_DRAW_CAMPAIGNS];

export type LuckyDrawChannel = "x" | "discord";

export const LUCKY_DRAW_LIMITS = {
  nameMax: 40,
  handleMin: 2,
  handleMax: 40,
} as const;

export type LuckyDrawContact = {
  contactName: string;
  contactChannel: LuckyDrawChannel;
  contactHandle: string;
};

export function isLuckyDrawChannel(value: unknown): value is LuckyDrawChannel {
  return value === "x" || value === "discord";
}

/**
 * "@Honey Bee " and "honeybee" must count as one account, so drop leading @
 * and every space. Letter case is kept for display; the database compares
 * handles in lower case.
 */
export function normalizeContactHandle(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/^@+/, "");
}

export type LuckyDrawContactResult =
  | { ok: true; value: LuckyDrawContact }
  | { ok: false; error: string };

/** Used by the form (before sending) and by the API (never trust the form). */
export function validateLuckyDrawContact(input: {
  contactName?: unknown;
  contactChannel?: unknown;
  contactHandle?: unknown;
}): LuckyDrawContactResult {
  const contactName =
    typeof input.contactName === "string" ? input.contactName.trim() : "";
  if (!contactName) return { ok: false, error: "กรุณากรอกชื่อผู้ติดต่อ" };
  if (contactName.length > LUCKY_DRAW_LIMITS.nameMax) {
    return {
      ok: false,
      error: `ชื่อผู้ติดต่อยาวได้ไม่เกิน ${LUCKY_DRAW_LIMITS.nameMax} ตัวอักษร`,
    };
  }

  if (!isLuckyDrawChannel(input.contactChannel)) {
    return { ok: false, error: "กรุณาเลือกช่องทางติดต่อ" };
  }

  const contactHandle =
    typeof input.contactHandle === "string"
      ? normalizeContactHandle(input.contactHandle)
      : "";
  if (contactHandle.length < LUCKY_DRAW_LIMITS.handleMin) {
    return { ok: false, error: "กรุณากรอกชื่อบัญชี" };
  }
  if (contactHandle.length > LUCKY_DRAW_LIMITS.handleMax) {
    return {
      ok: false,
      error: `ชื่อบัญชียาวได้ไม่เกิน ${LUCKY_DRAW_LIMITS.handleMax} ตัวอักษร`,
    };
  }

  return {
    ok: true,
    value: { contactName, contactChannel: input.contactChannel, contactHandle },
  };
}
