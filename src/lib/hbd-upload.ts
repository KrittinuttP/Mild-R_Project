/** Shared HBD upload constraints — file size only (no pixel lock) */
export const HBD_CARD_TEMPLATE = {
  path: "/assets/hbd/template/hbd-card-template.png",
  filename: "mild-r-hbd-card-template.png",
  /** Suggested art size for the downloadable template (not enforced on upload) */
  suggestedWidth: 1080,
  suggestedHeight: 1350,
  /** Max file the browser accepts from the picker (shrunk before upload). */
  maxSourceBytes: 20 * 1024 * 1024,
  /**
   * Max file the API accepts (after in-browser shrink). Card and avatar go to
   * /api/hbd/submit in one request, and Vercel refuses a request body over
   * 4.5 MB, so card + avatar stay at 4 MB together.
   */
  maxBytes: 3 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const HBD_AVATAR_DEFAULT = "/assets/hbd/default-avatar.png";

export const HBD_AVATAR_LIMITS = {
  maxSourceBytes: 10 * 1024 * 1024,
  /** Shares the 4.5 MB request with the card (see HBD_CARD_TEMPLATE.maxBytes). */
  maxBytes: 1 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

/** Stored image sizes (server re-encodes to WebP). */
export const HBD_IMAGE_SIZES = {
  cardMaxEdge: 2048,
  avatarSize: 512,
  /** Browser pre-shrink edge for avatars before the server crop. */
  avatarClientMaxEdge: 1024,
} as const;

export type HbdContactChannel = "x" | "discord";

export type HbdUploadDraft = {
  displayName: string;
  message: string;
  contactChannel: HbdContactChannel;
  contactHandle: string;
  cardFileName?: string;
  cardPreviewUrl?: string;
  avatarFileName?: string;
  avatarPreviewUrl?: string;
};

/** Text limits, shared by the form and /api/hbd/submit. Counted as visible characters (an emoji is 1). */
export const HBD_TEXT_LIMITS = { nameMax: 40, messageMax: 200 } as const;

type GraphemeSegmenter = { segment(input: string): Iterable<{ segment: string }> };
let graphemes: GraphemeSegmenter | null | undefined;
function graphemeSegmenter(): GraphemeSegmenter | null {
  if (graphemes !== undefined) return graphemes;
  const Ctor = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => GraphemeSegmenter })
    .Segmenter;
  graphemes = Ctor ? new Ctor("th", { granularity: "grapheme" }) : null;
  return graphemes;
}

/** Visible characters: an emoji or a Thai letter with its vowel/tone marks counts once. */
export function textLength(text: string): number {
  const seg = graphemeSegmenter();
  if (!seg) return Array.from(text).length;
  return Array.from(seg.segment(text)).length;
}

/** Cuts `text` to at most `max` visible characters. */
export function clampText(text: string, max: number): string {
  const seg = graphemeSegmenter();
  const parts = seg ? Array.from(seg.segment(text), (s) => s.segment) : Array.from(text);
  return parts.length <= max ? text : parts.slice(0, max).join("");
}
