/**
 * Moments gallery: hide X photos per post (migration 20261117120000_x_posts_gallery_hidden.sql).
 *
 *   npm run db:migrate:x-gallery-hidden            # checks, asks before writing
 *   npm run db:migrate:x-gallery-hidden -- --yes   # no question (for Cursor)
 *   npm run db:migrate:x-gallery-hidden -- --check # read only
 *
 * Checks the database first, applies the SQL file only when needed, then checks
 * again (column + view column, row count unchanged). Safe to run again.
 * Prints PASS / FAIL and exits 0 / 1. Never prints values from .env.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import pg from "pg";

const SQL_FILE = "supabase/migrations/20261117120000_x_posts_gallery_hidden.sql";

/** Columns the view must still expose after it is recreated (the sync and the site read them). */
const VIEW_COLUMNS = [
  "tweet_id",
  "post_type",
  "media_urls",
  "posted_at",
  "original_url",
  "is_live_schedule",
  "schedule_image_url",
  "schedule_image_source_url",
  "raw",
];

type State = {
  tableExists: boolean;
  hasColumn: boolean;
  viewHasColumn: boolean;
  viewMissing: string[];
  rows: number;
  hidden: number;
};

async function readState(client: pg.Client): Promise<State> {
  const table = await client.query(
    `select 1 from information_schema.tables where table_schema = 'mild_r' and table_name = 'x_posts'`
  );
  if (!table.rowCount) {
    return { tableExists: false, hasColumn: false, viewHasColumn: false, viewMissing: [], rows: 0, hidden: 0 };
  }
  const column = await client.query(
    `select 1 from information_schema.columns
     where table_schema = 'mild_r' and table_name = 'x_posts' and column_name = 'gallery_hidden'`
  );
  const viewCols = await client.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'mild_r_x_posts'`
  );
  const names = new Set(viewCols.rows.map((row) => row.column_name));
  const rows = await client.query<{ n: string }>(`select count(*)::text as n from mild_r.x_posts`);
  const hidden = column.rowCount
    ? await client.query<{ n: string }>(`select count(*)::text as n from mild_r.x_posts where gallery_hidden`)
    : { rows: [{ n: "0" }] };
  return {
    tableExists: true,
    hasColumn: Boolean(column.rowCount),
    viewHasColumn: names.has("gallery_hidden"),
    viewMissing: VIEW_COLUMNS.filter((name) => !names.has(name)),
    rows: Number(rows.rows[0].n),
    hidden: Number(hidden.rows[0].n),
  };
}

function done(state: State) {
  return state.hasColumn && state.viewHasColumn && state.viewMissing.length === 0;
}

function report(label: string, state: State) {
  console.log(`\n[${label}]`);
  console.log(`  gallery_hidden column ..... ${state.hasColumn ? "yes" : "no"}`);
  console.log(`  view has gallery_hidden ... ${state.viewHasColumn ? "yes" : "no"}`);
  console.log(`  view columns missing ...... ${state.viewMissing.length ? state.viewMissing.join(", ") : "none"}`);
  console.log(`  rows ...................... ${state.rows} (hidden ${state.hidden})`);
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
    if (!before.tableExists) {
      console.error("FAIL · table mild_r.x_posts not found — wrong database?");
      process.exit(1);
    }
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
    if (!done(after) || after.rows !== before.rows) {
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
