-- Agency / project affiliation for live streams: Pixela | Lumina
-- Existing rows → Lumina; Pixela one-shot backfill sets Pixela.

drop view if exists public.mild_r_live_streams;

alter table mild_r.live_streams
  add column if not exists project text;

update mild_r.live_streams
set project = 'Lumina'
where project is null;

alter table mild_r.live_streams
  alter column project set default 'Lumina',
  alter column project set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_streams_project_check'
  ) then
    alter table mild_r.live_streams
      add constraint live_streams_project_check
      check (project in ('Pixela', 'Lumina'));
  end if;
end $$;

create index if not exists live_streams_project_idx
  on mild_r.live_streams (project);

create or replace view public.mild_r_live_streams
with (security_invoker = true)
as
select
  video_id,
  channel_id,
  channel_name,
  source_title,
  title,
  url,
  scheduled_start,
  scheduled_start_first,
  actual_start,
  actual_end,
  thumbnail_url,
  thumbnail_cached_url,
  views_on_end,
  latest_views,
  is_own_channel,
  is_collab,
  project,
  metadata,
  created_at
from mild_r.live_streams;

grant select on public.mild_r_live_streams to anon, authenticated;
grant all on public.mild_r_live_streams to service_role;

notify pgrst, 'reload schema';
