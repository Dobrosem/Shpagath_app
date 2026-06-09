-- Link events to a reusable shared technical rider file.

alter table public.events
  add column if not exists tech_rider_file_id uuid references public.files(id) on delete set null;

create index if not exists events_tech_rider_file_id_idx on public.events(tech_rider_file_id);
