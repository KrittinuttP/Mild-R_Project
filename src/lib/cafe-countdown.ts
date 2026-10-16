/**
 * Countdown pages shown before the cafe opens:
 * `/cafe/countdown` (CD1) and `/cafe/countdown/teaser` (CD2).
 * Spec and to-do: doc/cafe-countdown.md
 *
 * Both times carry the +07:00 offset, so every visitor counts to the same
 * instant whatever their device timezone is.
 */
export const COUNTDOWN_TARGETS = {
  /** CD1 ends here and the first teaser (CD2) takes over. */
  teaser: "2026-10-23T18:12:00+07:00",
  /** CD2 ends here and the cafe opens with the real teaser. */
  open: "2026-10-30T18:12:00+07:00",
} as const;

/**
 * YouTube video id (the 11 characters after `v=`) of the first teaser.
 * Leave it empty until the teaser is uploaded: CD2 then shows "coming soon".
 */
export const FIRST_TEASER_YOUTUBE_ID = "";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Whole seconds left → days / hours / minutes / seconds. */
export function splitRemaining(totalSeconds: number): CountdownParts {
  const total = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function isYoutubeId(value: string): boolean {
  return /^[\w-]{11}$/.test(value);
}

/** Privacy-enhanced embed; only requested after the visitor presses play. */
export function youtubeEmbedSrc(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}
