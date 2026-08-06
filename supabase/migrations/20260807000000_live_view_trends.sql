-- Optimized trends aggregates for Mild-R live view stats (ops dashboard)

create index if not exists live_streams_ended_own_idx
  on mild_r.live_streams (is_own_channel, actual_end desc nulls last)
  where actual_end is not null;

create index if not exists live_streams_actual_end_idx
  on mild_r.live_streams (actual_end desc nulls last)
  where actual_end is not null;

/**
 * Aggregate view trends by day / month / year (Asia/Bangkok buckets).
 * p_grain: 'day' | 'month' | 'year'
 * p_own_only: true = Mild-R channel only
 */
create or replace function public.mild_r_live_view_trends(
  p_grain text,
  p_own_only boolean default true,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  bucket date,
  views_on_end bigint,
  latest_views bigint,
  views_diff bigint,
  stream_count bigint
)
language plpgsql
stable
security invoker
set search_path = public, mild_r
as $$
begin
  if p_grain not in ('day', 'month', 'year') then
    raise exception 'p_grain must be day, month, or year';
  end if;

  return query
  select
    (date_trunc(
      p_grain,
      (ls.actual_end at time zone 'Asia/Bangkok')
    ))::date as bucket,
    coalesce(sum(ls.views_on_end), 0)::bigint as views_on_end,
    coalesce(sum(ls.latest_views), 0)::bigint as latest_views,
    coalesce(
      sum(
        ls.latest_views - coalesce(ls.views_on_end, ls.latest_views)
      ),
      0
    )::bigint as views_diff,
    count(*)::bigint as stream_count
  from mild_r.live_streams ls
  where ls.actual_end is not null
    and (not p_own_only or ls.is_own_channel = true)
    and (p_from is null or ls.actual_end >= p_from)
    and (p_to is null or ls.actual_end < p_to)
  group by 1
  order by 1;
end;
$$;

grant execute on function public.mild_r_live_view_trends(text, boolean, timestamptz, timestamptz)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
