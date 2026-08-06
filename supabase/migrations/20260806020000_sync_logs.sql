-- Sync run logs for YouTube tracker / backfill
create table if not exists mild_r.sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  message text,
  saved_count integer not null default 0,
  meta jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists sync_logs_created_at_idx
  on mild_r.sync_logs (created_at desc);

alter table mild_r.sync_logs enable row level security;

drop policy if exists "Public read mild_r sync_logs" on mild_r.sync_logs;
create policy "Public read mild_r sync_logs"
  on mild_r.sync_logs
  for select
  to anon, authenticated
  using (true);

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.sync_logs to anon, authenticated;
grant all on mild_r.sync_logs to service_role;

drop view if exists public.mild_r_sync_logs;
create view public.mild_r_sync_logs
with (security_invoker = true)
as
select
  id,
  source,
  status,
  message,
  saved_count,
  meta,
  created_at
from mild_r.sync_logs;

grant select on public.mild_r_sync_logs to anon, authenticated;
grant all on public.mild_r_sync_logs to service_role;

notify pgrst, 'reload schema';
