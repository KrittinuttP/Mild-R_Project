/**
 * Helpers the countdown components run in the browser.
 * Keep dates out of this file: they belong in `cafe-countdown.ts`.
 */

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
