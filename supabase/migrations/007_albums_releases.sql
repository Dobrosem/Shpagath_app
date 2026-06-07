-- Albums and releases for grouping songs and sharing release artwork.
--
-- Create a Supabase Storage bucket named "album-covers" manually.
-- It may remain private: the application displays authenticated artwork
-- through short-lived signed URLs.

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'album'
    check (type in ('album', 'ep', 'single', 'live', 'demo', 'compilation')),
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'review', 'approved', 'released', 'archived')),
  release_date date,
  cover_image_url text,
  cover_status text not null default 'draft'
    check (cover_status in ('draft', 'review', 'approved', 'outdated', 'archived')),
  cover_notes text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.songs
  add column if not exists album_id uuid references public.albums(id) on delete set null,
  add column if not exists track_number integer check (track_number is null or track_number > 0);

create index if not exists albums_type_idx on public.albums(type);
create index if not exists albums_status_idx on public.albums(status);
create index if not exists songs_album_id_idx on public.songs(album_id);
create index if not exists songs_track_number_idx on public.songs(track_number);

drop trigger if exists set_albums_updated_at on public.albums;
create trigger set_albums_updated_at
before update on public.albums
for each row execute function public.set_updated_at();

alter table public.albums enable row level security;

drop policy if exists albums_read on public.albums;
create policy albums_read on public.albums
for select to authenticated using (true);

drop policy if exists albums_insert on public.albums;
create policy albums_insert on public.albums
for insert to authenticated
with check (public.current_role() in ('admin', 'member'));

drop policy if exists albums_update on public.albums;
create policy albums_update on public.albums
for update to authenticated
using (public.current_role() in ('admin', 'member', 'manager'))
with check (public.current_role() in ('admin', 'member', 'manager'));

drop policy if exists albums_delete on public.albums;
create policy albums_delete on public.albums
for delete to authenticated
using (public.current_role() = 'admin');

drop policy if exists album_covers_authenticated_read on storage.objects;
create policy album_covers_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'album-covers');

drop policy if exists album_covers_authenticated_insert on storage.objects;
create policy album_covers_authenticated_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'album-covers');

drop policy if exists album_covers_authenticated_update on storage.objects;
create policy album_covers_authenticated_update on storage.objects
for update to authenticated
using (bucket_id = 'album-covers')
with check (bucket_id = 'album-covers');

drop policy if exists album_covers_authenticated_delete on storage.objects;
create policy album_covers_authenticated_delete on storage.objects
for delete to authenticated
using (bucket_id = 'album-covers');
