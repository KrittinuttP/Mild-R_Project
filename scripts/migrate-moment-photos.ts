/**
 * Moments gallery: admin-uploaded photos (migration 20261117150000_moment_photos.sql).
 *
 *   npm run db:migrate:moment-photos            # checks, asks before writing
 *   npm run db:migrate:moment-photos -- --yes   # no question (for Cursor)
 *   npm run db:migrate:moment-photos -- --check # read only
 *
 * Checks the database first, applies the SQL file only when needed, then checks
 * again (table, view, bucket, policies). Safe to run again: the SQL only creates
 * what is missing and never touches existing rows or files.
 * Prints PASS / FAIL and exits 0 / 1. Never prints values from .env.
 * The SQL file runs as one query string, so Postgres applies it all or nothing.
 *
 * Undo (only while no photo has been uploaded; uploads cannot be recovered after):
 *   drop view public.mild_r_moment_photos_admin; drop view public.mild_r_moment_photos;
 *   drop table mild_r.moment_photos;
 *   drop policy "Public read moment-photos" on storage.objects;
 *   drop policy "Service role write moment-photos" on storage.objects;
 *   then delete the empty bucket `moment-photos` in the Supabase dashboard.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import pg from "pg";

const SQL_FILE = "supabase/migrations/20261117150000_moment_photos.sql";
const BUCKET = "moment-photos";
const POLICIES = ["Public read moment-photos", "Service role write moment-photos"];

type State = {
  table: boolean;
  view: boolean;
  adminView: boolean;
  bucket: boolean;
  bucketPublic: boolean;
  policiesMissing: string[];
  rows: number;
};

async function readState(client: pg.Client): Promise<State> {
  const table = await client.query(
    `select 1 from information_schema.tables where table_schema = 'mild_r' and table_name = 'moment_photos'`
  );
  const view = await client.query(
    `select 1 from information_schema.views where table_schema = 'public' and table_name = 'mild_r_moment_photos'`
  );
  const adminView = await client.query(
    `select 1 from information_schema.views where table_schema = 'public' and table_name = 'mild_r_moment_photos_admin'`
  );
  const bucket = await client.query<{ public: boolean }>(
    `select public from storage.buckets where id = $1`,
    [BUCKET]
  );
  const policies = await client.query<{ policyname: string }>(
    `select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = any($1)`,
    [POLICIES]
  );
  const have = new Set(policies.rows.map((row) => row.policyname));
  const rows = table.rowCount
    ? await client.query<{ n: string }>(`select count(*)::text as n from mild_r.moment_photos`)
    : { rows: [{ n: "0" }] };
  return {
    table: Boolean(table.rowCount),
    view: Boolean(view.rowCount),
    adminView: Boolean(adminView.rowCount),
    bucket: Boolean(bucket.rowCount),
    bucketPublic: bucket.rows[0]?.public === true,
    policiesMissing: POLICIES.filter((name) => !have.has(name)),
    rows: Number(rows.rows[0].n),
  };
}

function done(state: State) {
  return state.table && state.view && state.adminView && state.bucket && state.bucketPublic && state.policiesMissing.length === 0;
}

function report(label: string, state: State) {
  const yn = (value: boolean) => (value ? "yes" : "no");
  console.log(`\n[${label}]`);
  console.log(`  table mild_r.moment_photos ..... ${yn(state.table)}`);
  console.log(`  view public.mild_r_moment_photos ${yn(state.view)}`);
  console.log(`  view public.mild_r_moment_photos_admin ${yn(state.adminView)}`);
  console.log(`  bucket ${BUCKET} ............ ${yn(state.bucket)} (public ${yn(state.bucketPublic)})`);
  console.log(`  storage policies missing ....... ${state.policiesMissing.length ? state.policiesMissing.join(", ") : "none"}`);
  console.log(`  rows ........................... ${state.rows}`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("FAIL · DATABASE_URL is missing (.env)");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const before = await readState(client);
    report("before", before);

    if (done(before)) {
      console.log("\nPASS · already migrated, nothing to do");
      return;
    }
    if (args.has("--check")) {
      console.log("\nFAIL · not migrated yet (read-only check)");
      process.exit(1);
    }

    if (!args.has("--yes")) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`\nApply ${SQL_FILE}? (y/N) `);
      rl.close();
      if (answer.trim().toLowerCase() !== "y") {
        console.log("Stopped, nothing changed.");
        process.exit(1);
      }
    }

    await client.query(fs.readFileSync(path.resolve(SQL_FILE), "utf8"));
    const after = await readState(client);
    report("after", after);
    if (!done(after) || after.rows < before.rows) {
      console.error("\nFAIL · migration ran but the check does not match (see above)");
      process.exit(1);
    }
    console.log("\nPASS · migrated");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("FAIL ·", error instanceof Error ? error.message : error);
  process.exit(1);
});
