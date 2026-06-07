-- Extend event logistics while preserving timing values from the initial schema.

alter table public.events
  add column if not exists arrival_time text,
  add column if not exists load_in_time text,
  add column if not exists soundcheck_time text,
  add column if not exists doors_time text,
  add column if not exists show_start_time text,
  add column if not exists show_end_time text,
  add column if not exists curfew_time text,
  add column if not exists backstage_info text,
  add column if not exists venue_address text,
  add column if not exists organizer_contact text,
  add column if not exists sound_engineer_contact text,
  add column if not exists light_engineer_contact text,
  add column if not exists emergency_notes text;

update public.events
set arrival_time = to_char(call_time, 'HH24:MI')
where arrival_time is null and call_time is not null;

update public.events
set show_start_time = to_char(performance_time, 'HH24:MI')
where show_start_time is null and performance_time is not null;

alter table public.events
  alter column soundcheck_time type text using soundcheck_time::text;

update public.events
set soundcheck_time = substring(soundcheck_time from 1 for 5)
where soundcheck_time ~ '^[0-9]{2}:[0-9]{2}:00(\.[0-9]+)?$';
