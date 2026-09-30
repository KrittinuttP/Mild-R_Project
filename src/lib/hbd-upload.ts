/** Shared HBD upload constraints — file size only (no pixel lock) */
export const HBD_CARD_TEMPLATE = {
  path: "/assets/hbd/template/hbd-card-template.png",
  filename: "mild-r-hbd-card-template.png",
  /** Suggested art size for the downloadable template (not enforced on upload) */
  suggestedWidth: 1080,
  suggestedHeight: 1350,
  /** Max file the browser accepts from the picker (shrunk before upload). */
  maxSourceBytes: 20 * 1024 * 1024,
  /** Max file the API accepts (after in-browser shrink). */
  maxBytes: 5 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const HBD_AVATAR_DEFAULT = "/assets/hbd/default-avatar.png";

export const HBD_AVATAR_LIMITS = {
  maxSourceBytes: 10 * 1024 * 1024,
  maxBytes: 2 * 1024 * 1024,
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
