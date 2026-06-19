-- Production access hardening proposal.
--
-- Apply manually after confirming the band member workflow:
-- - new Auth users become guest until an admin promotes them;
-- - destructive deletes are restricted to admin, with manager retained only for
--   operational file/task cleanup where noted;
-- - regular members keep day-to-day create/update access.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Участник'),
    'guest',
    case when new.raw_user_meta_data->>'locale' = 'en' then 'en' else 'ru' end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  result public.profiles;
  auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email into auth_email from auth.users where id = auth.uid();
  insert into public.profiles (id, email, full_name, role, locale)
  values (
    auth.uid(),
    coalesce(auth_email, ''),
    coalesce(nullif(auth.jwt()->'user_metadata'->>'full_name', ''), split_part(coalesce(auth_email, ''), '@', 1), 'Участник'),
    'guest',
    case when auth.jwt()->'user_metadata'->>'locale' = 'en' then 'en' else 'ru' end
  )
  on conflict (id) do nothing;

  select * into result from public.profiles where id = auth.uid();
  return result;
end; $$;

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert to authenticated
with check (id = auth.uid() and role = 'guest');

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = public.current_role());

-- Finance: only admins may read or mutate.
drop policy if exists finance_access on public.finance_records;
drop policy if exists finance_read on public.finance_records;
drop policy if exists finance_insert on public.finance_records;
drop policy if exists finance_update on public.finance_records;
drop policy if exists finance_delete on public.finance_records;
create policy finance_read on public.finance_records
for select to authenticated
using (public.current_role() = 'admin');
create policy finance_insert on public.finance_records
for insert to authenticated
with check (public.current_role() = 'admin');
create policy finance_update on public.finance_records
for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
create policy finance_delete on public.finance_records
for delete to authenticated
using (public.current_role() = 'admin');

-- Tasks: members can work tasks, but hard delete is manager/admin only.
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
for delete to authenticated
using (public.current_role() in ('admin', 'manager'));

-- Songs and song materials: split write policies so hard delete is admin-only.
drop policy if exists songs_write on public.songs;
drop policy if exists songs_insert on public.songs;
drop policy if exists songs_update on public.songs;
drop policy if exists songs_delete on public.songs;
create policy songs_insert on public.songs
for insert to authenticated
with check (public.current_role() in ('admin', 'member'));
create policy songs_update on public.songs
for update to authenticated
using (public.current_role() in ('admin', 'member') or public.has_entity_access('song', id, 'write'))
with check (public.current_role() in ('admin', 'member') or public.has_entity_access('song', id, 'write'));
create policy songs_delete on public.songs
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists materials_write on public.song_materials;
drop policy if exists materials_insert on public.song_materials;
drop policy if exists materials_update on public.song_materials;
drop policy if exists materials_delete on public.song_materials;
create policy materials_insert on public.song_materials
for insert to authenticated
with check (public.current_role() in ('admin', 'member') or public.has_entity_access('song', song_id, 'write'));
create policy materials_update on public.song_materials
for update to authenticated
using (public.current_role() in ('admin', 'member') or public.has_entity_access('song', song_id, 'write'))
with check (public.current_role() in ('admin', 'member') or public.has_entity_access('song', song_id, 'write'));
create policy materials_delete on public.song_materials
for delete to authenticated
using (public.current_role() = 'admin');

-- Events and setlists: members/managers can operate, admin owns hard delete.
drop policy if exists events_write on public.events;
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;
create policy events_insert on public.events
for insert to authenticated
with check (public.current_role() in ('admin', 'member', 'manager'));
create policy events_update on public.events
for update to authenticated
using (public.current_role() in ('admin', 'member', 'manager') or public.has_entity_access('event', id, 'write'))
with check (public.current_role() in ('admin', 'member', 'manager') or public.has_entity_access('event', id, 'write'));
create policy events_delete on public.events
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists setlists_write on public.setlists;
drop policy if exists setlists_insert on public.setlists;
drop policy if exists setlists_update on public.setlists;
drop policy if exists setlists_delete on public.setlists;
create policy setlists_insert on public.setlists
for insert to authenticated
with check (public.current_role() in ('admin', 'member', 'manager') or public.has_entity_access('event', event_id, 'write'));
create policy setlists_update on public.setlists
for update to authenticated
using (public.current_role() in ('admin', 'member', 'manager') or public.has_entity_access('event', event_id, 'write'))
with check (public.current_role() in ('admin', 'member', 'manager') or public.has_entity_access('event', event_id, 'write'));
create policy setlists_delete on public.setlists
for delete to authenticated
using (public.current_role() in ('admin', 'manager'));

drop policy if exists setlist_items_write on public.setlist_items;
drop policy if exists setlist_items_insert on public.setlist_items;
drop policy if exists setlist_items_update on public.setlist_items;
drop policy if exists setlist_items_delete on public.setlist_items;
create policy setlist_items_insert on public.setlist_items
for insert to authenticated
with check (public.current_role() in ('admin', 'member', 'manager'));
create policy setlist_items_update on public.setlist_items
for update to authenticated
using (public.current_role() in ('admin', 'member', 'manager'))
with check (public.current_role() in ('admin', 'member', 'manager'));
create policy setlist_items_delete on public.setlist_items
for delete to authenticated
using (public.current_role() in ('admin', 'manager'));

-- Hidden file attachment library: only admin can hard-delete records.
drop policy if exists files_workspace_delete on public.files;
create policy files_workspace_delete on public.files
for delete to authenticated
using (public.current_role() = 'admin');

-- Copy/calendar records are operational content, but hard delete stays admin-only.
drop policy if exists copy_items_workspace_delete on public.copy_items;
create policy copy_items_workspace_delete on public.copy_items
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists content_calendar_items_workspace_delete on public.content_calendar_items;
create policy content_calendar_items_workspace_delete on public.content_calendar_items
for delete to authenticated
using (public.current_role() = 'admin');

-- Storage deletes follow the same hard-delete rule. Read/write policies remain
-- unchanged so regular members can still use normal workspace upload flows.
drop policy if exists song_covers_internal_delete on storage.objects;
create policy song_covers_internal_delete on storage.objects
for delete to authenticated
using (bucket_id = 'song-covers' and public.current_role() = 'admin');

drop policy if exists event_posters_internal_delete on storage.objects;
create policy event_posters_internal_delete on storage.objects
for delete to authenticated
using (bucket_id = 'event-posters' and public.current_role() = 'admin');

drop policy if exists album_covers_authenticated_delete on storage.objects;
create policy album_covers_authenticated_delete on storage.objects
for delete to authenticated
using (bucket_id = 'album-covers' and public.current_role() = 'admin');

drop policy if exists file_library_authenticated_delete on storage.objects;
create policy file_library_authenticated_delete on storage.objects
for delete to authenticated
using (bucket_id = 'file-library' and public.current_role() = 'admin');
