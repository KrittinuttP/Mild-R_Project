/**
 * Schedule X feed incremental cron (every 3 days at 00:00 Asia/Bangkok).
 *   npx tsx --env-file=.env scripts/setup-x-feed-cron.ts
 */
import pg from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!databaseUrl || !supabaseUrl || !serviceRole) {
    console.error(
      "Missing DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/x-feed-sync`;
  const authHeader = `Bearer ${serviceRole}`;

  // pg_cron uses UTC. 00:00 Asia/Bangkok = 17:00 UTC.
  const sql = `
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-x-feed-incremental');
exception when others then
  null;
end $$;

select cron.schedule(
  'run-x-feed-incremental',
  '0 17 */3 * *',
  $cron$
  select net.http_post(
    url := ${pgClientLiteral(fnUrl)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', ${pgClientLiteral(authHeader)}
    ),
    body := '{"action":"incremental"}'::jsonb
  ) as request_id;
  $cron$
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
      `select jobid, jobname, schedule, active from cron.job where jobname = 'run-x-feed-incremental'`
    );
    console.log("OK scheduled:");
    for (const row of jobs.rows) {
      console.log(`- ${row.jobname} @ ${row.schedule} (active=${row.active})`);
    }
    console.log("target:", fnUrl);
    console.log("note: 0 17 */3 * * UTC = 00:00 BKK every 3 calendar days");
  } finally {
    await client.end();
  }
}

function pgClientLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
