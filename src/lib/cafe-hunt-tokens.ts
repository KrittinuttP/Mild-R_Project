import { CAFE_HUNT_ITEM_COUNT } from "@/lib/cafe-hunt";

/**
 * Server-only: the secret codes printed inside the QR links.
 * Reads CAFE_HUNT_TOKENS (comma-separated, in evidence order 1..n).
 * Never import this from a Client Component and never send the list
 * to the browser — knowing all codes means skipping the hunt.
 */

const MIN_TOKEN_LENGTH = 16;

/** null when the env value is missing or wrong, so the hunt stays closed. */
export function cafeHuntTokens(): string[] | null {
  const tokens = (process.env.CAFE_HUNT_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length !== CAFE_HUNT_ITEM_COUNT) return null;
  if (new Set(tokens).size !== tokens.length) return null;
  if (tokens.some((token) => token.length < MIN_TOKEN_LENGTH)) return null;
  return tokens;
}

/** 0-based position of the evidence this code belongs to, or -1. */
export function cafeHuntItemIndexForToken(token: string): number {
  const tokens = cafeHuntTokens();
  if (!tokens) return -1;
  return tokens.indexOf(token);
}

/** True only when the visitor holds every code exactly once. */
export function verifyCafeHuntProof(candidate: unknown): boolean {
  const tokens = cafeHuntTokens();
  if (!tokens) return false;
  if (!Array.isArray(candidate) || candidate.length !== tokens.length) {
    return false;
  }
  if (!candidate.every((value) => typeof value === "string")) return false;

  const held = new Set(candidate as string[]);
  return held.size === tokens.length && tokens.every((token) => held.has(token));
}
