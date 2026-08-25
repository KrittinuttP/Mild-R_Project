/** Shared HBD upload constraints — file size only (no pixel lock) */
export const HBD_CARD_TEMPLATE = {
  path: "/assets/hbd/template/hbd-card-template.png",
  filename: "mild-r-hbd-card-template.png",
  /** Suggested art size for the downloadable template (not enforced on upload) */
  suggestedWidth: 1080,
  suggestedHeight: 1350,
  maxBytes: 5 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
} as const;

export const HBD_AVATAR_DEFAULT = "/assets/hbd/default-avatar.png";

export const HBD_AVATAR_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
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
