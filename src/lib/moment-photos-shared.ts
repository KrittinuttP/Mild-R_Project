/** Moments photos uploaded at /admin/moments: limits shared by the admin form and the API. */

export const MOMENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type MomentPhotoType = (typeof MOMENT_PHOTO_TYPES)[number];

export const MOMENT_PHOTO_LIMITS = {
  /** Files per upload batch. */
  maxFiles: 20,
  /** Same as the bucket's file_size_limit (25 MB). */
  maxBytes: 25 * 1024 * 1024,
  altMax: 200,
  creditMax: 80,
} as const;

export const MOMENT_PHOTO_DEFAULT_CREDIT = "Mild-R";

export function isMomentPhotoType(type: string): type is MomentPhotoType {
  return (MOMENT_PHOTO_TYPES as readonly string[]).includes(type);
}

/** One photo row as the admin screen sees it. */
export type MomentPhotoAdmin = {
  id: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
  hidden: boolean;
  createdAt: string;
};
