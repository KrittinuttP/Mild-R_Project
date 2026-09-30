-- Allow admins to hide approved wishes (reversible) without rejecting them.
do $$
declare
  existing text;
begin
  select conname into existing
  from pg_constraint
  where conrelid = 'mild_r.hbd_submissions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if existing is not null then
    execute format('alter table mild_r.hbd_submissions drop constraint %I', existing);
  end if;
end $$;

alter table mild_r.hbd_submissions
  add constraint hbd_submissions_status_check
  check (status in ('pending', 'approved', 'rejected', 'hidden'));

notify pgrst, 'reload schema';
