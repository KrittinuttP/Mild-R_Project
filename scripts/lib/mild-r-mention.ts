/** Shared Mild-R mention detection for live backfills */

export const MILD_R_MENTION_RE = /mild[\s\-_.]*r|@mildr|mildrworldend/i;

export type MildRMentionSource = "title" | "description" | "tags";

export function textMentionsMildR(text: string | null | undefined) {
  return Boolean(text && MILD_R_MENTION_RE.test(text));
}

/** Where Mild-R was found on a YouTube video snippet (first match wins). */
export function videoMentionsMildR(snippet: {
  title?: string;
  description?: string;
  tags?: string[];
}): MildRMentionSource | null {
  if (textMentionsMildR(snippet.title)) return "title";
  if (textMentionsMildR(snippet.description)) return "description";
  if (snippet.tags?.some((tag) => textMentionsMildR(tag))) return "tags";
  return null;
}
