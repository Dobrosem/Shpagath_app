-- File Library for internal workspace documents, media and linked assets.
--
-- Create a Supabase Storage bucket named "file-library" manually.
-- The bucket may remain private: workspace pages display files through
-- short-lived signed URLs. External URLs remain supported as a fallback.

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_type text not null default 'other'
    check (file_type in (
      'tech_rider',
      'stage_plot',
      'light_timing',
      'video_timing',
      'press_photo',
      'logo',
      'artwork',
      'lyrics',
      'guitar_tab',
      'bass_tab',
      'orchestral_score',
      'orchestral_parts',
      'backing_track',
      'click_track',
      'stems',
      'reaper_project',
      'contract',
      'invoice',
      'document',
      'image',
      'audio',
      'video',
      'other'
    )),
  bucket text not null default 'file-library',
  storage_path text,
  public_url text,
  external_url text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'active'
    check (status in ('active', 'draft', 'review', 'approved', 'archived')),
  is_public boolean not null default false,
  event_id uuid references public.events(id) on delete set null,
  album_id uuid references public.albums(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  epk_id uuid references public.epk_profiles(id) on delete set null,
  copy_item_id uuid references public.copy_items(id) on delete set null,
  content_calendar_item_id uuid references public.content_calendar_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or public_url is not null or external_url is not null)
);

create index if not exists files_file_type_idx on public.files(file_type);
create index if not exists files_status_idx on public.files(status);
create index if not exists files_is_public_idx on public.files(is_public);
create index if not exists files_event_id_idx on public.files(event_id);
create index if not exists files_album_id_idx on public.files(album_id);
create index if not exists files_song_id_idx on public.files(song_id);
create index if not exists files_epk_id_idx on public.files(epk_id);
create index if not exists files_copy_item_id_idx on public.files(copy_item_id);
create index if not exists files_content_calendar_item_id_idx on public.files(content_calendar_item_id);

drop trigger if exists set_files_updated_at on public.files;
create trigger set_files_updated_at
before update on public.files
for each row execute function public.set_updated_at();

alter table public.files enable row level security;

drop policy if exists files_admin_all on public.files;
create policy files_admin_all on public.files
for all to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists files_workspace_read on public.files;
create policy files_workspace_read on public.files
for select to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists files_workspace_insert on public.files;
create policy files_workspace_insert on public.files
for insert to authenticated
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists files_workspace_update on public.files;
create policy files_workspace_update on public.files
for update to authenticated
using (public.current_role() in ('admin', 'manager', 'member'))
with check (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists files_workspace_delete on public.files;
create policy files_workspace_delete on public.files
for delete to authenticated
using (public.current_role() in ('admin', 'manager', 'member'));

drop policy if exists file_library_authenticated_read on storage.objects;
create policy file_library_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'file-library');

drop policy if exists file_library_authenticated_insert on storage.objects;
create policy file_library_authenticated_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'file-library'
  and public.current_role() in ('admin', 'manager', 'member')
);

drop policy if exists file_library_authenticated_update on storage.objects;
create policy file_library_authenticated_update on storage.objects
for update to authenticated
using (
  bucket_id = 'file-library'
  and public.current_role() in ('admin', 'manager', 'member')
)
with check (
  bucket_id = 'file-library'
  and public.current_role() in ('admin', 'manager', 'member')
);

drop policy if exists file_library_authenticated_delete on storage.objects;
create policy file_library_authenticated_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'file-library'
  and public.current_role() in ('admin', 'manager', 'member')
);
