import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  creditLabel,
  type FanartContactChannel,
  type FanartCredit,
  type FanartPictureCredit,
} from "@/lib/fanart-upload";

/**
 * Server-only. What /api/fanart/upload-url checked, signed so each
 * /api/fanart/submit call can trust it without a pending-batch table.
 */
export type FanartTicket = {
  /** 1 = credits were an X handle / link only (before 2026-11-04); 2 = name + optional link. */
  v: 1 | 2;
  batchId: string;
  displayName: string;
  channel: FanartContactChannel;
  handle: string;
  /** Optional backup contact (Discord username); missing on older tickets. */
  discord?: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  /** Object paths in the fanart-originals bucket, in the fan's order. */
  paths: string[];
  /** Credit per picture, same order as `paths` (`FanartCredit` on v1 tickets). */
  credits: FanartPictureCredit[] | FanartCredit[];
  consentAt: string;
  consentVersion: string;
  /** Unix ms. */
  exp: number;
};

/** A little longer than a signed upload URL (2 h), so a late retry still finds its ticket. */
export const FANART_TICKET_TTL_MS = 3 * 60 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createHash("sha256").update(`mild-r:fanart-ticket:${secret}`).digest();
}

function mac(body: string): Buffer {
  return createHmac("sha256", key()).update(body).digest();
}

export function signFanartTicket(ticket: FanartTicket): string {
  const body = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${body}.${mac(body).toString("base64url")}`;
}

export type TicketCheck =
  | { ok: true; ticket: FanartTicket }
  | { ok: false; reason: "invalid" | "expired" };

export function verifyFanartTicket(raw: unknown): TicketCheck {
  if (typeof raw !== "string" || raw.length > 8000) return { ok: false, reason: "invalid" };
  const [body, sig] = raw.split(".");
  if (!body || !sig) return { ok: false, reason: "invalid" };

  const given = Buffer.from(sig, "base64url");
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "invalid" };
  }

  let ticket: FanartTicket;
  try {
    ticket = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as FanartTicket;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if ((ticket.v !== 1 && ticket.v !== 2) || !Array.isArray(ticket.paths) || !Array.isArray(ticket.credits)) {
    return { ok: false, reason: "invalid" };
  }
  if (Date.now() > ticket.exp) return { ok: false, reason: "expired" };
  return { ok: true, ticket };
}

/** Credit of picture `index`; v1 tickets (signed before the update) are read the old way. */
export function ticketCredit(ticket: FanartTicket, index: number): FanartPictureCredit {
  if (ticket.v === 2) {
    const credit = (ticket.credits as FanartPictureCredit[])[index];
    return credit ?? { name: ticket.displayName, link: null };
  }
  const old = (ticket.credits as FanartCredit[])[index] ?? { type: "x" as const, value: ticket.handle };
  const own = old.type === "x" && old.value.toLowerCase() === ticket.handle.toLowerCase();
  return { name: own ? ticket.displayName : creditLabel(old), link: old };
}
