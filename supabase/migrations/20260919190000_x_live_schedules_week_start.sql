-- Add schedule_week_start: Sunday of the week this poster belongs to.
-- Rule: Bangkok post date; if Saturday → +1 day; then start-of-week Sunday.

alter table mild_r.x_live_schedules
  add column if not exists schedule_week_start date;

update mild_r.x_live_schedules x
set schedule_week_start = sub.week_start
from (
  select
    tweet_id,
    (
      case
        when extract(dow from (posted_at at time zone 'Asia/Bangkok')::date) = 6
          then ((posted_at at time zone 'Asia/Bangkok')::date + 1)
        else (posted_at at time zone 'Asia/Bangkok')::date
      end
      - extract(
          dow from (
            case
              when extract(dow from (posted_at at time zone 'Asia/Bangkok')::date) = 6
                then ((posted_at at time zone 'Asia/Bangkok')::date + 1)
              else (posted_at at time zone 'Asia/Bangkok')::date
            end
          )
        )::int
    )::date as week_start
  from mild_r.x_live_schedules
  where posted_at is not null
) sub
where x.tweet_id = sub.tweet_id;

create index if not exists x_live_schedules_week_start_idx
  on mild_r.x_live_schedules (schedule_week_start desc nulls last);

drop view if exists public.mild_r_x_live_schedules;
create view public.mild_r_x_live_schedules
with (security_invoker = true)
as
select
  id,
  tweet_id,
  image_url,
  image_source_url,
  posted_at,
  schedule_week_start,
  added_at,
  agent_processed_at,
  status,
  parsed_json,
  error_message,
  created_at,
  updated_at
from mild_r.x_live_schedules;

grant select on public.mild_r_x_live_schedules to anon, authenticated;
grant all on public.mild_r_x_live_schedules to service_role;

notify pgrst, 'reload schema';
