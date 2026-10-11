-- Lucky-wheel entries shared by every draw campaign
-- (cafe evidence hunt, HBD card upload, ...). One row = one right to be drawn.
-- Contact details are private: service role only, same as hbd_submissions.

create table if not exists mild_r.lucky_draw_entries (
  id uuid primary key default gen_random_uuid(),
  campaign text not null,
  contact_name text not null,
  contact_channel text not null
    check (contact_channel in ('x', 'discord')),
  -- Stored without a leading @ or spaces.
  contact_handle text not null,
  -- HBD: id of the hbd_submissions row that earned this entry.
  source_ref text,
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'entered'
    check (status in ('entered', 'void', 'won')),
  prize_label text,
  drawn_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- One account can enter each campaign once.
create unique index if not exists lucky_draw_entries_one_per_contact
  on mild_r.lucky_draw_entries (campaign, contact_channel, lower(contact_handle));

create index if not exists lucky_draw_entries_campaign_idx
  on mild_r.lucky_draw_entries (campaign, status, created_at);

-- No anon policy: only the service role (site API) reads or writes.
alter table mild_r.lucky_draw_entries enable row level security;

grant usage on schema mild_r to service_role;
revoke all on mild_r.lucky_draw_entries from anon, authenticated;
grant all on mild_r.lucky_draw_entries to service_role;

drop view if exists public.mild_r_lucky_draw_entries;
create or replace view public.mild_r_lucky_draw_entries
with (security_invoker = true)
as
select
  id,
  campaign,
  contact_name,
  contact_channel,
  contact_handle,
  source_ref,
  meta,
  status,
  prize_label,
  drawn_at,
  created_at
from mild_r.lucky_draw_entries;

revoke all on public.mild_r_lucky_draw_entries from anon, authenticated;
grant all on public.mild_r_lucky_draw_entries to service_role;

notify pgrst, 'reload schema';
