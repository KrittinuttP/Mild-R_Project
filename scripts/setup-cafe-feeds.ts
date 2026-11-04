/**
 * Cafe page feeds: Notice Board (X @Mild_Honeycomb) + Case Tapes (YouTube).
 * Applies supabase/migrations/20261104150000_cafe_feeds.sql and schedules the
 * nightly pull (00:00 Asia/Bangkok = 17:00 UTC) of the edge function
 * `cafe-feed-sync`. Deploy the function first:
 *   npx supabase functions deploy cafe-feed-sync --project-ref azcqeejwihifpnwdxkbe
 *
 *   npm run db:setup:cafe-feeds            # checks, asks before writing
 *   npm run db:setup:cafe-feeds -- --yes   # no question (for Cursor)
 *   npm run db:setup:cafe-feeds -- --check # read only
 *
 * Checks first, writes only what is missing, checks again. Safe to run again.
 * Prints PASS / FAIL and exits 0 / 1. Never prints values from .env.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import pg from "pg";

const SQL_FILE = "supabase/migrations/20261104150000_cafe_feeds.sql";
const JOB = "run-cafe-feeds";
const SCHEDULE = "0 17 * * *";
const FUNCTION_NAME = "cafe-feed-sync";

type State = {
  baseTable: boolean;
  tables: Record<string, boolean>;
  views: Record<string, boolean>;
  stateRows: number;
  sectionRows: string[];
  cron: { exists: boolean; schedule: string | null; active: boolean | null };
  existingPosts: number;
  existingTapes: number;
};

async function exists(client: pg.Client, schema: string, name: string) {
  const res = await client.query(
    `select 1 from information_schema.tables where table_schema = $1 and table_name = $2`,
    [schema, name]
  );
  return Boolean(res.rowCount);
}

async function count(client: pg.Client, sql: string) {
  const res = await client.query<{ n: string }>(sql);
  return Number(res.rows[0]?.n ?? 0);
}

async function readState(client: pg.Client): Promise<State> {
  const baseTable = await exists(client, "mild_r", "cafe_section_visibility");
  const tables: Record<string, boolean> = {};
  for (const name of ["cafe_x_posts", "cafe_tapes", "cafe_feed_state"]) {
    tables[name] = await exists(client, "mild_r", name);
  }
  const views: Record<string, boolean> = {};
  for (const name of ["mild_r_cafe_x_posts", "mild_r_cafe_tapes", "mild_r_cafe_feed_state"]) {
    views[name] = await exists(client, "public", name);
  }
  const stateRows = tables.cafe_feed_state
    ? await count(client, `select count(*)::text as n from mild_r.cafe_feed_state where feed in ('x','youtube')`)
    : 0;
  const sections = baseTable
    ? await client.query<{ section_key: string }>(
        `select section_key from mild_r.cafe_section_visibility where section_key in ('notices','tapes')`
      )
    : { rows: [] as { section_key: string }[] };
  let cron: State["cron"] = { exists: false, schedule: null, active: null };
  try {
    const job = await client.query<{ schedule: string; active: boolean }>(
      `select schedule, active from cron.job where jobname = $1`,
      [JOB]
    );
    if (job.rowCount) cron = { exists: true, schedule: job.rows[0].schedule, active: job.rows[0].active };
  } catch {
    /* pg_cron not installed yet: the SQL below creates it */
  }
  return {
    baseTable,
    tables,
    views,
    stateRows,
    sectionRows: sections.rows.map((row) => row.section_key).sort(),
    cron,
    existingPosts: tables.cafe_x_posts ? await count(client, `select count(*)::text as n from mild_r.cafe_x_posts`) : 0,
    existingTapes: tables.cafe_tapes ? await count(client, `select count(*)::text as n from mild_r.cafe_tapes`) : 0,
  };
}

function dbDone(state: State) {
  return (
    Object.values(state.tables).every(Boolean) &&
    Object.values(state.views).every(Boolean) &&
    state.stateRows === 2 &&
    state.sectionRows.length === 2
  );
}

function cronDone(state: State) {
  return state.cron.exists && state.cron.schedule === SCHEDULE && state.cron.active === true;
}

async function functionReachable(supabaseUrl: string, serviceRole: string) {
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/${FUNCTION_NAME}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRole}` },
      body: JSON.stringify({ action: "ping" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function yes(value: boolean) {
  return value ? "yes" : "no";
}

function report(label: string, state: State, fn: boolean) {
  console.log(`\n[${label}]`);
  for (const [name, ok] of Object.entries(state.tables)) console.log(`  table mild_r.${name} ${".".repeat(Math.max(2, 22 - name.length))} ${yes(ok)}`);
  for (const [name, ok] of Object.entries(state.views)) console.log(`  view public.${name} ${".".repeat(Math.max(2, 23 - name.length))} ${yes(ok)}`);
  console.log(`  feed state rows (x, youtube) ........... ${state.stateRows}/2`);
  console.log(`  section rows (notices, tapes) .......... ${state.sectionRows.length}/2`);
  console.log(`  cron ${JOB} ....................... ${state.cron.exists ? `${state.cron.schedule} active=${state.cron.active}` : "no"}`);
  console.log(`  edge function ${FUNCTION_NAME} reachable ... ${yes(fn)}`);
  console.log(`  stored posts / tapes ................... ${state.existingPosts} / ${state.existingTapes}`);
}

function cronSql(fnUrl: string, authHeader: string) {
  const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;
  return `
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
do $$ begin perform cron.unschedule(${lit(JOB)}); exception when others then null; end $$;
select cron.schedule(
  ${lit(JOB)},
  ${lit(SCHEDULE)},
  $cron$
  select net.http_post(
    url := ${lit(fnUrl)},
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', ${lit(authHeader)}),
    body := '{"action":"sync","source":"cron"}'::jsonb
  ) as request_id;
  $cron$
);`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!databaseUrl || !supabaseUrl || !serviceRole) {
    console.error("FAIL · DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing (.env)");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const before = await readState(client);
    const fnBefore = await functionReachable(supabaseUrl, serviceRole);
    if (!before.baseTable) {
      console.error("FAIL · table mild_r.cafe_section_visibility not found — wrong database?");
      process.exit(1);
    }
    report("before", before, fnBefore);

    if (dbDone(before) && cronDone(before) && fnBefore) {
      console.log("\nPASS · already set up, nothing to do");
      return;
    }
    if (args.has("--check")) {
      console.log("\nFAIL · not set up yet (read-only check)");
      process.exit(1);
    }
    // Guard: the cron would call a function that is not there.
    if (!fnBefore) {
      console.error(
        `\nFAIL · edge function ${FUNCTION_NAME} is not reachable — deploy it first:\n  npx supabase functions deploy ${FUNCTION_NAME} --project-ref azcqeejwihifpnwdxkbe\nNothing changed.`
      );
      process.exit(1);
    }

    const steps = [
      dbDone(before) ? null : `apply ${SQL_FILE}`,
      cronDone(before) ? null : `schedule cron ${JOB} @ ${SCHEDULE} (00:00 Asia/Bangkok)`,
    ].filter(Boolean);
    if (!args.has("--yes")) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`\n${steps.join(" + ")}? (y/N) `);
      rl.close();
      if (answer.trim().toLowerCase() !== "y") {
        console.log("Stopped, nothing changed.");
        process.exit(1);
      }
    }

    if (!dbDone(before)) await client.query(fs.readFileSync(path.resolve(SQL_FILE), "utf8"));
    if (!cronDone(before)) {
      const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${FUNCTION_NAME}`;
      await client.query(cronSql(fnUrl, `Bearer ${serviceRole}`));
    }

    const after = await readState(client);
    report("after", after, fnBefore);
    if (!dbDone(after) || !cronDone(after) || after.existingPosts < before.existingPosts || after.existingTapes < before.existingTapes) {
      console.error("\nFAIL · ran but the check does not match (see above)");
      process.exit(1);
    }
    console.log('\nPASS · set up · first pull: press "ดึงตอนนี้" in /cafe/settings or wait for 00:00');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("FAIL ·", error instanceof Error ? error.message : error);
  process.exit(1);
});
