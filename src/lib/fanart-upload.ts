/** Fan art upload limits. The server re-encodes to WebP after the browser shrinks. */
export const FANART_LIMITS = {
  maxSourceBytes: 20 * 1024 * 1024,
  maxBytes: 5 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

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

export type FanartContactChannel = "x" | "discord";
