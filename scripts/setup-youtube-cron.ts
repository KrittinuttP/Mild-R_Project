/**
 * Schedule YouTube tracker cron jobs using env from .env.local
 *   npx tsx --env-file=.env.local scripts/setup-youtube-cron.ts
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

  const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/youtube-tracker`;
  const authHeader = `Bearer ${serviceRole}`;

  const sql = `
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-youtube-step1-main');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('run-youtube-step2-search');
exception when others then
  null;
end $$;

select cron.schedule(
  'run-youtube-step1-main',
  '*/30 * * * *',
  $cron$
  select net.http_post(
    url := ${pgClientLiteral(fnUrl)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', ${pgClientLiteral(authHeader)}
    ),
    body := '{"action":"main"}'::jsonb
  ) as request_id;
  $cron$
);

select cron.schedule(
  'run-youtube-step2-search',
  '0 */6 * * *',
  $cron$
  select net.http_post(
    url := ${pgClientLiteral(fnUrl)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', ${pgClientLiteral(authHeader)}
    ),
    body := '{"action":"search"}'::jsonb
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
      `select jobid, jobname, schedule, active from cron.job where jobname like 'run-youtube-%' order by jobname`
    );
    console.log("OK scheduled:");
    for (const row of jobs.rows) {
      console.log(`- ${row.jobname} @ ${row.schedule} (active=${row.active})`);
    }
    console.log("target:", fnUrl);
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
