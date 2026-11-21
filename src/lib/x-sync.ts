/** Manual run of the X feed sync (server only, uses the service role key). */
/** What the Moments / Socials admin shows after "ดึงตอนนี้". */
export type XSyncResult = {
  /** Posts written (new + re-read). */
  upserted: number;
  /** Posts that were not stored before. */
  newCount: number;
  /** "search" (cheap) or "timeline" (fallback). */
  mode: string | null;
  /** twitterapi.io credits this run billed (estimate from the function). */
  creditsUsed: number | null;
};

type SyncBody = Partial<{
  upserted: number;
  newCount: number;
  mode: string;
  creditsUsed: number;
  error: string;
}>;

/**
 * Runs the `x-feed-sync` Edge Function once ("ดึงตอนนี้"), same incremental run the hourly
 * cron does. Billed per returned post by twitterapi.io, so callers must rate-limit.
 */
export async function runXFeedSync(): Promise<XSyncResult> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base || !key) throw new Error("Supabase is not configured");

  const res = await fetch(`${base.replace(/\/$/, "")}/functions/v1/x-feed-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ action: "incremental" }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as SyncBody;

  if (res.status === 404) throw new Error("ยังไม่ได้ deploy ฟังก์ชัน x-feed-sync");
  if (!res.ok) throw new Error(body.error ?? `x-feed-sync HTTP ${res.status}`);

  return {
    upserted: Number(body.upserted ?? 0),
    newCount: Number(body.newCount ?? 0),
    mode: typeof body.mode === "string" ? body.mode : null,
    creditsUsed: typeof body.creditsUsed === "number" ? body.creditsUsed : null,
  };
}
