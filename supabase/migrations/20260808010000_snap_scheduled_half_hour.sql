-- One-shot: snap scheduled times to nearest :00 / :30 if within ±5 minutes.
-- Does not touch actual_start / actual_end.

begin;

with snapped as (
  select
    video_id,
    scheduled_start,
    scheduled_start_first,
    case
      when scheduled_start is null then null
      when abs(
        extract(epoch from scheduled_start)
        - round(extract(epoch from scheduled_start) / 1800.0) * 1800
      ) <= 300
      then to_timestamp(
        round(extract(epoch from scheduled_start) / 1800.0) * 1800
      )
      else scheduled_start
    end as scheduled_start_new,
    case
      when scheduled_start_first is null then null
      when abs(
        extract(epoch from scheduled_start_first)
        - round(extract(epoch from scheduled_start_first) / 1800.0) * 1800
      ) <= 300
      then to_timestamp(
        round(extract(epoch from scheduled_start_first) / 1800.0) * 1800
      )
      else scheduled_start_first
    end as scheduled_start_first_new
  from mild_r.live_streams
)
update mild_r.live_streams ls
set
  scheduled_start = s.scheduled_start_new,
  scheduled_start_first = s.scheduled_start_first_new
from snapped s
where ls.video_id = s.video_id
  and (
    ls.scheduled_start is distinct from s.scheduled_start_new
    or ls.scheduled_start_first is distinct from s.scheduled_start_first_new
  );

commit;
