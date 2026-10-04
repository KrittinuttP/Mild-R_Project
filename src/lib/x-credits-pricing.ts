/** twitterapi.io pricing — shared by the credits dashboard (server) and simulator (client). */

export const TWITTERAPI_RECHARGE_URL = "https://twitterapi.io/dashboard";
export const TWITTERAPI_PRICING_URL = "https://twitterapi.io/pricing";
export const CREDITS_PER_USD = 100_000;
export const CREDITS_PER_TWEET = 15;
export const MIN_CREDITS_PER_CALL = 15;
export const TIMELINE_CREDITS_PER_PAGE = 300;

/**
 * Expected search-mode credits per run when new posts arrive at `postsPerRun` on average
 * (Poisson): each returned post costs 15, an empty run still costs the 15 minimum.
 */
export function expectedSearchRunCredits(postsPerRun: number): number {
  const lambda = Math.max(0, postsPerRun);
  return CREDITS_PER_TWEET * (lambda + Math.exp(-lambda));
}
