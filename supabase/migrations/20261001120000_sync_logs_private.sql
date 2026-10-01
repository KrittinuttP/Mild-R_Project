-- Sync logs are internal (Live Ops): read only via service_role on the server.
drop policy if exists "Public read mild_r sync_logs" on mild_r.sync_logs;

revoke select on mild_r.sync_logs from anon, authenticated;
revoke select on public.mild_r_sync_logs from anon, authenticated;

grant all on mild_r.sync_logs to service_role;
grant all on public.mild_r_sync_logs to service_role;

notify pgrst, 'reload schema';
