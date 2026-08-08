-- Store short master roster title (e.g. Xonebu) for which channel a live came from

drop view if exists public.mild_r_live_streams;

alter table mild_r.live_streams
  add column if not exists source_title text;

-- Backfill known Lumina channel IDs from master titles
update mild_r.live_streams set source_title = v.title
from (values
  ('UCknOyz3O0-G6w5SJNAgO7uQ', 'Mild-R'),
  ('UCGo7fnmWfGQewxZVDmC3iJQ', 'Xonebu'),
  ('UC3qnb4Sgo4QtiOi8iS7jOsQ', 'Tsururu'),
  ('UCZYTMrnVmu1iUVyGeqB6zJQ', 'Ashyra'),
  ('UCa8ILv94qHT6oar_jVzg9sQ', 'AMI'),
  ('UCot8DHNnZ2X0ARgaNYZopjw', 'Debirun'),
  ('UCiZyQDO7v9UY_-Q24VsSLlQ', 'Antolnette'),
  ('UC-KEm4E7Yp_t0Gzix4SwkwA', 'Dëa'),
  ('UC0sN779hXum_LluFaWfJjcw', 'Hinaree'),
  ('UCbypR_t0teWxIdrQ9i83XiQ', 'Florynne'),
  ('UCLNBff3KDEUxdfH_lkvyOKQ', 'Reirin'),
  ('UCuyrIzf_bCTnyJHktJVpe4g', 'Sireen'),
  ('UC2eai5waelgobAHgp20DEYg', 'Lilibelle'),
  ('UCgSsXxQ71nScJ-GIc90ZkYw', 'Mikael'),
  ('UCg53fzp6UNYvsyAg8UoNXCA', 'Kona'),
  ('UCIBdFlC2Fk3rID8CAETV35g', 'Kryspeia'),
  ('UCSoFIMz3y6jOVMg8nggpcMQ', 'Meiyin'),
  ('UCGtHn0fmqCAp_8AzV_PWd6A', 'Eveshaiah'),
  ('UCgMHb11ydIWSAgvzrxOPjRg', 'Arcanon'),
  ('UCSlT8Mc_dty5c_cFmi1zz4Q', 'Maneneko')
) as v(channel_id, title)
where mild_r.live_streams.channel_id = v.channel_id
  and (mild_r.live_streams.source_title is null
       or mild_r.live_streams.source_title is distinct from v.title);

create index if not exists live_streams_source_title_idx
  on mild_r.live_streams (source_title);

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
  views_on_end,
  latest_views,
  is_own_channel,
  is_collab,
  metadata,
  created_at
from mild_r.live_streams;

grant select on public.mild_r_live_streams to anon, authenticated;
grant all on public.mild_r_live_streams to service_role;

notify pgrst, 'reload schema';
