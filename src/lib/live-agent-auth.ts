import { timingSafeEqual } from "node:crypto";

/** Server-to-server header for the live schedule agent / cron. */
export const LIVE_AGENT_SECRET_HEADER = "x-live-agent-secret";

/**
 * Secret for `/api/live/agent/run` (cron) and the agent's calls to
 * `/api/live/manual`. Server-only — never send to the browser.
 * Falls back to the service-role key only so existing pg_cron jobs keep
 * working until LIVE_AGENT_CRON_SECRET is set and the cron is re-created.
 */
export function liveAgentSecret(): string | null {
  return (
    process.env.LIVE_AGENT_CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** `Authorization: Bearer <secret>` or `x-live-agent-secret: <secret>`. */
export function hasLiveAgentSecret(request: Request): boolean {
  const secret = liveAgentSecret();
  if (!secret) return false;

  const bearer = (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const header = request.headers.get(LIVE_AGENT_SECRET_HEADER)?.trim() ?? "";
  return (
    (bearer !== "" && safeEqual(bearer, secret)) ||
    (header !== "" && safeEqual(header, secret))
  );
}
