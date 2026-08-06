-- Add peak (max) views_on_end per bucket for month/year chart tooltips

drop function if exists public.mild_r_live_view_trends(text, boolean, timestamptz, timestamptz);

create function public.mild_r_live_view_trends(
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
  stream_count bigint,
  peak_views_on_end bigint
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
    count(*)::bigint as stream_count,
    coalesce(max(ls.views_on_end), 0)::bigint as peak_views_on_end
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
