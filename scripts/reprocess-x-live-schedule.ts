/**
 * Flag existing X posts as Live Schedule and cache their images into Storage.
 * Does not call twitterapi.io — only reads mild_r_x_posts.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reprocess-x-live-schedule.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  firstImageUrl,
  isLiveScheduleText,
} from "../src/lib/x-live-schedule";
import { ensureXLiveScheduleRow } from "../src/lib/x-live-schedules";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const MEDIA_BUCKET = "x-media";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Row = {
  tweet_id: string;
  text: string | null;
  media_urls: string[] | null;
  posted_at: string | null;
  is_live_schedule: boolean;
  schedule_image_url: string | null;
  schedule_image_source_url: string | null;
};

async function cacheImage(row: Row, sourceUrl: string): Promise<string | null> {
  if (
    row.schedule_image_url &&
    row.schedule_image_source_url === sourceUrl
  ) {
    return row.schedule_image_url;
  }

  const imgRes = await fetch(sourceUrl, {
    headers: { Accept: "image/*" },
  });
  if (!imgRes.ok) {
    throw new Error(`HTTP ${imgRes.status} fetching ${sourceUrl}`);
  }

  const contentType =
    imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  const path = `live-schedule/${row.tweet_id}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { error: updErr } = await supabase
    .from("mild_r_x_posts")
    .update({
      schedule_image_url: pub.publicUrl,
      schedule_image_source_url: sourceUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("tweet_id", row.tweet_id);

  if (updErr) throw updErr;
  row.schedule_image_url = pub.publicUrl;
  row.schedule_image_source_url = sourceUrl;
  return pub.publicUrl;
}

async function main() {
  console.log("Reprocess X posts → Live Schedule flag + image cache + schedules");

  const { data, error } = await supabase
    .from("mild_r_x_posts")
    .select(
      "tweet_id, text, media_urls, posted_at, is_live_schedule, schedule_image_url, schedule_image_source_url"
    )
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  let flagged = 0;
  let unflagged = 0;
  let cached = 0;
  let skippedCache = 0;
  let scheduleRows = 0;
  let errors = 0;

  for (const row of rows) {
    const shouldFlag = isLiveScheduleText(row.text);
    if (shouldFlag !== row.is_live_schedule) {
      const { error: flagErr } = await supabase
        .from("mild_r_x_posts")
        .update({
          is_live_schedule: shouldFlag,
          updated_at: new Date().toISOString(),
        })
        .eq("tweet_id", row.tweet_id);
      if (flagErr) {
        console.error(`  flag ${row.tweet_id}:`, flagErr.message);
        errors += 1;
        continue;
      }
      if (shouldFlag) flagged += 1;
      else unflagged += 1;
      row.is_live_schedule = shouldFlag;
    } else if (shouldFlag) {
      flagged += 1;
    }

    if (!shouldFlag) continue;

    const sourceUrl = firstImageUrl(row.media_urls);
    if (!sourceUrl) {
      console.warn(`  no image: ${row.tweet_id}`);
      skippedCache += 1;
      continue;
    }

    try {
      const beforeUrl = row.schedule_image_url;
      const imageUrl = await cacheImage(row, sourceUrl);
      if (imageUrl && imageUrl !== beforeUrl) {
        cached += 1;
        console.log(`  cached: ${row.tweet_id}`);
      } else {
        skippedCache += 1;
      }

      if (imageUrl) {
        const ensured = await ensureXLiveScheduleRow(supabase, {
          tweet_id: row.tweet_id,
          image_url: imageUrl,
          image_source_url: sourceUrl,
          posted_at: row.posted_at,
        });
        if (ensured === "inserted" || ensured === "updated") {
          scheduleRows += 1;
        }
      }
    } catch (err) {
      errors += 1;
      console.error(
        `  cache ${row.tweet_id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: rows.length,
        flagged,
        unflagged,
        cached,
        skippedCache,
        scheduleRows,
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
