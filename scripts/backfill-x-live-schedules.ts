/**
 * Backfill mild_r.x_live_schedules from existing Live Schedule X posts.
 * Does not call twitterapi.io.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-x-live-schedules.ts
 */
import { createClient } from "@supabase/supabase-js";

import { firstImageUrl } from "../src/lib/x-live-schedule";
import { ensureXLiveScheduleRow } from "../src/lib/x-live-schedules";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Backfill x_live_schedules from mild_r_x_posts…");

  const { data, error } = await supabase
    .from("mild_r_x_posts")
    .select(
      "tweet_id, posted_at, media_urls, schedule_image_url, schedule_image_source_url"
    )
    .eq("is_live_schedule", true)
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  const rows = data ?? [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const imageUrl =
      (typeof row.schedule_image_url === "string" && row.schedule_image_url) ||
      firstImageUrl(row.media_urls as string[] | null) ||
      null;
    const sourceUrl =
      (typeof row.schedule_image_source_url === "string" &&
        row.schedule_image_source_url) ||
      firstImageUrl(row.media_urls as string[] | null) ||
      null;

    const result = await ensureXLiveScheduleRow(supabase, {
      tweet_id: row.tweet_id as string,
      image_url: imageUrl,
      image_source_url: sourceUrl,
      posted_at: (row.posted_at as string | null) ?? null,
    });

    if (result === "inserted") inserted += 1;
    else if (result === "updated") updated += 1;
    else if (result === "skipped") skipped += 1;
    else errors += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: rows.length,
        inserted,
        updated,
        skipped,
        errors,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
