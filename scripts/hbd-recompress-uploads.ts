/**
 * Re-encode existing HBD uploads (cards + avatars) to WebP with the same
 * sizing as new uploads, then point the rows at the new files.
 *
 *   npx tsx --env-file=.env scripts/hbd-recompress-uploads.ts           # dry-run
 *   npx tsx --env-file=.env scripts/hbd-recompress-uploads.ts --apply
 */
import { createClient } from "@supabase/supabase-js";

import { processHbdAvatar, processHbdCard } from "../src/lib/hbd-image";

const APPLY = process.argv.includes("--apply");
const BUCKET = "hbd-uploads";
const TABLE = "mild_r_hbd_submissions";

type Row = {
  id: string;
  display_name: string;
  status: string;
  card_path: string;
  avatar_path: string | null;
};

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, display_name, status, card_path, avatar_path")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  let before = 0;
  let after = 0;

  for (const row of rows) {
    const jobs = [
      { kind: "card" as const, path: row.card_path, process: processHbdCard },
      ...(row.avatar_path
        ? [{ kind: "avatar" as const, path: row.avatar_path, process: processHbdAvatar }]
        : []),
    ].filter((job) => !job.path.endsWith(".webp"));

    if (jobs.length === 0) {
      console.log(`skip  ${row.display_name} (${row.status}) — already WebP`);
      continue;
    }

    const update: Record<string, string> = {};
    const created: string[] = [];
    const replaced: string[] = [];

    for (const job of jobs) {
      const { data: blob, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(job.path);
      if (dlError || !blob) {
        console.warn(`warn  ${row.display_name}: cannot download ${job.path}`);
        continue;
      }
      const source = Buffer.from(await blob.arrayBuffer());
      const out = await job.process(source);
      const newPath = job.path.replace(/\.[^./]+$/, `.${out.extension}`);
      before += source.length;
      after += out.buffer.length;
      console.log(
        `${APPLY ? "write" : "plan "} ${row.display_name} ${job.kind}: ${job.path} ${kb(source.length)} → ${newPath} ${kb(out.buffer.length)}`
      );
      if (!APPLY) continue;

      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, out.buffer, {
          contentType: out.contentType,
          cacheControl: "31536000",
          upsert: true,
        });
      if (upError) throw new Error(`upload ${newPath}: ${upError.message}`);
      created.push(newPath);
      replaced.push(job.path);

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
      update[`${job.kind}_path`] = newPath;
      update[`${job.kind}_url`] = publicUrl;
    }

    if (!APPLY || created.length === 0) continue;

    const { error: rowError } = await supabase.from(TABLE).update(update).eq("id", row.id);
    if (rowError) {
      await supabase.storage.from(BUCKET).remove(created);
      throw new Error(`update row ${row.id}: ${rowError.message}`);
    }

    const { error: rmError } = await supabase.storage.from(BUCKET).remove(replaced);
    if (rmError) console.warn(`warn  could not remove old files: ${rmError.message}`);
  }

  console.log(
    `\n${APPLY ? "done" : "[dry-run]"} ${rows.length} rows · ${kb(before)} → ${kb(after)}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
