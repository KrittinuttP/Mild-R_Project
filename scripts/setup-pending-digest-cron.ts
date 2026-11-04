/**
 * Twice-daily Discord digest of fan art + HBD cards waiting for review.
 * pg_cron calls POST /api/admin/pending-digest at 09:00 and 21:00 Bangkok
 * (02:00 and 14:00 UTC). The route stays silent when nothing is pending.
 *
 *   npm run cron:pending-digest -- --check     show the current job, change nothing
 *   npm run cron:pending-digest                schedule (asks before writing)
 *   npm run cron:pending-digest -- --yes       schedule without asking (for Cursor)
 *   npm run cron:pending-digest -- --remove    remove the job (asks before writing)
 *
 * Needs in .env: DATABASE_URL · CRON_API_BASE (public admin URL, e.g.
 * https://admin.mildhoneycomb.com — the fan art / hbd domains block this API) ·
 * LIVE_AGENT_CRON_SECRET (same secret as the live agent cron).
 * Safe to run again: it replaces the job with the same name. Never prints secrets.
 */
import { createInterface } from "node:readline/promises";

import pg from "pg";

const JOB_NAME = "pending-digest";
const SCHEDULE = "0 2,14 * * *"; // UTC = 09:00 / 21:00 Asia/Bangkok
const ROUTE = "/api/admin/pending-digest";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const remove = args.has("--remove");
const assumeYes = args.has("--yes");

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pgLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function confirm(question: string) {
  if (assumeYes) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}

/** Calls the route in dry-run mode: proves the deploy + secret work, sends nothing. */
async function dryRun(runUrl: string, secret: string) {
  try {
    const res = await fetch(`${runUrl}?dry=1`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => null)) as
      | { counts?: { fanart?: { count?: number }; hbd?: { count?: number } }; reason?: string }
      | null;
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const f = data?.counts?.fanart?.count ?? "?";
    const h = data?.counts?.hbd?.count ?? "?";
    return { ok: true, detail: `pending now: fan art ${f} · HBD ${h} (${data?.reason ?? "would send"})` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const base = (process.env.CRON_API_BASE?.trim() || process.env.LIVE_AGENT_API_BASE?.trim() || "").replace(/\/+$/, "");
  const secret = process.env.LIVE_AGENT_CRON_SECRET?.trim();

  if (!databaseUrl) fail("DATABASE_URL is not set in .env");
  if (!remove && !checkOnly) {
    if (!base) fail("CRON_API_BASE is not set in .env (e.g. https://admin.mildhoneycomb.com)");
    if (!/^https:\/\//i.test(base) || /localhost|127\.0\.0\.1/i.test(base)) {
      fail("CRON_API_BASE must be the public https admin URL, not localhost");
    }
    if (!secret) fail("LIVE_AGENT_CRON_SECRET is not set in .env");
  }
  const runUrl = `${base}${ROUTE}`;

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const current = await client
      .query(`select jobname, schedule, active from cron.job where jobname = $1`, [JOB_NAME])
      .catch(() => ({ rows: [] as { jobname: string; schedule: string; active: boolean }[] }));
    console.log(
      current.rows.length
        ? `now: ${JOB_NAME} @ ${current.rows[0].schedule} (active=${current.rows[0].active})`
        : `now: no "${JOB_NAME}" job`
    );

    if (checkOnly) {
      // Read-only, but a broken setup must say FAIL (exit 1), not PASS.
      const problems: string[] = [];
      const job = current.rows[0];
      if (!job) problems.push(`no "${JOB_NAME}" job scheduled`);
      else {
        if (!job.active) problems.push("job is not active");
        if (job.schedule !== SCHEDULE) problems.push(`schedule is ${job.schedule}, expected ${SCHEDULE}`);
      }
      if (base && secret) {
        const test = await dryRun(runUrl, secret);
        console.log(`route ${ROUTE}: ${test.ok ? "OK" : "not reachable"} — ${test.detail}`);
        if (!test.ok) problems.push(`route ${ROUTE} not ready (${test.detail})`);
      } else {
        problems.push("CRON_API_BASE or LIVE_AGENT_CRON_SECRET not set — cannot test the route");
      }
      if (problems.length) fail(`${problems.join(" · ")} (check only, nothing changed)`);
      console.log("PASS (check only, nothing changed) — note: the dry run does not post to Discord");
      return;
    }

    if (remove) {
      if (!current.rows.length) {
        console.log("PASS (nothing to remove)");
        return;
      }
      if (!(await confirm(`Remove cron job "${JOB_NAME}"?`))) fail("cancelled");
      await client.query(`select cron.unschedule($1)`, [JOB_NAME]);
      console.log(`PASS removed "${JOB_NAME}"`);
      return;
    }

    // Before writing: the route must already be deployed and accept the secret.
    const test = await dryRun(runUrl, secret!);
    if (!test.ok) fail(`route ${ROUTE} is not ready (${test.detail}) — deploy first, then run again`);
    console.log(`route ${ROUTE}: OK — ${test.detail}`);

    const others = await client.query(`select count(*)::int as n from cron.job where jobname like 'pending-digest%' and jobname <> $1`, [JOB_NAME]);
    if ((others.rows[0]?.n ?? 0) > 0) fail("found other jobs named pending-digest* — check cron.job by hand first");

    if (!(await confirm(`Schedule "${JOB_NAME}" @ ${SCHEDULE} UTC (09:00 / 21:00 Bangkok)?`))) fail("cancelled");

    await client.query(`
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule(${pgLiteral(JOB_NAME)});
exception when others then
  null;
end $$;

select cron.schedule(
  ${pgLiteral(JOB_NAME)},
  ${pgLiteral(SCHEDULE)},
  $cron$
  select net.http_post(
    url := ${pgLiteral(runUrl)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', ${pgLiteral(`Bearer ${secret}`)}
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $cron$
);
`);

    const after = await client.query(`select jobname, schedule, active from cron.job where jobname = $1`, [JOB_NAME]);
    const row = after.rows[0];
    if (!row || row.schedule !== SCHEDULE || !row.active) fail("job not found or inactive after scheduling");
    console.log(`PASS scheduled: ${row.jobname} @ ${row.schedule} UTC (active=${row.active}) → ${runUrl}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
