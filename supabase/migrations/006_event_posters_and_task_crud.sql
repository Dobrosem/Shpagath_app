-- Event posters and consistent task CRUD for internal workspace roles.
--
-- Create a public Supabase Storage bucket named "event-posters" manually.
-- The policies below allow authenticated admin/member/manager users to manage
-- objects in that bucket.

alter table public.events
  add column if not exists poster_image_url text,
  add column if not exists poster_status text not null default 'draft',
  add column if not exists poster_notes text;

alter table public.events
  alter column poster_status set default 'draft';

update public.events
set poster_status = 'draft'
where poster_status is null;

alter table public.events
  alter column poster_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_poster_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_poster_status_check
      check (poster_status in ('draft', 'review', 'approved', 'outdated', 'archived'));
  end if;
end $$;

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
for update to authenticated
using (
  public.current_role() in ('admin', 'member', 'manager')
  or assignee_id = auth.uid()
  or public.has_entity_access('task', id, 'write')
)
with check (
  public.current_role() in ('admin', 'member', 'manager')
  or assignee_id = auth.uid()
  or public.has_entity_access('task', id, 'write')
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
for delete to authenticated
using (public.current_role() in ('admin', 'member', 'manager'));

drop policy if exists event_posters_authenticated_read on storage.objects;
create policy event_posters_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'event-posters');

drop policy if exists event_posters_internal_insert on storage.objects;
create policy event_posters_internal_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'event-posters'
  and public.current_role() in ('admin', 'member', 'manager')
);

drop policy if exists event_posters_internal_update on storage.objects;
create policy event_posters_internal_update on storage.objects
for update to authenticated
using (
  bucket_id = 'event-posters'
  and public.current_role() in ('admin', 'member', 'manager')
)
with check (
  bucket_id = 'event-posters'
  and public.current_role() in ('admin', 'member', 'manager')
);

drop policy if exists event_posters_internal_delete on storage.objects;
create policy event_posters_internal_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'event-posters'
  and public.current_role() in ('admin', 'member', 'manager')
);
