-- Replace plates + highlights with operations briefing (doc §8)
insert into mild_r.cafe_section_visibility (section_key, visible, label)
values ('operations', true, 'Operations Briefing')
on conflict (section_key) do nothing;

delete from mild_r.cafe_section_visibility
where section_key in ('plates', 'highlights');

notify pgrst, 'reload schema';
