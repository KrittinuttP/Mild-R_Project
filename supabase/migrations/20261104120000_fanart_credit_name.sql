-- 2026-11-04 · Fan art credit = a name + an optional @X / link (credit_name),
-- and one contact channel for the team: X, Discord or Facebook (profile link).
-- Rows sent before this keep credit_name = null; the app reads them the old way
-- (see creditOfRow in src/lib/fanart-upload.ts). Safe to run again.

begin;

alter table mild_r.fanart_submissions
  add column if not exists credit_name text;

-- Replace the contact_channel check, whatever name it was created with.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'mild_r'
      and rel.relname = 'fanart_submissions'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%contact_channel%'
  loop
    execute format('alter table mild_r.fanart_submissions drop constraint %I', c.conname);
  end loop;
end $$;

alter table mild_r.fanart_submissions
  add constraint fanart_submissions_contact_channel_check
  check (contact_channel in ('x', 'discord', 'facebook'));

drop view if exists public.mild_r_fanart_submissions;
create view public.mild_r_fanart_submissions
with (security_invoker = true)
as
select
  id,
  display_name,
  contact_channel,
  contact_handle,
  art_path,
  art_url,
  avatar_path,
  avatar_url,
  status,
  created_at,
  approved_at,
  reviewed_at,
  original_path,
  original_bytes,
  original_type,
  width,
  height,
  batch_id,
  consent_at,
  consent_version,
  credit_type,
  credit_value,
  thumb_path,
  thumb_url,
  contact_discord,
  credit_name
from mild_r.fanart_submissions;

grant all on public.mild_r_fanart_submissions to service_role;

commit;

notify pgrst, 'reload schema';
