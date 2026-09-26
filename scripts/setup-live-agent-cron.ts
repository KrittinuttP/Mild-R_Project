/**
 * Schedule Live Schedule Agent cron (Tue/Fri/Sun 00:15 Asia/Bangkok)
 * — 15 minutes after x-feed-sync incremental — plus a retry job every
 * 30 minutes that picks up failed posters whose next_retry_at has passed.
 *
 *   npx tsx --env-file=.env.local scripts/setup-live-agent-cron.ts
 *
 * Requires a public site URL (not localhost):
 *   LIVE_AGENT_API_BASE or NEXT_PUBLIC_SITE_URL
 *
 * Auth: LIVE_AGENT_CRON_SECRET (preferred) or SUPABASE_SERVICE_ROLE_KEY
 */
import pg from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const siteUrl = (
    process.env.LIVE_AGENT_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  const secret =
    process.env.LIVE_AGENT_CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!databaseUrl || !siteUrl || !secret) {
    console.error(
      "Missing DATABASE_URL, LIVE_AGENT_API_BASE/NEXT_PUBLIC_SITE_URL, or cron secret"
    );
    process.exit(1);
  }

  if (/localhost|127\.0\.0\.1/i.test(siteUrl)) {
    console.error(
      "Refusing to schedule cron against localhost. Set LIVE_AGENT_API_BASE to the public production URL."
    );
    process.exit(1);
  }

  const runUrl = `${siteUrl}/api/live/agent/run`;
  const authHeader = `Bearer ${secret}`;

  // pg_cron uses UTC. 00:15 Asia/Bangkok = 17:15 UTC previous weekday.
  // Tue/Fri/Sun 00:15 BKK → Mon/Thu/Sat 17:15 UTC (dow 1,4,6).
  const sql = `
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-live-schedule-agent');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('run-live-schedule-agent-retry');
exception when others then
  null;
end $$;

select cron.schedule(
  'run-live-schedule-agent',
  '15 17 * * 1,4,6',
  ${httpPostSql(runUrl, authHeader, '{"limit":1}')}
);

select cron.schedule(
  'run-live-schedule-agent-retry',
  '5,35 * * * *',
  ${httpPostSql(runUrl, authHeader, '{"limit":1,"quietWhenIdle":true}')}
);
`;

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    const jobs = await client.query(
      `select jobid, jobname, schedule, active from cron.job where jobname like 'run-live-schedule-agent%' order by jobname`
    );
    console.log("OK scheduled:");
    for (const row of jobs.rows) {
      console.log(`- ${row.jobname} @ ${row.schedule} (active=${row.active})`);
    }
    console.log("target:", runUrl);
    console.log(
      "note: 15 17 * * 1,4,6 UTC = 00:15 BKK Tue / Fri / Sun (after x-feed 00:00)"
    );
    console.log("note: retry job every 30 min (:05 / :35), silent when idle");
  } finally {
    await client.end();
  }
}

// pg_net defaults to a short timeout; the agent (Gemini + manual API) takes longer
function httpPostSql(url: string, authHeader: string, bodyJson: string) {
  return `$cron$
  select net.http_post(
    url := ${pgClientLiteral(url)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', ${pgClientLiteral(authHeader)}
    ),
    body := ${pgClientLiteral(bodyJson)}::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $cron$`;
}

function pgClientLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
