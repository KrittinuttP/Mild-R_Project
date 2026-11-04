/**
 * Fan art: credit name + Facebook contact (migration 20261104120000_fanart_credit_name.sql).
 *
 *   npm run db:migrate:fanart-credit-name            # checks, asks before writing
 *   npm run db:migrate:fanart-credit-name -- --yes   # no question (for Cursor)
 *   npm run db:migrate:fanart-credit-name -- --check # read only
 *
 * Checks the database first, stops if something unexpected is found, applies
 * the SQL file only when needed, then checks again. Safe to run again.
 * Prints PASS / FAIL and exits 0 / 1. Never prints values from .env.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import pg from "pg";

const SQL_FILE = "supabase/migrations/20261104120000_fanart_credit_name.sql";

type State = {
  tableExists: boolean;
  hasCreditName: boolean;
  checkAllowsFacebook: boolean;
  viewHasCreditName: boolean;
  rows: number;
  channels: Record<string, number>;
};

async function readState(client: pg.Client): Promise<State> {
  const table = await client.query(
    `select 1 from information_schema.tables where table_schema = 'mild_r' and table_name = 'fanart_submissions'`
  );
  if (!table.rowCount) {
    return { tableExists: false, hasCreditName: false, checkAllowsFacebook: false, viewHasCreditName: false, rows: 0, channels: {} };
  }
  const column = await client.query(
    `select 1 from information_schema.columns
     where table_schema = 'mild_r' and table_name = 'fanart_submissions' and column_name = 'credit_name'`
  );
  const checks = await client.query<{ def: string }>(
    `select pg_get_constraintdef(con.oid) as def
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'mild_r' and rel.relname = 'fanart_submissions' and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%contact_channel%'`
  );
  const viewColumn = await client.query(
    `select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'mild_r_fanart_submissions' and column_name = 'credit_name'`
  );
  const counts = await client.query<{ contact_channel: string; n: string }>(
    `select contact_channel, count(*)::text as n from mild_r.fanart_submissions group by contact_channel`
  );
  const channels = Object.fromEntries(counts.rows.map((row) => [row.contact_channel, Number(row.n)]));
  return {
    tableExists: true,
    hasCreditName: Boolean(column.rowCount),
    checkAllowsFacebook: checks.rows.length === 1 && checks.rows[0].def.includes("facebook"),
    viewHasCreditName: Boolean(viewColumn.rowCount),
    rows: Object.values(channels).reduce((sum, n) => sum + n, 0),
    channels,
  };
}

function done(state: State) {
  return state.hasCreditName && state.checkAllowsFacebook && state.viewHasCreditName;
}

function report(label: string, state: State) {
  console.log(`\n[${label}]`);
  console.log(`  credit_name column ........ ${state.hasCreditName ? "yes" : "no"}`);
  console.log(`  contact_channel allows facebook ${state.checkAllowsFacebook ? "yes" : "no"}`);
  console.log(`  view has credit_name ...... ${state.viewHasCreditName ? "yes" : "no"}`);
  console.log(`  rows ...................... ${state.rows} ${JSON.stringify(state.channels)}`);
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
      console.error("FAIL · table mild_r.fanart_submissions not found — wrong database?");
      process.exit(1);
    }
    report("before", before);

    // Guard: the new check only allows x / discord / facebook.
    const unexpected = Object.keys(before.channels).filter((channel) => !["x", "discord", "facebook"].includes(channel));
    if (unexpected.length) {
      console.error(`FAIL · unexpected contact_channel values: ${unexpected.join(", ")} — stopped, nothing changed`);
      process.exit(1);
    }

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
