/**
 * Countdown pages shown before the cafe opens:
 * `/cafe/countdown` (CD1) and `/cafe/countdown/teaser` (CD2).
 * Which one a visitor gets is decided in `cafe-gate.ts`.
 * Spec and to-do: doc/cafe-countdown.md
 *
 * Server-only data: import this from pages, layouts and `proxy.ts`, never
 * from a client component, so the dates stay out of the browser bundles.
 * Browser helpers live in `cafe-countdown-view.ts`.
 */

/**
 * Default switch times. The team can move them in /cafe/settings (stored in
 * `mild_r.cafe_gate`); these apply until then, or when the database cannot
 * be read. Both carry +07:00 so every visitor counts to the same instant.
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

export const COUNTDOWN_PATH = "/cafe/countdown";
export const TEASER_PATH = "/cafe/countdown/teaser";

/**
 * Request header from `proxy.ts` to the cafe layout: `full` when the visitor
 * may get the site chrome (splash, menu, footer), anything else for a bare
 * page. The chrome is client components fed the whole cafe data, so it must
 * stay out of the countdown pages and out of every page while the cafe is
 * locked. The proxy always overwrites it.
 */
export const CAFE_CHROME_HEADER = "x-cafe-chrome";

/** CD1, CD2 and anything below them. */
export function isCountdownPath(pathname: string) {
  const path = pathname.toLowerCase();
  return path === COUNTDOWN_PATH || path.startsWith(`${COUNTDOWN_PATH}/`);
}
