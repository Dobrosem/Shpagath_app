-- Song editing, cover metadata, backup checks and safe song deletion.
--
-- Supabase Storage setup:
-- 1. Create a public bucket named "song-covers" in the Supabase dashboard.
-- 2. The policies below allow authenticated admin/member/manager users to
--    read, upload, replace and delete objects in that bucket.

alter table public.songs
  add column if not exists cover_image_url text,
  add column if not exists cover_status text not null default 'draft',
  add column if not exists cover_notes text;

alter table public.songs
  alter column cover_status set default 'draft';

update public.songs
set cover_status = 'draft'
where cover_status is null;

alter table public.songs
  alter column cover_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'songs_cover_status_check'
      and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_cover_status_check
      check (cover_status in ('draft', 'review', 'approved', 'outdated', 'archived'));
  end if;
end $$;

alter table public.material_backups
  add column if not exists usb_copy_confirmed boolean not null default false,
  add column if not exists last_checked_at timestamptz;

alter table public.setlist_items
  drop constraint if exists setlist_items_song_id_fkey;

alter table public.setlist_items
  add constraint setlist_items_song_id_fkey
  foreign key (song_id) references public.songs(id) on delete cascade;

drop policy if exists songs_manager_write on public.songs;
create policy songs_manager_write on public.songs
for all to authenticated
using (public.current_role() = 'manager')
with check (public.current_role() = 'manager');

drop policy if exists materials_manager_write on public.song_materials;
create policy materials_manager_write on public.song_materials
for all to authenticated
using (public.current_role() = 'manager')
with check (public.current_role() = 'manager');

drop policy if exists material_backups_manager_write on public.material_backups;
create policy material_backups_manager_write on public.material_backups
for all to authenticated
using (public.current_role() = 'manager')
with check (public.current_role() = 'manager');

drop policy if exists song_covers_authenticated_read on storage.objects;
create policy song_covers_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'song-covers');

drop policy if exists song_covers_internal_insert on storage.objects;
create policy song_covers_internal_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'song-covers'
  and public.current_role() in ('admin', 'member', 'manager')
);

drop policy if exists song_covers_internal_update on storage.objects;
create policy song_covers_internal_update on storage.objects
for update to authenticated
using (
  bucket_id = 'song-covers'
  and public.current_role() in ('admin', 'member', 'manager')
)
with check (
  bucket_id = 'song-covers'
  and public.current_role() in ('admin', 'member', 'manager')
);

drop policy if exists song_covers_internal_delete on storage.objects;
create policy song_covers_internal_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'song-covers'
  and public.current_role() in ('admin', 'member', 'manager')
);
